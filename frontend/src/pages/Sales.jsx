import { useEffect, useState } from 'react';
import { api, downloadWithAuth, formatINR, formatDateTime } from '../api/client';
import MultiItemPicker from '../components/MultiItemPicker';

export default function Sales() {
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    api.getItems().then(setItems);
    api.getSales().then(setSales);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setCart([]);
    setDiscount(0);
    setPaymentMode('cash');
    setCustomerName('');
    setCustomerAddress('');
    setEditingId(null);
    setError('');
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  async function openEdit(saleId) {
    setError('');
    try {
      const sale = await api.getSale(saleId);
      setEditingId(sale.id);
      setDiscount(sale.discount || 0);
      setPaymentMode(sale.payment_mode || 'cash');
      setCustomerName(sale.customer_name || '');
      setCustomerAddress(sale.customer_address || '');
      setCart(sale.items.map((line) => ({
        item_id: line.item_id,
        qty: line.qty,
        name: line.name,
        unit: line.unit,
        price: line.price_at_sale,
        cost: line.cost_at_sale,
      })));
      setShowForm(true);
    } catch (err) {
      setError(err.message);
    }
  }

  const subtotal = cart.reduce((sum, c) => sum + (c.price * c.qty), 0);
  const total = Math.max(0, subtotal - (parseFloat(discount) || 0));

  async function handleSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) { setError('Add at least one item'); return; }
    setError('');
    try {
      const payload = {
        items: cart.map((c) => ({ item_id: c.item_id, qty: c.qty, price_at_sale: c.price })),
        discount: parseFloat(discount) || 0,
        payment_mode: paymentMode,
        customer_name: customerName.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
      };

      if (editingId) {
        await api.updateSale(editingId, payload);
        setSuccess('Sale updated successfully!');
      } else {
        await api.createSale(payload);
        setSuccess(`Sale recorded — ${cart.length} item(s)!`);
      }

      resetForm();
      setShowForm(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(sale) {
    if (!confirm(`Delete this sale (${formatINR(sale.total_amount)})? Stock will be restored.`)) return;
    setError('');
    try {
      await api.deleteSale(sale.id);
      setSuccess('Sale deleted and stock restored.');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  function downloadInvoice(saleId) {
    downloadWithAuth(api.saleInvoiceUrl(saleId), `invoice-${saleId}.pdf`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Record sales with buyer details and generate invoices</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Record Sale
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && !showForm && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h2 className="card-title">Sales History</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Buyer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDateTime(sale.sale_date)}</td>
                  <td>{sale.customer_name || '—'}</td>
                  <td>{sale.items_summary || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{sale.payment_mode}</td>
                  <td>{formatINR(sale.total_amount)}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadInvoice(sale.id)}>Invoice</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(sale.id)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sale)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sales.length === 0 && <div className="empty-state">No sales recorded yet</div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Sale' : 'Record Sale — Multiple Items'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); resetForm(); }}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">Buyer Name</label>
                  <input className="input" value={customerName} placeholder="Customer name (optional)"
                    onChange={(e) => setCustomerName(e.target.value)} />
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
              <div className="form-group">
                <label className="label">Buyer Address</label>
                <textarea className="textarea" rows={2} value={customerAddress}
                  placeholder="Address for invoice (optional)"
                  onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>

              <MultiItemPicker
                mode="sale"
                items={items}
                cart={cart}
                onCartChange={setCart}
              />

              <div className="form-group">
                <label className="label">Discount (₹)</label>
                <input className="input" type="number" min="0" value={discount}
                  onChange={(e) => setDiscount(e.target.value)} />
              </div>

              <div style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'right', margin: '1rem 0' }}>
                Total: {formatINR(total)}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={cart.length === 0}>
                {editingId ? 'Save Changes' : `Complete Sale (${cart.length} item${cart.length !== 1 ? 's' : ''})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
