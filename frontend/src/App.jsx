import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, getToken } from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
import License from './pages/License';
import LicensePage from './pages/LicensePage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import Advisor from './pages/Advisor';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function LicensedRoute({ children }) {
  const [ready, setReady] = useState(false);
  const [licensed, setLicensed] = useState(false);

  useEffect(() => {
    api.getLicenseStatus()
      .then((status) => setLicensed(Boolean(status.valid)))
      .catch(() => setLicensed(false))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!licensed) return <Navigate to="/activate" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/activate" element={<License />} />
        <Route path="/login" element={
          <LicensedRoute><Login /></LicensedRoute>
        } />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<Sales />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="reports" element={<Reports />} />
          <Route path="advisor" element={<Advisor />} />
          <Route path="admin" element={<Admin />} />
          <Route path="license" element={<LicensePage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
