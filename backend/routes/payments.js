const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { updateTableStatus } = require('../utils/orderHelpers');

router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { order_id, amount, method, status = 'completed' } = req.body;

    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [
      order_id,
    ]);
    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [result] = await conn.query(
      'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
      [order_id, amount, method, status]
    );

    const [payments] = await conn.query(
      'SELECT * FROM payments WHERE order_id = ? AND status = ?',
      [order_id, 'completed']
    );
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const orderTotal = Number(orders[0].total);

    if (totalPaid >= orderTotal && status === 'completed') {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [
        'paid',
        order_id,
      ]);
      if (orders[0].table_id) {
        await updateTableStatus(conn, orders[0].table_id);
      }
    } else if (totalPaid > 0) {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [
        'awaiting_payment',
        order_id,
      ]);
      if (orders[0].table_id) {
        await updateTableStatus(conn, orders[0].table_id);
      }
    }

    await conn.commit();

    const [receipt] = await conn.query(
      `SELECT o.*, rt.table_number
       FROM orders o
       LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
       WHERE o.id = ?`,
      [order_id]
    );
    const [items] = await conn.query(
      `SELECT oi.*, mi.name AS item_name
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?`,
      [order_id]
    );
    const [allPayments] = await conn.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at',
      [order_id]
    );

    res.status(201).json({
      payment: { id: result.insertId, order_id, amount, method, status },
      receipt: {
        order: receipt[0],
        items,
        payments: allPayments,
        total_paid: totalPaid,
        balance_due: Math.max(0, orderTotal - totalPaid),
      },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/split', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { order_id, splits } = req.body;
    // splits: [{ amount, method }, ...]

    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [
      order_id,
    ]);
    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const results = [];
    for (const split of splits) {
      const [result] = await conn.query(
        'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
        [order_id, split.amount, split.method, split.status || 'completed']
      );
      results.push({ id: result.insertId, ...split });
    }

    const [payments] = await conn.query(
      'SELECT * FROM payments WHERE order_id = ? AND status = ?',
      [order_id, 'completed']
    );
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const orderTotal = Number(orders[0].total);

    if (totalPaid >= orderTotal) {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [
        'paid',
        order_id,
      ]);
      if (orders[0].table_id) {
        await updateTableStatus(conn, orders[0].table_id);
      }
    } else {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [
        'awaiting_payment',
        order_id,
      ]);
    }

    await conn.commit();
    res.status(201).json({ payments: results, total_paid: totalPaid });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.get('/receipt/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const [orders] = await pool.query(
      `SELECT o.*, rt.table_number
       FROM orders o
       LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
       WHERE o.id = ?`,
      [orderId]
    );
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });

    const [items] = await pool.query(
      `SELECT oi.*, mi.name AS item_name
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at',
      [orderId]
    );

    const totalPaid = payments
      .filter((p) => p.status === 'completed')
      .reduce((s, p) => s + Number(p.amount), 0);

    res.json({
      order: orders[0],
      items,
      payments,
      total_paid: totalPaid,
      balance_due: Math.max(0, Number(orders[0].total) - totalPaid),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
