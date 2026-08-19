import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { APP_FULL_NAME, APP_NAME } from '../config/branding';

export default function LicensePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function loadStatus() {
    return api.getLicenseStatus().then(setStatus).catch((e) => setError(e.message));
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleActivate(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await api.activateLicense(licenseKey.trim());
      setStatus(result);
      setLicenseKey('');
      setMessage('License activated successfully! You can use all features now.');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">License</h1>
          <p className="page-subtitle">Activate {APP_NAME} on this computer</p>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">License Status</h2>
          {status?.valid ? (
            <div style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
              <p><span className="badge badge-ok">Active</span></p>
              <p><strong>Licensed to:</strong> {status.holder}</p>
              <p><strong>Edition:</strong> {status.edition || 'standard'}</p>
              <p><strong>Expires:</strong> {status.expiresAt ? status.expiresAt.slice(0, 10) : 'Never'}</p>
            </div>
          ) : (
            <div>
              <p className="badge badge-low_stock" style={{ marginBottom: '1rem' }}>Not activated</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Enter your license key below to unlock {APP_NAME}. Each key works on one computer only.
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Machine ID</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Share this ID when requesting a new license key from {APP_FULL_NAME}.
          </p>
          <div className="input" style={{ fontFamily: 'monospace', fontSize: '0.95rem', background: 'var(--bg)' }}>
            {status?.machineId || 'Loading...'}
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 className="card-title">{status?.valid ? 'Update License' : 'Activate License'}</h2>
          <form onSubmit={handleActivate}>
            <div className="form-group">
              <label className="label">License Key</label>
              <textarea
                className="textarea"
                rows={4}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Paste your VIMMS license key here"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Activating...' : (status?.valid ? 'Update License' : 'Activate License')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
