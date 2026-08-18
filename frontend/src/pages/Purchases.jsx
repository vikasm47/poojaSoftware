import { useEffect, useState } from 'react';
import { api, formatINR, formatDateTime } from '../api/client';

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_id: '', qty: '', cost_price_at_purchase: '', supplier: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    api.getItems().then(setItems);
    api.getPurchases().then(setPurchases);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createPurchase({
        item_id: parseInt(form.item_id, 10),
        qty: parseFloat(form.qty),
        cost_price_at_purchase: parseFloat(form.cost_price_at_purchase) || undefined,
        supplier: form.supplier || undefined,
      });
      setSuccess('Purchase recorded and stock updated!');
      setForm({ item_id: '', qty: '', cost_price_at_purchase: '', supplier: '' });
      setShowForm(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  function onItemSelect(itemId) {
    const item = items.find((i) => i.id === parseInt(itemId, 10));
    setForm({
      ...form,
      item_id: itemId,
      cost_price_at_purchase: item ? item.cost_price : '',
      supplier: item?.supplier || '',
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Record stock purchases and restocking</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError(''); }}>
          + Record Purchase
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2 className="card-title">Purchase History</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Supplier</th><th>Total</th></tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.purchase_date)}</td>
                  <td>{p.item_name}</td>
                  <td>{p.qty} {p.unit}</td>
                  <td>{formatINR(p.cost_price_at_purchase)}</td>
                  <td>{p.supplier || '—'}</td>
                  <td>{formatINR(p.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {purchases.length === 0 && <div className="empty-state">No purchases recorded yet</div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Purchase</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Item *</label>
                <select className="select" value={form.item_id} required onChange={(e) => onItemSelect(e.target.value)}>
                  <option value="">Select item...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Quantity *</label>
                <input className="input" type="number" min="0.01" step="0.01" required value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Cost Price per Unit (₹)</label>
                <input className="input" type="number" step="0.01" value={form.cost_price_at_purchase}
                  onChange={(e) => setForm({ ...form, cost_price_at_purchase: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Supplier</label>
                <input className="input" value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Record Purchase</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
