const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [tables] = await pool.query(
      'SELECT * FROM restaurant_tables ORDER BY table_number'
    );

    const [activeOrders] = await pool.query(
      `SELECT o.id, o.table_id, o.status, o.total
       FROM orders o
       WHERE o.table_id IS NOT NULL
       AND o.merged_into_order_id IS NULL
       AND o.status NOT IN ('paid', 'cancelled')`
    );

    const result = tables.map((t) => ({
      ...t,
      active_orders: activeOrders.filter((o) => o.table_id === t.id),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { table_number } = req.body;
    const [result] = await pool.query(
      'INSERT INTO restaurant_tables (table_number) VALUES (?)',
      [table_number]
    );
    res.status(201).json({ id: result.insertId, table_number, status: 'available' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE restaurant_tables SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ]);
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
