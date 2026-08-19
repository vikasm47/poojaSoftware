import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR, formatDateTime } from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading dashboard...</div>;
  if (!data) {
    return (
      <div className="alert alert-error">
        {error || 'Failed to load dashboard'}
        {error?.toLowerCase().includes('license') && (
          <div style={{ marginTop: '0.75rem' }}>
            <Link to="/license" className="btn btn-primary btn-sm">Activate License</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your shop overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/sales" className="btn btn-primary">Record Sale</Link>
          <Link to="/purchases" className="btn btn-secondary">Record Purchase</Link>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Today's Sales</div>
          <div className="stat-value">{formatINR(data.today.revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Profit</div>
          <div className="stat-value profit">{formatINR(data.today.profit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week</div>
          <div className="stat-value">{formatINR(data.week.revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value">{formatINR(data.month.revenue)}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">⚠️ Stock Alerts</h2>
          {data.alerts.length === 0 ? (
            <p className="empty-state" style={{ padding: '1rem' }}>All items are well stocked!</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Item</th><th>Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.alerts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.stock_qty} {item.unit}</td>
                      <td><span className={`badge badge-${item.stock_status}`}>{item.stock_status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/inventory" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>View All Inventory →</Link>
        </div>

        <div className="card">
          <h2 className="card-title">Recent Sales</h2>
          {data.recentSales.length === 0 ? (
            <p className="empty-state" style={{ padding: '1rem' }}>No sales yet today</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>Items</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{formatDateTime(sale.sale_date)}</td>
                      <td>{sale.items_summary || '—'}</td>
                      <td>{formatINR(sale.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/sales" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>View All Sales →</Link>
        </div>
      </div>
    </div>
  );
}
