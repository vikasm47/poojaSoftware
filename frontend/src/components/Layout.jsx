import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, clearAuth, getShop } from '../api/client';
import { APP_NAME, APP_TAGLINE } from '../config/branding';
import './Layout.css';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/sales', label: 'Sales', icon: '💰' },
  { to: '/purchases', label: 'Purchases', icon: '🛒' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/advisor', label: 'AI Advisor', icon: '✨' },
  { to: '/admin', label: 'Admin', icon: '🛡️' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/license', label: 'License', icon: '🔑' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const navigate = useNavigate();
  const shop = getShop();
  const [licenseValid, setLicenseValid] = useState(true);

  useEffect(() => {
    api.getLicenseStatus()
      .then((status) => setLicenseValid(Boolean(status.valid)))
      .catch(() => setLicenseValid(false));
  }, []);

  function logout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt={APP_NAME} className="brand-logo" />
          <div>
            <div className="brand-name">{shop.name || 'My Shop'}</div>
            <div className="brand-tag">{APP_NAME} · {APP_TAGLINE}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-ghost logout-btn" onClick={logout}>Logout</button>
      </aside>
      <main className="main-content">
        {!licenseValid && (
          <div className="alert alert-error" style={{ margin: '0 0 1rem' }}>
            License not active — <NavLink to="/license" style={{ color: 'inherit', fontWeight: 600 }}>Go to License</NavLink> to activate VIMMS on this computer.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
