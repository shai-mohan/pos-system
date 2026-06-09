const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  recalculateOrderTotals,
  updateTableStatus,
} = require('../utils/orderHelpers');
const { getRecommendations } = require('../data/recommendations');

async function getOrderWithItems(orderId) {
  const [orders] = await pool.query(
    `SELECT o.*, rt.table_number
     FROM orders o
     LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.id = ?`,
    [orderId]
  );
  if (!orders.length) return null;

  const [items] = await pool.query(
    `SELECT oi.*, mi.name AS item_name, mi.available AS item_available
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [orderId]
  );

  const [payments] = await pool.query(
    'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at',
    [orderId]
  );

  const paid = payments
    .filter((p) => p.status === 'completed')
    .reduce((s, p) => s + Number(p.amount), 0);

  return {
    ...orders[0],
    items,
    payments,
    amount_paid: paid,
    balance_due: Math.max(0, Number(orders[0].total) - paid),
  };
}

router.get('/', async (req, res) => {
  try {
    const { status, kitchen } = req.query;
    let sql = `
      SELECT o.*, rt.table_number
      FROM orders o
      LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
      WHERE o.merged_into_order_id IS NULL
    `;
    const params = [];

    if (kitchen === 'true') {
      sql += ` AND o.status IN ('new', 'preparing', 'ready')`;
    }
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT 100';
    const [orders] = await pool.query(sql, params);

    const result = await Promise.all(
      orders.map(async (o) => {
        const [items] = await pool.query(
          `SELECT oi.*, mi.name AS item_name
           FROM order_items oi
           JOIN menu_items mi ON mi.id = oi.menu_item_id
           WHERE oi.order_id = ?`,
          [o.id]
        );
        return { ...o, items };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/merge', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { source_order_ids, target_order_id } = req.body;
    if (!source_order_ids?.length || !target_order_id) {
      return res.status(400).json({ error: 'source_order_ids and target_order_id required' });
    }

    await conn.beginTransaction();

    for (const sourceId of source_order_ids) {
      if (Number(sourceId) === Number(target_order_id)) continue;

      await conn.query(
        'UPDATE order_items SET order_id = ? WHERE order_id = ?',
        [target_order_id, sourceId]
      );
      await conn.query(
        'UPDATE orders SET merged_into_order_id = ?, status = ? WHERE id = ?',
        [target_order_id, 'cancelled', sourceId]
      );
    }

    await recalculateOrderTotals(conn, target_order_id);

    const [target] = await conn.query('SELECT table_id FROM orders WHERE id = ?', [
      target_order_id,
    ]);
    if (target[0]?.table_id) {
      await updateTableStatus(conn, target[0].table_id);
    }

    await conn.commit();
    res.json(await getOrderWithItems(target_order_id));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { order_type = 'walk_in', table_id, staff_name = 'Staff' } = req.body;
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO orders (order_type, table_id, staff_name, status) VALUES (?, ?, ?, ?)',
      [order_type, table_id || null, staff_name, 'new']
    );

    if (table_id) {
      await updateTableStatus(conn, table_id);
    }

    await conn.commit();
    const order = await getOrderWithItems(result.insertId);
    res.status(201).json(order);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/:id/items', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { menu_item_id, quantity = 1, notes = '' } = req.body;
    const orderId = req.params.id;

    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE id = ? AND status NOT IN (?, ?)',
      [orderId, 'paid', 'cancelled']
    );
    if (!orders.length) {
      return res.status(400).json({ error: 'Order not editable' });
    }

    const [menuItems] = await conn.query(
      'SELECT * FROM menu_items WHERE id = ?',
      [menu_item_id]
    );
    if (!menuItems.length) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    if (!menuItems[0].available) {
      return res.status(400).json({ error: 'Item is out of stock' });
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT * FROM order_items WHERE order_id = ? AND menu_item_id = ? AND notes = ?',
      [orderId, menu_item_id, notes]
    );

    if (existing.length) {
      await conn.query(
        'UPDATE order_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await conn.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)',
        [orderId, menu_item_id, quantity, menuItems[0].price, notes]
      );
    }

    if (['served', 'ready'].includes(orders[0].status)) {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [
        'preparing',
        orderId,
      ]);
    }

    await recalculateOrderTotals(conn, orderId);
    await conn.commit();

    const order = await getOrderWithItems(orderId);
    res.json(order);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id/items/:itemId', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { quantity, notes } = req.body;
    const orderId = req.params.id;

    await conn.beginTransaction();

    if (quantity !== undefined) {
      if (quantity <= 0) {
        await conn.query('DELETE FROM order_items WHERE id = ? AND order_id = ?', [
          req.params.itemId,
          orderId,
        ]);
      } else {
        await conn.query(
          'UPDATE order_items SET quantity = ? WHERE id = ? AND order_id = ?',
          [quantity, req.params.itemId, orderId]
        );
      }
    }
    if (notes !== undefined) {
      await conn.query(
        'UPDATE order_items SET notes = ? WHERE id = ? AND order_id = ?',
        [notes, req.params.itemId, orderId]
      );
    }

    await conn.query(
      `UPDATE orders SET status = CASE
        WHEN status IN ('served', 'ready') THEN 'preparing'
        ELSE status END
       WHERE id = ?`,
      [orderId]
    );

    await recalculateOrderTotals(conn, orderId);
    await conn.commit();

    res.json(await getOrderWithItems(orderId));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id/items/:itemId', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM order_items WHERE id = ? AND order_id = ?', [
      req.params.itemId,
      req.params.id,
    ]);
    await recalculateOrderTotals(conn, req.params.id);
    await conn.commit();
    res.json(await getOrderWithItems(req.params.id));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.patch('/:id/status', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    await conn.beginTransaction();
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [
      status,
      orderId,
    ]);

    const [orders] = await conn.query('SELECT table_id FROM orders WHERE id = ?', [
      orderId,
    ]);
    if (orders[0]?.table_id) {
      await updateTableStatus(conn, orders[0].table_id);
    }

    await conn.commit();
    res.json(await getOrderWithItems(orderId));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.patch('/:id/transfer-table', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { table_id } = req.body;
    const orderId = req.params.id;

    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT table_id FROM orders WHERE id = ?', [
      orderId,
    ]);
    const oldTableId = orders[0]?.table_id;

    await conn.query('UPDATE orders SET table_id = ?, order_type = ? WHERE id = ?', [
      table_id,
      'table',
      orderId,
    ]);

    if (oldTableId) await updateTableStatus(conn, oldTableId);
    if (table_id) await updateTableStatus(conn, table_id);

    await conn.commit();
    res.json(await getOrderWithItems(orderId));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/:id/cancel', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const orderId = req.params.id;
    await conn.beginTransaction();

    await conn.query(
      'UPDATE orders SET status = ?, cancelled_at = NOW() WHERE id = ?',
      ['cancelled', orderId]
    );

    const [orders] = await conn.query('SELECT table_id FROM orders WHERE id = ?', [
      orderId,
    ]);
    if (orders[0]?.table_id) {
      await updateTableStatus(conn, orders[0].table_id);
    }

    await conn.commit();
    res.json(await getOrderWithItems(orderId));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/:id/recommendations', async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const [allItems] = await pool.query('SELECT * FROM menu_items WHERE available = 1');
    const cartNames = order.items.map((i) => i.item_name);
    const recommendations = getRecommendations(cartNames, allItems, 3);

    res.json({
      message: 'AI suggests these complementary items',
      recommendations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
