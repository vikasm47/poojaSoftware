import { useEffect, useState } from 'react';
import { api, formatINR, formatDateTime } from '../api/client';

export default function Sales() {
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    api.getItems().then(setItems);
    api.getSales().then(setSales);
  }

  useEffect(() => { load(); }, []);

  function addToCart(itemId) {
    const item = items.find((i) => i.id === parseInt(itemId, 10));
    if (!item) return;
    const existing = cart.find((c) => c.item_id === item.id);
    if (existing) {
      setCart(cart.map((c) => c.item_id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item_id: item.id, qty: 1, name: item.name, price: item.selling_price }]);
    }
  }

  function updateQty(itemId, qty) {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.item_id !== itemId));
    } else {
      setCart(cart.map((c) => c.item_id === itemId ? { ...c, qty } : c));
    }
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const total = Math.max(0, subtotal - discount);

  async function handleSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) { setError('Add at least one item'); return; }
    setError('');
    try {
      await api.createSale({
        items: cart.map((c) => ({ item_id: c.item_id, qty: c.qty })),
        discount: parseFloat(discount) || 0,
        payment_mode: paymentMode,
      });
      setSuccess('Sale recorded successfully!');
      setCart([]);
      setDiscount(0);
      setShowForm(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Record sales and view history</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError(''); }}>
          + Record Sale
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2 className="card-title">Sales History</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Items</th><th>Payment</th><th>Discount</th><th>Total</th></tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDateTime(sale.sale_date)}</td>
                  <td>{sale.items_summary || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{sale.payment_mode}</td>
                  <td>{formatINR(sale.discount)}</td>
                  <td>{formatINR(sale.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sales.length === 0 && <div className="empty-state">No sales recorded yet</div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="modal-title">Record a Sale</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Add Item</label>
                <select className="select" onChange={(e) => { addToCart(e.target.value); e.target.value = ''; }}>
                  <option value="">Select item to add...</option>
                  {items.filter((i) => i.stock_qty > 0).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {formatINR(item.selling_price)} (Stock: {item.stock_qty})
                    </option>
                  ))}
                </select>
              </div>

              {cart.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {cart.map((c) => (
                    <div key={c.item_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ flex: 1 }}>{c.name}</span>
                      <input className="input" type="number" min="1" style={{ width: 70 }} value={c.qty}
                        onChange={(e) => updateQty(c.item_id, parseInt(e.target.value, 10))} />
                      <span>{formatINR(c.price * c.qty)}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontWeight: 600, marginTop: '0.5rem' }}>
                    Subtotal: {formatINR(subtotal)}
                  </div>
                </div>
              )}

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">Discount (₹)</label>
                  <input className="input" type="number" min="0" value={discount}
                    onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Payment Mode</label>
                  <select className="select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'right', margin: '1rem 0' }}>
                Total: {formatINR(total)}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Complete Sale</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
