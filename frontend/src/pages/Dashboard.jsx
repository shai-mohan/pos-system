import { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import { formatMoney } from '../utils/format';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [sum, ins] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.insights(),
      ]);
      setSummary(sum);
      setInsights(ins.insights || []);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!summary) return <div className="empty-state">Loading dashboard...</div>;

  return (
    <div>
      <h1 className="page-title">Owner Dashboard</h1>

      <div className="dashboard-metrics">
        <div className="card metric-card">
          <div className="value">{formatMoney(summary.today.total_sales)}</div>
          <div className="label">Today's Sales</div>
        </div>
        <div className="card metric-card">
          <div className="value">{summary.today.order_count}</div>
          <div className="label">Orders Today</div>
        </div>
        <div className="card metric-card">
          <div className="value">{formatMoney(summary.today.avg_order_value)}</div>
          <div className="label">Avg Order Value</div>
        </div>
        <div className="card metric-card">
          <div className="value">{summary.kitchen_queue}</div>
          <div className="label">Kitchen Queue</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Popular Items Today</h3>
          {summary.popular_items.length === 0 ? (
            <p className="empty-state">No sales yet today</p>
          ) : (
            <ol style={{ paddingLeft: 20 }}>
              {summary.popular_items.map((item, i) => (
                <li key={item.name} style={{ padding: '8px 0' }}>
                  <strong>#{i + 1} {item.name}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                    ({item.total_sold} sold)
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>✨ AI Insights</h3>
          <ul className="insight-list">
            {insights.map((ins, i) => (
              <li key={i}>{ins.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
