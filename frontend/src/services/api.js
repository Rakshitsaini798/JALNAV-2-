const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// The access token lives only in memory (not localStorage), so a script injected into the page can't read it later.
// The refresh token is in an httpOnly cookie that JavaScript can't see at all.
let accessToken = null;
let currentUser = null;
const listeners = new Set();

function setSession(session) {
  accessToken = session ? session.accessToken : null;
  currentUser = session ? session.user : null;
  listeners.forEach((listener) => listener(currentUser));
}

async function refreshSession() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    setSession(null);
    return false;
  }
  setSession(await res.json());
  return true;
}

async function request(endpoint = '', options = {}, retry = true) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: 'include' });

  // Access token expired: get a new one with the refresh cookie and try once more.
  if (res.status === 401 && retry && accessToken && (await refreshSession())) {
    return request(endpoint, options, false);
  }
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const withQuery = (path, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `${path}${query ? `?${query}` : ''}`;
};

export const api = {
  // Session
  onUserChange: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  restoreSession: () => refreshSession().catch(() => false),
  login: async (email, password) => {
    const session = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    setSession(session);
    return session.user;
  },
  logout: async () => {
    await request('/auth/logout', { method: 'POST' }, false).catch(() => null);
    setSession(null);
  },

  getInfo: () => request(''),
  getDashboard: () => request('/dashboard'),
  getAssets: async (params = {}) => {
    const page = await request(withQuery('/assets', { limit: 500, ...params }));
    return page.data;
  },
  createAsset: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
  getComplaints: (params = {}) => request(withQuery('/complaints', params)),
  createComplaint: (data) => request('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  updateComplaintStatus: (id, status) =>
    request(`/complaints/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getSensors: () => request('/sensors'),
  simulateSensor: (data = {}) => request('/sensors/simulate', { method: 'POST', body: JSON.stringify(data) }),
  getAlerts: () => request('/alerts'),
  updateAlertStatus: (id, status) => request(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
};

export default api;
