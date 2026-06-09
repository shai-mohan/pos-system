import { useEffect, useState } from 'react';
import { orderApi } from '../api';
import { ORDER_STATUS_LABELS } from '../utils/format';

const STATUS_FLOW = ['new', 'preparing', 'ready', 'served'];

export default function Kitchen() {
  const [orders, setOrders] = useState([]);

  const load = async () => {
    const data = await orderApi.getAll('?kitchen=true');
    setOrders(data.filter((o) => o.items?.length > 0));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const advanceStatus = async (order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    if (next !== order.status) {
      await orderApi.updateStatus(order.id, next);
      load();
    }
  };

  return (
    <div>
      <h1 className="page-title">Kitchen Display</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
        Auto-refreshes every 5 seconds
      </p>

      {orders.length === 0 ? (
        <div className="card empty-state">No orders in kitchen queue</div>
      ) : (
        <div className="kitchen-grid">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`card kitchen-order status-${order.status}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.25rem' }}>Order #{order.id}</strong>
                  {order.table_number && (
                    <span style={{ marginLeft: 12, color: 'var(--muted)' }}>
                      {order.table_number}
                    </span>
                  )}
                </div>
                <span className={`badge badge-${order.status}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <ul className="kitchen-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <strong>{item.quantity}× {item.item_name}</strong>
                    {item.notes && (
                      <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                        — {item.notes}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="action-bar">
                {order.status !== 'served' && (
                  <button className="btn btn-primary" onClick={() => advanceStatus(order)}>
                    Mark as{' '}
                    {ORDER_STATUS_LABELS[
                      STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(order.status) + 1, 3)]
                    ]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
