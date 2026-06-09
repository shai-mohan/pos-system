const TAX_RATE = 0.1;

async function recalculateOrderTotals(conn, orderId) {
  const [items] = await conn.query(
    `SELECT oi.quantity, oi.unit_price
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.order_id = ? AND o.merged_into_order_id IS NULL`,
    [orderId]
  );

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  );
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  await conn.query(
    'UPDATE orders SET subtotal = ?, tax = ?, total = ? WHERE id = ?',
    [subtotal, tax, total, orderId]
  );

  return { subtotal, tax, total };
}

async function updateTableStatus(conn, tableId) {
  if (!tableId) return;

  const [activeOrders] = await conn.query(
    `SELECT status FROM orders
     WHERE table_id = ? AND merged_into_order_id IS NULL
     AND status NOT IN ('paid', 'cancelled')`,
    [tableId]
  );

  let status = 'available';
  if (activeOrders.length > 0) {
    const hasAwaiting = activeOrders.some(
      (o) => o.status === 'awaiting_payment' || o.status === 'served'
    );
    status = hasAwaiting ? 'awaiting_payment' : 'occupied';
  }

  await conn.query('UPDATE restaurant_tables SET status = ? WHERE id = ?', [
    status,
    tableId,
  ]);
}

module.exports = { TAX_RATE, recalculateOrderTotals, updateTableStatus };
