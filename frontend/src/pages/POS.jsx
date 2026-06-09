import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { menuApi, orderApi, tableApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, ORDER_STATUS_LABELS } from '../utils/format';
import PaymentModal from '../components/PaymentModal';

export default function POS() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderType, setOrderType] = useState('walk_in');
  const [tableId, setTableId] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMenu = useCallback(async () => {
    const [cats, menuItems] = await Promise.all([
      menuApi.getCategories(),
      menuApi.getItems(true),
    ]);
    setCategories(cats);
    setItems(menuItems);
    if (cats.length && !activeCategory) setActiveCategory(cats[0].id);
  }, [activeCategory]);

  const loadTables = useCallback(async () => {
    const data = await tableApi.getAll();
    setTables(data);
  }, []);

  const refreshOrder = useCallback(async (id) => {
    const data = await orderApi.get(id);
    setOrder(data);
    if (data.items?.length) {
      const rec = await orderApi.recommendations(id);
      setRecommendations(rec.recommendations || []);
    } else {
      setRecommendations([]);
    }
  }, []);

  useEffect(() => {
    loadMenu();
    loadTables();
  }, [loadMenu, loadTables]);

  useEffect(() => {
    const orderId = searchParams.get('order');
    const table = searchParams.get('table');
    if (orderId) {
      refreshOrder(orderId);
    } else if (table) {
      setTableId(Number(table));
      setOrderType('table');
    }
  }, [searchParams, refreshOrder]);

  const startOrder = async () => {
    setError('');
    setLoading(true);
    try {
      const newOrder = await orderApi.create({
        order_type: orderType,
        table_id: orderType === 'table' ? tableId : null,
        staff_name: user?.name || 'Staff',
      });
      setOrder(newOrder);
      setSearchParams({ order: newOrder.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (menuItem, notes = '') => {
    if (!order) return;
    setError('');
    try {
      const updated = await orderApi.addItem(order.id, {
        menu_item_id: menuItem.id,
        quantity: 1,
        notes,
      });
      setOrder(updated);
      const rec = await orderApi.recommendations(order.id);
      setRecommendations(rec.recommendations || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateQty = async (itemId, quantity) => {
    try {
      const updated = await orderApi.updateItem(order.id, itemId, { quantity });
      setOrder(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const updated = await orderApi.removeItem(order.id, itemId);
      setOrder(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const sendToKitchen = async () => {
    try {
      await orderApi.updateStatus(order.id, 'preparing');
      await refreshOrder(order.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNoteSubmit = async () => {
    if (noteItem) {
      await addItem(noteItem, noteText);
    }
    setNoteItem(null);
    setNoteText('');
  };

  const filteredItems = items.filter((i) => i.category_id === activeCategory);

  if (!order) {
    return (
      <div>
        <h1 className="page-title">New Order</h1>
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="form-group">
            <label>Order Type</label>
            <div className="action-bar">
              {['walk_in', 'table', 'takeaway'].map((t) => (
                <button
                  key={t}
                  className={`btn ${orderType === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOrderType(t)}
                >
                  {t === 'walk_in' ? 'Walk-in' : t === 'table' ? 'Table' : 'Takeaway'}
                </button>
              ))}
            </div>
          </div>
          {orderType === 'table' && (
            <div className="form-group">
              <label>Select Table</label>
              <select value={tableId || ''} onChange={(e) => setTableId(Number(e.target.value))}>
                <option value="">Choose table...</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.table_number} ({t.status})
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}
          <button
            className="btn btn-primary btn-lg"
            onClick={startOrder}
            disabled={loading || (orderType === 'table' && !tableId)}
            style={{ width: '100%', marginTop: 16 }}
          >
            {loading ? 'Creating...' : 'Start Order'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="action-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Order #{order.id}
          {order.table_number && ` — ${order.table_number}`}
          <span className={`badge badge-${order.status}`} style={{ marginLeft: 12 }}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </h1>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setOrder(null);
            setSearchParams({});
          }}
        >
          New Order
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="grid-2">
        <div>
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="menu-grid">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                className={`menu-item-btn ${!item.available ? 'unavailable' : ''}`}
                disabled={!item.available || order.status === 'paid' || order.status === 'cancelled'}
                onClick={() => setNoteItem(item)}
              >
                <span>{item.name}</span>
                <span className="price">{formatMoney(item.price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card cart-panel">
          {recommendations.length > 0 && (
            <div className="ai-suggestions">
              <h4>✨ AI Suggests</h4>
              <div className="suggestion-chips">
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    className="suggestion-chip"
                    onClick={() => addItem(rec)}
                  >
                    + {rec.name} ({formatMoney(rec.price)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ marginBottom: 12 }}>Current Order</h3>
          {!order.items?.length ? (
            <p className="empty-state">Tap menu items to add</p>
          ) : (
            <div className="cart-items">
              {order.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div>
                    <strong>{item.item_name}</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                      {formatMoney(item.unit_price)} each
                    </div>
                    {item.notes && <div className="cart-item-notes">📝 {item.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="qty-controls">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 600 }}>
                      {formatMoney(item.quantity * item.unit_price)}
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: 4 }}
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="totals">
            <div className="row">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            <div className="row">
              <span>Tax (10%)</span>
              <span>{formatMoney(order.tax)}</span>
            </div>
            <div className="row total-row">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
            {order.amount_paid > 0 && (
              <div className="row">
                <span>Paid</span>
                <span>{formatMoney(order.amount_paid)}</span>
              </div>
            )}
          </div>

          {order.status !== 'paid' && order.status !== 'cancelled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {order.items?.length > 0 && order.status === 'new' && (
                <button className="btn btn-primary btn-lg" onClick={sendToKitchen}>
                  Send to Kitchen
                </button>
              )}
              {order.items?.length > 0 && (
                <button
                  className="btn btn-success btn-lg"
                  onClick={() => setShowPayment(true)}
                >
                  Collect Payment
                </button>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (confirm('Cancel this order?')) {
                    await orderApi.cancel(order.id);
                    setOrder(null);
                    setSearchParams({});
                  }
                }}
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>
      </div>

      {noteItem && (
        <div className="modal-overlay" onClick={() => setNoteItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add {noteItem.name}</h2>
            <div className="form-group">
              <label>Special Instructions (optional)</label>
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Less sugar, no onions..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setNoteItem(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleNoteSubmit}>
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          order={order}
          onClose={() => setShowPayment(false)}
          onPaid={(updated) => {
            refreshOrder(order.id);
            if (updated.balance_due <= 0) setShowPayment(false);
          }}
        />
      )}
    </div>
  );
}
