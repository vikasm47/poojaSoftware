import { useEffect, useRef, useState } from 'react';
import { api, formatINR, formatDateTime } from '../api/client';
import MultiItemPicker from '../components/MultiItemPicker';

const EMPTY_FORM = { item_id: '', qty: '', cost_price_at_purchase: '', supplier: '' };

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [cart, setCart] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const receiptInputRef = useRef(null);
  const editReceiptRef = useRef(null);

  function load() {
    api.getItems().then(setItems);
    api.getPurchases().then(setPurchases);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setCart([]);
    setSupplier('');
    setReceiptFile(null);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  async function openEdit(purchaseId) {
    setError('');
    try {
      const purchase = await api.getPurchase(purchaseId);
      setEditingId(purchase.id);
      setForm({
        item_id: String(purchase.item_id),
        qty: purchase.qty,
        cost_price_at_purchase: purchase.cost_price_at_purchase,
        supplier: purchase.supplier || '',
      });
      setShowForm(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBulkSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) { setError('Add at least one item'); return; }
    setError('');
    try {
      await api.createPurchase({
        items: cart.map((c) => ({
          item_id: c.item_id,
          qty: c.qty,
          cost_price_at_purchase: c.cost,
        })),
        supplier: supplier || undefined,
      }, receiptFile);
      setSuccess(`Purchase recorded — ${cart.length} item(s) added to stock!`);
      resetForm();
      setShowForm(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.updatePurchase(editingId, {
        item_id: parseInt(form.item_id, 10),
        qty: parseFloat(form.qty),
        cost_price_at_purchase: parseFloat(form.cost_price_at_purchase) || undefined,
        supplier: form.supplier || undefined,
      });
      const receipt = editReceiptRef.current?.files?.[0];
      if (receipt) {
        await api.uploadPurchaseReceipt(editingId, receipt);
      }
      setSuccess('Purchase updated successfully!');
      resetForm();
      setShowForm(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(purchase) {
    if (!confirm(`Delete this purchase (${purchase.item_name}, ${purchase.qty} ${purchase.unit})? Stock will be reduced.`)) return;
    setError('');
    try {
      await api.deletePurchase(purchase.id);
      setSuccess('Purchase deleted and stock adjusted.');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function attachReceipt(purchaseId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setError('');
      try {
        await api.uploadPurchaseReceipt(purchaseId, file);
        setSuccess('Receipt attached!');
        load();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    };
    input.click();
  }

  function onItemSelect(itemId) {
    const item = items.find((i) => i.id === parseInt(itemId, 10));
    setForm({
      ...form,
      item_id: itemId,
      cost_price_at_purchase: item ? item.cost_price : form.cost_price_at_purchase,
      supplier: item?.supplier || form.supplier,
    });
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.cost * c.qty), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Record multiple items and attach purchase receipts</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Record Purchase
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && !showForm && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h2 className="card-title">Purchase History</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Cost/Unit</th>
                <th>Supplier</th>
                <th>Total</th>
                <th>Receipt</th>
                <th>Actions</th>
              </tr>
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
                  <td>
                    {p.receipt_path ? (
                      <a href={p.receipt_path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View</a>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => attachReceipt(p.id)}>Attach</button>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p.id)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {purchases.length === 0 && <div className="empty-state">No purchases recorded yet</div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className={`modal ${editingId ? '' : 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? 'Edit Purchase' : 'Record Purchase — Multiple Items'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); resetForm(); }}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}

            {editingId ? (
              <form onSubmit={handleEditSubmit}>
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
                <div className="form-group">
                  <label className="label">Purchase Receipt</label>
                  <input ref={editReceiptRef} className="input" type="file" accept="image/*,.pdf" />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    JPG, PNG, PDF, or WebP — max 10 MB
                  </p>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Changes</button>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit}>
                <MultiItemPicker
                  mode="purchase"
                  items={items}
                  cart={cart}
                  onCartChange={setCart}
                />

                <div className="form-group">
                  <label className="label">Supplier (applies to all items)</label>
                  <input className="input" value={supplier} placeholder="Optional — same supplier for this bill"
                    onChange={(e) => setSupplier(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="label">Purchase Receipt</label>
                  <input
                    ref={receiptInputRef}
                    className="input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Attach bill or receipt photo (JPG, PNG, PDF) — saved with all items in this purchase
                  </p>
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'right', margin: '1rem 0' }}>
                  Total: {formatINR(cartTotal)}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={cart.length === 0}>
                  Record Purchase ({cart.length} item{cart.length !== 1 ? 's' : ''})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
