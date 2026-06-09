import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tableApi, orderApi } from '../api';
import { TABLE_STATUS_LABELS } from '../utils/format';

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState([]);
  const [targetOrder, setTargetOrder] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    const data = await tableApi.getAll();
    setTables(data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTableClick = (table) => {
    if (mergeMode) return;
    setSelectedTable(table);
  };

  const startOrderOnTable = () => {
    navigate(`/?table=${selectedTable.id}`);
  };

  const openOrder = (orderId) => {
    navigate(`/?order=${orderId}`);
  };

  const transferOrder = async (orderId, newTableId) => {
    await orderApi.transferTable(orderId, newTableId);
    load();
    setSelectedTable(null);
  };

  const handleMerge = async () => {
    if (!targetOrder || mergeSelected.length < 2) return;
    const sourceIds = mergeSelected.filter((id) => id !== targetOrder);
    await orderApi.merge(sourceIds, targetOrder);
    setMergeMode(false);
    setMergeSelected([]);
    setTargetOrder(null);
    load();
  };

  const toggleMergeOrder = (orderId) => {
    setMergeSelected((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  return (
    <div>
      <div className="action-bar" style={{ justifyContent: 'space-between' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Tables</h1>
        <button
          className={`btn ${mergeMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setMergeMode(!mergeMode);
            setMergeSelected([]);
            setTargetOrder(null);
          }}
        >
          {mergeMode ? 'Cancel Merge' : 'Merge Bills'}
        </button>
      </div>

      {mergeMode && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p>Select orders to merge, then pick the target order:</p>
          <div className="action-bar">
            {tables.flatMap((t) =>
              t.active_orders.map((o) => (
                <button
                  key={o.id}
                  className={`btn btn-sm ${mergeSelected.includes(o.id) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleMergeOrder(o.id)}
                >
                  #{o.id} ({t.table_number})
                </button>
              ))
            )}
          </div>
          {mergeSelected.length >= 2 && (
            <>
              <label>Target order (keeps this bill):</label>
              <select
                value={targetOrder || ''}
                onChange={(e) => setTargetOrder(Number(e.target.value))}
                style={{ marginTop: 8, width: '100%' }}
              >
                <option value="">Select target...</option>
                {mergeSelected.map((id) => (
                  <option key={id} value={id}>
                    Order #{id}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={handleMerge}
                disabled={!targetOrder}
              >
                Merge Orders
              </button>
            </>
          )}
        </div>
      )}

      <div className="tables-grid">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`table-card ${selectedTable?.id === table.id ? 'selected' : ''}`}
            onClick={() => handleTableClick(table)}
          >
            <div className="table-num">{table.table_number}</div>
            <span className={`badge badge-${table.status}`}>
              {TABLE_STATUS_LABELS[table.status]}
            </span>
            {table.active_orders.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 8 }}>
                {table.active_orders.length} active order(s)
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTable && (
        <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedTable.table_number}</h2>
            <p>
              Status:{' '}
              <span className={`badge badge-${selectedTable.status}`}>
                {TABLE_STATUS_LABELS[selectedTable.status]}
              </span>
            </p>

            {selectedTable.active_orders.length > 0 ? (
              <div style={{ margin: '16px 0' }}>
                <strong>Active Orders:</strong>
                {selectedTable.active_orders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span>Order #{o.id} — ${Number(o.total).toFixed(2)}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => openOrder(o.id)}>
                      Open
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startOrderOnTable}>
                Start New Order
              </button>
            )}

            {selectedTable.active_orders.length > 0 && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Transfer order to another table:</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      transferOrder(selectedTable.active_orders[0].id, Number(e.target.value));
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Select destination...</option>
                  {tables
                    .filter((t) => t.id !== selectedTable.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.table_number}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedTable(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
