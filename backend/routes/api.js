const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboard');
const assetsRoutes = require('./assets');
const complaintsRoutes = require('./complaints');
const sensorsRoutes = require('./sensors');
const alertsRoutes = require('./alerts');
const analyticsRoutes = require('./analytics');
const farmerRoutes = require('./farmer');
const authRoutes = require('./auth');

router.get('/', (req, res) => {
  res.json({
    name: 'JalNavigator REST API',
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    basePath: '/api/v1 (alias: /api)',
    endpoints: [
      { method: 'GET', path: '/api', description: 'API health and endpoint directory' },
      { method: 'POST', path: '/api/auth/login', description: 'Staff login: returns an access token and sets a refresh cookie' },
      { method: 'POST', path: '/api/auth/refresh', description: 'Get a new access token using the refresh cookie' },
      { method: 'POST', path: '/api/auth/logout', description: 'Log out and revoke the refresh token' },
      { method: 'GET', path: '/api/auth/me', description: 'Current logged-in user (needs token)' },
      { method: 'GET', path: '/api/dashboard', description: 'Summary statistics for assets, complaints, and alerts' },
      { method: 'GET', path: '/api/assets', description: 'List assets with filters (type, village, status), sorting (sort, order) and pagination (page, limit)' },
      { method: 'GET', path: '/api/assets/:id', description: 'One asset with its latest readings and open alerts' },
      { method: 'POST', path: '/api/assets', description: 'Register a new asset (admin or operator)' },
      { method: 'PUT', path: '/api/assets/:id', description: 'Update an asset (admin, or operator of that village)' },
      { method: 'DELETE', path: '/api/assets/:id', description: 'Delete an asset (admin only)' },
      { method: 'GET', path: '/api/complaints', description: 'List complaints with optional status filter (staff only)' },
      { method: 'POST', path: '/api/complaints', description: 'Register a new citizen grievance complaint' },
      { method: 'PUT', path: '/api/complaints/:id', description: 'Update complaint status (staff only)' },
      { method: 'GET', path: '/api/sensors', description: 'Fetch latest sensor telemetry readings' },
      { method: 'POST', path: '/api/sensors/simulate', description: 'Generate simulated sensor readings and threshold alerts (staff only)' },
      { method: 'GET', path: '/api/alerts', description: 'List active and resolved alerts' },
      { method: 'PUT', path: '/api/alerts/:id', description: 'Update alert status (staff only)' },
      { method: 'GET', path: '/api/analytics', description: 'Analytics endpoint directory' },
      { method: 'GET', path: '/api/analytics/summary', description: 'Counts of assets, complaints and alerts grouped by type, status and category' },
      { method: 'GET', path: '/api/analytics/readings', description: 'Per-asset telemetry minimum, average and maximum (optional ?days= and ?assetId=)' },
      { method: 'GET', path: '/api/analytics/villages', description: 'Per-village asset health and open alert counts' },
      { method: 'GET', path: '/api/analytics/trends', description: 'Daily alerts, complaints and readings for the last N days (?days=, default 7)' },
      { method: 'GET', path: '/api/farmer', description: 'Farmer API directory and supported languages' },
      { method: 'GET', path: '/api/farmer/villages', description: 'List villages with water supply status' },
      { method: 'GET', path: '/api/farmer/villages/:name', description: 'Get village water points and supply status' },
      { method: 'GET', path: '/api/farmer/nearby', description: 'Find nearest operational drinking water points' },
      { method: 'POST', path: '/api/farmer/complaints', description: 'Submit a citizen grievance with tracking code' },
      { method: 'GET', path: '/api/farmer/complaints/:id', description: 'Track citizen grievance status using tracking token' }
    ]
  });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/assets', assetsRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/sensors', sensorsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/farmer', farmerRoutes);

module.exports = router;

