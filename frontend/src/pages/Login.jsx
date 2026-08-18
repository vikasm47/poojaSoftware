import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api/client';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE } from '../config/branding';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(pin);
      setAuth(data.token, data.shop);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Enter PIN to login</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Default PIN: 1234"
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
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
        .login-card { max-width: 420px; width: 100%; }
        .login-header { text-align: center; margin-bottom: 1.5rem; }
        .login-logo { width: 88px; height: 88px; border-radius: 18px; margin-bottom: 0.75rem; box-shadow: 0 4px 16px rgba(196, 92, 38, 0.2); }
        .login-header h1 { font-size: 2rem; font-weight: 800; color: var(--primary); letter-spacing: 0.04em; }
        .login-full-name { color: var(--text); font-size: 0.85rem; font-weight: 500; margin-top: 0.35rem; line-height: 1.4; }
        .login-tagline { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}
