import { sampleData } from './sample.js';

const BASE = '/api/v1';
let accessToken = null;

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  return res.json();
}

// Loads assets, recent readings and alerts from the local JalNavigator backend.
// Falls back to built-in sample data if the backend isn't running.
export async function loadData() {
  try {
    const [assetPage, readings, alerts] = await Promise.all([
      getJson('/assets?limit=500'),
      getJson('/sensors'),
      getJson('/alerts?limit=500')
    ]);
    return { assets: assetPage.data, readings, alerts, source: 'live' };
  } catch (err) {
    console.warn('[3d] backend not reachable, using sample data:', err.message);
    return { ...sampleData, source: 'sample' };
  }
}

export const isLoggedIn = () => Boolean(accessToken);

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Login failed (${res.status})`);
  accessToken = body.accessToken;
  return body.user;
}

// Asks the backend to generate a new sensor reading for one asset (staff only).
export async function simulateReading(assetId) {
  const res = await fetch(`${BASE}/sensors/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ assetId })
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) accessToken = null;
  if (!res.ok) throw new Error(body.error || `Simulation failed (${res.status})`);
  return body;
}
