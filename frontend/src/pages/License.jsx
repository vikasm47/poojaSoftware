import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE } from '../config/branding';

export default function License() {
  const [licenseKey, setLicenseKey] = useState('');
  const [machineId, setMachineId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getLicenseStatus()
      .then((status) => {
        setMachineId(status.machineId || '');
        if (status.valid) navigate('/login', { replace: true });
      })
      .catch(() => setError('Could not check license status. Is the app running?'))
      .finally(() => setChecking(false));
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.activateLicense(licenseKey.trim());
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="login-page">
        <div className="login-card card">
          <div className="empty-state">Checking license...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <img src="/logo.png" alt={APP_NAME} className="login-logo" />
          <h1>{APP_NAME}</h1>
          <p className="login-full-name">{APP_FULL_NAME}</p>
          <p className="login-tagline">{APP_TAGLINE}</p>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Enter your license key to activate VIMMS on this computer. The key works only on this machine.
        </p>

        {machineId && (
          <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
            <strong>Machine ID:</strong> {machineId}
            <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
              Share this ID only when requesting a new license key.
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
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
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Activating...' : 'Activate License'}
          </button>
        </form>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #faf7f2 0%, #f4e4d4 100%);
          padding: 1rem;
        }
        .login-card { max-width: 480px; width: 100%; }
        .login-header { text-align: center; margin-bottom: 1.5rem; }
        .login-logo { width: 88px; height: 88px; border-radius: 18px; margin-bottom: 0.75rem; box-shadow: 0 4px 16px rgba(196, 92, 38, 0.2); }
        .login-header h1 { font-size: 2rem; font-weight: 800; color: var(--primary); letter-spacing: 0.04em; }
        .login-full-name { color: var(--text); font-size: 0.85rem; font-weight: 500; margin-top: 0.35rem; line-height: 1.4; }
        .login-tagline { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}
