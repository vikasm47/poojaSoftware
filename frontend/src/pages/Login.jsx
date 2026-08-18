import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api/client';

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
          <span className="login-icon">🪔</span>
          <h1>Pooja Shop Manager</h1>
          <p>Inventory & Business Management</p>
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
        .login-card { max-width: 400px; width: 100%; }
        .login-header { text-align: center; margin-bottom: 1.5rem; }
        .login-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
        .login-header h1 { font-size: 1.5rem; color: var(--text); }
        .login-header p { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}
