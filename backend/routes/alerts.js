const express = require('express');
const router = express.Router();
const prisma = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const v = require('../utils/validate');

const ASSET_SUMMARY = { select: { id: true, name: true, village: true, type: true } };

router.get('/', async (req, res, next) => {
  try {
    const { limit, skip } = v.pagination(req.query, { defaultLimit: 100, maxLimit: 500 });
    // One query for alerts + one batched query for their assets (no query per alert),
    // and only the asset fields the UI needs.
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { asset: ASSET_SUMMARY }
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const id = v.parseId(req.params.id);
    const status = (req.body || {}).status === undefined ? 'Resolved' : v.oneOf(req.body.status, v.ALERT_STATUSES, 'status');
    const alert = await prisma.alert.update({ where: { id }, data: { status }, include: { asset: ASSET_SUMMARY } });
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
