const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/summary', async (req, res) => {
  try {
    const [sales] = await pool.query(
      `SELECT
        COALESCE(SUM(total), 0) AS total_sales,
        COUNT(*) AS order_count,
        COALESCE(AVG(total), 0) AS avg_order_value
       FROM orders
       WHERE status = 'paid'
       AND DATE(created_at) = CURDATE()`
    );

    const [popular] = await pool.query(
      `SELECT mi.name, SUM(oi.quantity) AS total_sold
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'paid'
       AND DATE(o.created_at) = CURDATE()
       GROUP BY mi.id, mi.name
       ORDER BY total_sold DESC
       LIMIT 5`
    );

    const [activeOrders] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders
       WHERE status NOT IN ('paid', 'cancelled')
       AND merged_into_order_id IS NULL`
    );

    const [kitchenQueue] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders
       WHERE status IN ('new', 'preparing', 'ready')
       AND merged_into_order_id IS NULL`
    );

    res.json({
      today: {
        total_sales: Number(sales[0].total_sales),
        order_count: Number(sales[0].order_count),
        avg_order_value: Math.round(Number(sales[0].avg_order_value) * 100) / 100,
      },
      popular_items: popular,
      active_orders: Number(activeOrders[0].count),
      kitchen_queue: Number(kitchenQueue[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const [hourly] = await pool.query(
      `SELECT HOUR(created_at) AS hour, COUNT(*) AS orders, SUM(total) AS revenue
       FROM orders
       WHERE status = 'paid' AND DATE(created_at) = CURDATE()
       GROUP BY HOUR(created_at)
       ORDER BY hour`
    );

    const [lowStock] = await pool.query(
      'SELECT name FROM menu_items WHERE available = 0'
    );

    const insights = [];

    if (hourly.length) {
      const peak = hourly.reduce((a, b) =>
        Number(b.orders) > Number(a.orders) ? b : a
      );
      insights.push({
        type: 'peak_hour',
        message: `Peak hour today: ${peak.hour}:00 with ${peak.orders} orders ($${Number(peak.revenue).toFixed(2)} revenue)`,
      });
    }

    const [summary] = await pool.query(
      `SELECT AVG(total) AS avg FROM orders WHERE status = 'paid' AND DATE(created_at) = CURDATE()`
    );
    if (summary[0].avg) {
      insights.push({
        type: 'upsell',
        message: `Average order value is $${Number(summary[0].avg).toFixed(2)}. Use AI recommendations to boost add-on sales.`,
      });
    }

    if (lowStock.length) {
      insights.push({
        type: 'stock',
        message: `Out of stock: ${lowStock.map((i) => i.name).join(', ')}. Mark unavailable items to prevent order errors.`,
      });
    }

    if (!insights.length) {
      insights.push({
        type: 'welcome',
        message: 'Start taking orders to see AI-powered business insights here.',
      });
    }

    res.json({ insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
