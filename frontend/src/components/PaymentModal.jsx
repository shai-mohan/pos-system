import { useState } from 'react';
import { paymentApi } from '../api';
import { formatMoney } from '../utils/format';
import ReceiptView from './ReceiptView';

const METHODS = [
  { id: 'cash', label: '💵 Cash' },
  { id: 'card', label: '💳 Card' },
  { id: 'qr', label: '📱 QR Pay' },
  { id: 'ewallet', label: '👛 E-Wallet' },
];

export default function PaymentModal({ order, onClose, onPaid }) {
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState(order.balance_due?.toFixed(2) || order.total?.toFixed(2));
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState([
    { amount: '', method: 'cash' },
    { amount: '', method: 'card' },
  ]);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const balance = order.balance_due ?? order.total;

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      if (splitMode) {
        const validSplits = splits
          .filter((s) => s.amount && Number(s.amount) > 0)
          .map((s) => ({ amount: Number(s.amount), method: s.method, status: 'completed' }));
        if (!validSplits.length) throw new Error('Enter split amounts');
        await paymentApi.split({ order_id: order.id, splits: validSplits });
      } else {
        const payAmount = Number(amount);
        if (payAmount <= 0) throw new Error('Invalid amount');
        await paymentApi.pay({
          order_id: order.id,
          amount: payAmount,
          method,
          status: 'completed',
        });
      }
      const updated = await paymentApi.receipt(order.id);
      onPaid?.(updated);
      if (updated.balance_due <= 0) {
        setReceipt(updated);
      } else {
        setAmount(updated.balance_due.toFixed(2));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitEqual = () => {
    const half = (balance / 2).toFixed(2);
    setSplits([
      { amount: half, method: 'cash' },
      { amount: (balance - Number(half)).toFixed(2), method: 'card' },
    ]);
  };

  if (receipt) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
          <ReceiptView receipt={receipt} />
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Payment — Order #{order.id}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
          Total: {formatMoney(order.total)} | Paid: {formatMoney(order.amount_paid || 0)} | Due:{' '}
          {formatMoney(balance)}
        </p>

        <div className="action-bar">
          <button
            className={`btn btn-sm ${!splitMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSplitMode(false)}
          >
            Full / Partial
          </button>
          <button
            className={`btn btn-sm ${splitMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSplitMode(true)}
          >
            Split Bill
          </button>
        </div>

        {!splitMode ? (
          <>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <label style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Payment Method</label>
            <div className="payment-methods">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`payment-method-btn ${method === m.id ? 'selected' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" onClick={handleSplitEqual} style={{ marginBottom: 12 }}>
              Split Equally (2 ways)
            </button>
            {splits.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={s.amount}
                  onChange={(e) => {
                    const next = [...splits];
                    next[i].amount = e.target.value;
                    setSplits(next);
                  }}
                />
                <select
                  value={s.method}
                  onChange={(e) => {
                    const next = [...splits];
                    next[i].method = e.target.value;
                    setSplits(next);
                  }}
                >
                  {METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-success" onClick={handlePay} disabled={loading}>
            {loading ? 'Processing...' : 'Collect Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
