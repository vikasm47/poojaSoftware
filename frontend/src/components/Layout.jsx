import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth, getShop } from '../api/client';
import { APP_NAME, APP_TAGLINE } from '../config/branding';
import './Layout.css';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/sales', label: 'Sales', icon: '💰' },
  { to: '/purchases', label: 'Purchases', icon: '🛒' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/advisor', label: 'AI Advisor', icon: '✨' },
  { to: '/admin', label: 'Admin', icon: '🛡️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const navigate = useNavigate();
  const shop = getShop();

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
        <Outlet />
      </main>
    </div>
  );
}
