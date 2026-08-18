import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { api, formatINR, downloadWithAuth } from '../api/client';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PERIODS = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
];

export default function Reports() {
  const [period, setPeriod] = useState('daily');
  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [tab, setTab] = useState('sales');

  useEffect(() => {
    api.getReport(period).then(setReport).catch(console.error);
  }, [period]);

  useEffect(() => {
    api.getInventoryReport().then(setInventory).catch(console.error);
    api.getPnl().then(setPnl).catch(console.error);
  }, []);

  const barData = report ? {
    labels: report.dailyTrend.map((d) => d.date),
    datasets: [{
      label: 'Revenue (₹)',
      data: report.dailyTrend.map((d) => d.revenue),
      backgroundColor: '#c45c26',
      borderRadius: 6,
    }],
  } : null;

  const pieData = report ? {
    labels: report.categoryBreakdown.map((c) => c.category),
    datasets: [{
      data: report.categoryBreakdown.map((c) => c.amount),
      backgroundColor: ['#c45c26', '#d4a017', '#2d7a4f', '#5b7fc7', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c', '#34495e'],
    }],
  } : null;

  function downloadSales(format) {
    downloadWithAuth(api.downloadReport(period, format), `sales-${period}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
  }

  function downloadInv(format) {
    downloadWithAuth(api.downloadInventory(format), `inventory.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Sales analytics, inventory snapshot, and exports</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['sales', 'inventory', 'pnl'].map((t) => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t)}>
            {t === 'sales' ? 'Sales Report' : t === 'inventory' ? 'Inventory' : 'Profit & Loss'}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {PERIODS.map((p) => (
              <button key={p.id} className={`btn btn-sm ${period === p.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod(p.id)}>{p.label}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadSales('xlsx')}>Download Excel</button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadSales('pdf')}>Download PDF</button>
            </div>
          </div>

          {report && (
            <>
              <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div className="stat-label">Revenue</div>
                  <div className="stat-value">{formatINR(report.summary.revenue)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Cost</div>
                  <div className="stat-value">{formatINR(report.summary.cost)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Profit</div>
                  <div className="stat-value profit">{formatINR(report.summary.profit)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Margin</div>
                  <div className="stat-value">{report.summary.profitMargin}%</div>
                </div>
              </div>

              <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card">
                  <h2 className="card-title">Sales Trend</h2>
                  {barData && barData.labels.length > 0 ? (
                    <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  ) : <div className="empty-state">No sales data for this period</div>}
                </div>
                <div className="card">
                  <h2 className="card-title">Category Breakdown</h2>
                  {pieData && pieData.labels.length > 0 ? (
                    <Pie data={pieData} options={{ responsive: true }} />
                  ) : <div className="empty-state">No category data</div>}
                </div>
              </div>

              <div className="card">
                <h2 className="card-title">Top Selling Items</h2>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th>Category</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {report.topItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.category}</td>
                          <td>{item.qty}</td>
                          <td>{formatINR(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'inventory' && inventory && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadInv('xlsx')}>Download Excel</button>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadInv('pdf')}>Download PDF</button>
          </div>
          <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-label">Total Items</div>
              <div className="stat-value">{inventory.totalItems}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In Stock</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{inventory.statusCounts.in_stock}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Low / Out</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {inventory.statusCounts.low_stock + inventory.statusCounts.out_of_stock}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Inventory Value</div>
              <div className="stat-value">{formatINR(inventory.sellingValue)}</div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Stock</th><th>Cost Value</th><th>Status</th></tr></thead>
                <tbody>
                  {inventory.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.stock_qty} {item.unit}</td>
                      <td>{formatINR(item.cost_price * item.stock_qty)}</td>
                      <td><span className={`badge badge-${item.stock_status}`}>{item.stock_status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'pnl' && pnl && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h2 className="card-title">Profit & Loss Summary</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{pnl.from} to {pnl.to}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Revenue</span><strong>{formatINR(pnl.revenue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Cost</span><strong>{formatINR(pnl.cost)}</strong>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
              <span>Gross Profit</span><strong style={{ color: 'var(--success)' }}>{formatINR(pnl.grossProfit)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Profit Margin</span><strong>{pnl.profitMargin}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
