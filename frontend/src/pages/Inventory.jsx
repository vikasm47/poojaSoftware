import { useEffect, useState } from 'react';
import { api, formatINR } from '../api/client';

const EMPTY = {
  name: '', category: 'Diyas', sku: '', cost_price: '', selling_price: '',
  stock_qty: '', unit: 'piece', reorder_threshold: '5', supplier: '', supplier_contact: '',
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', stock_status: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  function load() {
    api.getItems(filters).then(setItems).catch(console.error);
  }

  useEffect(() => { api.getCategories().then(setCategories); }, []);
  useEffect(() => { load(); }, [filters]);

  function openAdd() {
    setForm(EMPTY);
    setModal('add');
    setError('');
  }

  function openEdit(item) {
    setForm({ ...item, cost_price: item.cost_price, selling_price: item.selling_price });
    setModal('edit');
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'add') {
        await api.createItem(form);
      } else {
        await api.updateItem(form.id, form);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return;
    await api.deleteItem(id);
    load();
  }

  async function handleImport() {
    try {
      const lines = importText.trim().split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h.replace(/ /g, '_')] = vals[i]; });
        return obj;
      });
      const result = await api.bulkImport(rows);
      alert(`Imported ${result.imported} items. ${result.errors.length} errors.`);
      setShowImport(false);
      setImportText('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage your shop items and stock levels</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>Import CSV</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Item</button>
        </div>
      </div>

      <div className="filters">
        <input className="input" placeholder="Search items..." value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="select" value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={filters.stock_status}
          onChange={(e) => setFilters({ ...filters, stock_status: e.target.value })}>
          <option value="">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th><th>Name</th><th>Category</th><th>Stock</th>
                <th>Cost</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.stock_qty} {item.unit}</td>
                  <td>{formatINR(item.cost_price)}</td>
                  <td>{formatINR(item.selling_price)}</td>
                  <td><span className={`badge badge-${item.stock_status}`}>{item.stock_status.replace('_', ' ')}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div className="empty-state">No items found</div>}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'add' ? 'Add Item' : 'Edit Item'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">Name *</label>
                  <input className="input" value={form.name} required
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Category *</label>
                  <select className="select" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">SKU</label>
                  <input className="input" value={form.sku} placeholder="Auto-generated if empty"
                    onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Unit</label>
                  <select className="select" value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {['piece', 'packet', 'box', 'kg', 'gram', 'dozen', 'set'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Cost Price (₹)</label>
                  <input className="input" type="number" step="0.01" value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Selling Price (₹)</label>
                  <input className="input" type="number" step="0.01" value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Stock Quantity</label>
                  <input className="input" type="number" step="0.01" value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Reorder Threshold</label>
                  <input className="input" type="number" value={form.reorder_threshold}
                    onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Supplier</label>
                  <input className="input" value={form.supplier || ''}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Supplier Contact</label>
                  <input className="input" value={form.supplier_contact || ''}
                    onChange={(e) => setForm({ ...form, supplier_contact: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Save Item</button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">Bulk Import (CSV)</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Paste CSV with headers: name, category, cost_price, selling_price, stock_qty, unit, reorder_threshold, supplier
            </p>
            <textarea className="textarea" rows={8} value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="name,category,cost_price,selling_price,stock_qty&#10;Brass Diya,Diyas,45,80,50" />
            <button className="btn btn-primary" onClick={handleImport} style={{ marginTop: '1rem' }}>Import Items</button>
          </div>
        </div>
      )}
    </div>
  );
}
