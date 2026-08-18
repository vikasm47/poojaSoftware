const API_BASE = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('token');
}

export function setAuth(token, shop) {
  localStorage.setItem('token', token);
  if (shop) localStorage.setItem('shop', JSON.stringify(shop));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('shop');
}

export function getShop() {
  try {
    return JSON.parse(localStorage.getItem('shop') || '{}');
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res;
}

export const api = {
  login: (pin) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  getShop: () => request('/api/auth/shop'),
  updateShop: (data) => request('/api/auth/shop', { method: 'PUT', body: JSON.stringify(data) }),

  getItems: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/items${q ? `?${q}` : ''}`);
  },
  getItem: (id) => request(`/api/items/${id}`),
  createItem: (data) => request('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  bulkImport: (items) => request('/api/items/bulk-import', { method: 'POST', body: JSON.stringify({ items }) }),
  getCategories: () => request('/api/items/categories'),
  getLowStock: () => request('/api/items/alerts/low-stock'),

  getSales: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/sales${q ? `?${q}` : ''}`);
  },
  createSale: (data) => request('/api/sales', { method: 'POST', body: JSON.stringify(data) }),

  getPurchases: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/purchases${q ? `?${q}` : ''}`);
  },
  createPurchase: (data) => request('/api/purchases', { method: 'POST', body: JSON.stringify(data) }),

  getDashboard: () => request('/api/reports/dashboard'),
  getReport: (period, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/reports/sales/${period}${q ? `?${q}` : ''}`);
  },
  getInventoryReport: () => request('/api/reports/inventory'),
  getPnl: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/reports/pnl${q ? `?${q}` : ''}`);
  },
  downloadReport: (period, format, params = {}) => {
    const q = new URLSearchParams({ ...params, format }).toString();
    return `${API_BASE}/api/reports/export/sales/${period}?${q}`;
  },
  downloadInventory: (format) => `${API_BASE}/api/reports/export/inventory?format=${format}`,

  getMarketingInsights: (refresh) => request(`/api/advisor/marketing${refresh ? '?refresh=true' : ''}`),
  getInventoryInsights: (refresh) => request(`/api/advisor/inventory${refresh ? '?refresh=true' : ''}`),
  askAdvisor: (question) => request('/api/advisor/ask', { method: 'POST', body: JSON.stringify({ question }) }),

  backupUrl: () => `${API_BASE}/api/backup/export`,
};

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function downloadWithAuth(url, filename) {
  fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    });
}
