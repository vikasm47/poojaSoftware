import { useEffect, useState } from 'react';
import { api, downloadWithAuth } from '../api/client';

export default function Settings() {
  const [shop, setShop] = useState({ name: '', address: '', phone: '' });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getShop().then(setShop).catch(console.error);
  }, []);

  async function saveShop(e) {
    e.preventDefault();
    try {
      const updated = await api.updateShop(shop);
      setShop(updated);
      localStorage.setItem('shop', JSON.stringify(updated));
      setMessage('Shop details saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePin(e) {
    e.preventDefault();
    setError('');
    try {
      await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(pinForm),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error);
      });
      setMessage('PIN changed successfully!');
      setPinForm({ currentPin: '', newPin: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  function backupData() {
    downloadWithAuth(api.backupUrl(), 'pooja-shop-backup.db');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Shop details, security, and data backup</p>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">Shop Details</h2>
          <form onSubmit={saveShop}>
            <div className="form-group">
              <label className="label">Shop Name</label>
              <input className="input" value={shop.name || ''} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Address</label>
              <textarea className="textarea" rows={2} value={shop.address || ''} onChange={(e) => setShop({ ...shop, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" value={shop.phone || ''} onChange={(e) => setShop({ ...shop, phone: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">Save Details</button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">Change PIN</h2>
          <form onSubmit={changePin}>
            <div className="form-group">
              <label className="label">Current PIN</label>
              <input className="input" type="password" value={pinForm.currentPin}
                onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">New PIN</label>
              <input className="input" type="password" value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })} required minLength={4} />
            </div>
            <button type="submit" className="btn btn-primary">Update PIN</button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">Data Backup</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Download a backup of your entire shop database. Store it safely on USB or cloud storage.
          </p>
          <button className="btn btn-secondary" onClick={backupData}>Download Backup (.db)</button>
        </div>

        <div className="card">
          <h2 className="card-title">About</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Pooja Shop Manager v1.0<br />
            API-first architecture — ready for mobile app and website in future phases.<br />
            Default login PIN: 1234 (change it above)
          </p>
        </div>
      </div>
    </div>
  );
}
