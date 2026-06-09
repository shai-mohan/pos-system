import { formatMoney } from '../utils/format';

export default function ReceiptView({ receipt }) {
  const { order, items, payments, total_paid, balance_due } = receipt;

  return (
    <div className="receipt">
      <h3>☕ Café POS</h3>
      <p style={{ textAlign: 'center', marginBottom: 12 }}>Receipt</p>
      <div className="line">
        <span>Order #</span>
        <span>{order.id}</span>
      </div>
      {order.table_number && (
        <div className="line">
          <span>Table</span>
          <span>{order.table_number}</span>
        </div>
      )}
      <div className="line">
        <span>Date</span>
        <span>{new Date(order.created_at).toLocaleString()}</span>
      </div>
      <div className="line">
        <span>Staff</span>
        <span>{order.staff_name}</span>
      </div>
      <div className="divider" />
      {items.map((item) => (
        <div key={item.id}>
          <div className="line">
            <span>
              {item.quantity}× {item.item_name}
            </span>
            <span>{formatMoney(item.quantity * item.unit_price)}</span>
          </div>
          {item.notes && (
            <div style={{ fontSize: '0.8rem', color: '#666', marginLeft: 8 }}>
              Note: {item.notes}
            </div>
          )}
        </div>
      ))}
      <div className="divider" />
      <div className="line">
        <span>Subtotal</span>
        <span>{formatMoney(order.subtotal)}</span>
      </div>
      <div className="line">
        <span>Tax (10%)</span>
        <span>{formatMoney(order.tax)}</span>
      </div>
      <div className="line" style={{ fontWeight: 'bold' }}>
        <span>Total</span>
        <span>{formatMoney(order.total)}</span>
      </div>
      <div className="divider" />
      {payments?.map((p) => (
        <div className="line" key={p.id}>
          <span>{p.method.toUpperCase()}</span>
          <span>{formatMoney(p.amount)}</span>
        </div>
      ))}
      <div className="line" style={{ fontWeight: 'bold' }}>
        <span>Paid</span>
        <span>{formatMoney(total_paid)}</span>
      </div>
      {balance_due > 0 && (
        <div className="line">
          <span>Balance Due</span>
          <span>{formatMoney(balance_due)}</span>
        </div>
      )}
      <p style={{ textAlign: 'center', marginTop: 16 }}>Thank you!</p>
    </div>
  );
}
