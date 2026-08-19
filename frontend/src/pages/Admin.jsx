import { useEffect, useState } from 'react';
import { api } from '../api/client';

const DEFAULT_AI_MODELS = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (recommended)' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
];

function formatAdminError(message) {
  if (message === 'Not Found') {
    return 'Admin API is unavailable. Close any dev backend (npm run dev:backend), fully quit VIMMS, and open it again.';
  }
  return message;
}

export default function Admin() {
  const [tab, setTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [aiSettings, setAiSettings] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function loadCategories() {
    api.getAdminCategories().then(setCategories).catch((e) => setError(formatAdminError(e.message)));
  }

  function loadAiSettings() {
    api.getAiSettings().then((data) => {
      setAiSettings(data);
      setModel(data.model || 'gemini-3.6-flash');
    }).catch((e) => setError(formatAdminError(e.message)));
  }

  useEffect(() => {
    loadCategories();
    loadAiSettings();
  }, []);

  async function handleAddCategory(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createCategory(newCategory);
      setNewCategory('');
      setMessage('Category added!');
      loadCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(formatAdminError(err.message));
    }
  }

  async function handleSaveEdit(id) {
    setError('');
    try {
      await api.updateCategory(id, editingName);
      setEditingId(null);
      setMessage('Category updated!');
      loadCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(formatAdminError(err.message));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this category?')) return;
    setError('');
    try {
      await api.deleteCategory(id);
      setMessage('Category deleted!');
      loadCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(formatAdminError(err.message));
    }
  }

  async function handleSaveAi(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { model };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const updated = await api.saveAiSettings(payload);
      setAiSettings(updated);
      setApiKey('');
      setMessage('AI settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(formatAdminError(err.message));
    }
  }

  const modelOptions = aiSettings?.models?.length ? aiSettings.models : DEFAULT_AI_MODELS;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Manage categories, AI configuration, and shop settings</p>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'categories', label: 'Categories' },
          { id: 'ai', label: 'AI Settings' },
        ].map((t) => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="grid grid-2">
          <div className="card">
            <h2 className="card-title">Add Category</h2>
            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label className="label">Category Name</label>
                <input className="input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Candles, Flowers, Books" required />
              </div>
              <button type="submit" className="btn btn-primary">Add Category</button>
            </form>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Categories appear in Inventory when adding items. Renaming updates all items in that category.
            </p>
          </div>

          <div className="card">
            <h2 className="card-title">All Categories</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Items</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        {editingId === cat.id ? (
                          <input className="input" value={editingName}
                            onChange={(e) => setEditingName(e.target.value)} />
                        ) : cat.name}
                      </td>
                      <td>{cat.item_count || 0}</td>
                      <td>
                        {editingId === cat.id ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(cat.id)}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {categories.length === 0 && <div className="empty-state">No categories yet</div>}
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h2 className="card-title">Google AI Settings</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Powers the AI Business Advisor. Get a free API key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
          </p>

          {aiSettings?.hasApiKey && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              API key configured ({aiSettings.apiKeyMasked}) — source: {aiSettings.source}
            </div>
          )}

          <form onSubmit={handleSaveAi}>
            <div className="form-group">
              <label className="label">Google API Key</label>
              <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder={aiSettings?.hasApiKey ? 'Leave blank to keep current key' : 'AIza...'} />
            </div>
            <div className="form-group">
              <label className="label">AI Model</label>
              <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
                {modelOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Save AI Settings</button>
          </form>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            Supported models: Gemini 3.6 Flash, 3.5 Flash, and 3.5 Flash Lite. Change model if one is unavailable in your region.
          </p>
        </div>
      )}
    </div>
  );
}
