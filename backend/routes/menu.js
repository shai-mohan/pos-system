const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM menu_categories ORDER BY sort_order, name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, sort_order = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO menu_categories (name, sort_order) VALUES (?, ?)',
      [name, sort_order]
    );
    res.status(201).json({ id: result.insertId, name, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/items', async (req, res) => {
  try {
    const { available_only } = req.query;
    let sql = `
      SELECT mi.*, mc.name AS category_name
      FROM menu_items mi
      JOIN menu_categories mc ON mc.id = mi.category_id
    `;
    if (available_only === 'true') {
      sql += ' WHERE mi.available = 1';
    }
    sql += ' ORDER BY mc.sort_order, mi.name';
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/items', async (req, res) => {
  try {
    const { name, price, category_id, description = '', available = true } =
      req.body;
    const [result] = await pool.query(
      'INSERT INTO menu_items (name, price, category_id, description, available) VALUES (?, ?, ?, ?, ?)',
      [name, price, category_id, description, available ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const { name, price, category_id, description, available } = req.body;
    await pool.query(
      `UPDATE menu_items SET name = ?, price = ?, category_id = ?,
       description = ?, available = ? WHERE id = ?`,
      [name, price, category_id, description, available ? 1 : 0, req.params.id]
    );
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/items/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    await pool.query('UPDATE menu_items SET available = ? WHERE id = ?', [
      available ? 1 : 0,
      req.params.id,
    ]);
    res.json({ id: Number(req.params.id), available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
