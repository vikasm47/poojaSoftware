import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<Sales />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="reports" element={<Reports />} />
          <Route path="advisor" element={<Advisor />} />
          <Route path="admin" element={<Admin />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
