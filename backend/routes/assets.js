const express = require('express');
const router = express.Router();
const prisma = require('../database');
const { HttpError } = require('../middleware/errorHandler');
const { requireAuth, requireRole, assertCanManageVillage } = require('../middleware/auth');
const v = require('../utils/validate');

const SORT_FIELDS = ['id', 'name', 'village', 'type', 'status'];

// GET /api/v1/assets?type=&village=&status=&sort=&order=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { type, village, status, sort = 'id', order = 'desc' } = req.query;
    const where = {};
    if (type !== undefined) where.type = v.oneOf(type, v.ASSET_TYPES, 'type');
    if (status !== undefined) where.status = v.oneOf(status, v.ASSET_STATUSES, 'status');
    if (village !== undefined) where.village = { equals: v.text(village, 'village', { max: 80 }), mode: 'insensitive' };
    const sortField = v.oneOf(sort, SORT_FIELDS, 'sort');
    const sortOrder = v.oneOf(order, ['asc', 'desc'], 'order');
    const { page, limit, skip } = v.pagination(req.query);

    const [total, data] = await prisma.$transaction([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        orderBy: [{ [sortField]: sortOrder }, { id: sortOrder }],
        skip,
        take: limit
      })
    ]);
    res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/assets/:id - one asset with its 5 latest readings and open alerts
router.get('/:id', async (req, res, next) => {
  try {
    const id = v.parseId(req.params.id);
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        sensorReadings: {
          select: { waterLevel: true, flowRate: true, pressure: true, recordedAt: true },
          orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
          take: 5
        },
        alerts: {
          where: { status: 'Open' },
          select: { id: true, message: true, severity: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!asset) throw new HttpError(404, `Asset ${id} not found`);
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

function readAsset(body, partial) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Send the asset as a JSON object');
  const data = {};
  if (!partial || body.name !== undefined) data.name = v.text(body.name, 'name');
  if (!partial || body.latitude !== undefined) data.latitude = v.coordinate(body.latitude, 90, 'latitude');
  if (!partial || body.longitude !== undefined) data.longitude = v.coordinate(body.longitude, 180, 'longitude');
  if (body.type !== undefined) data.type = v.oneOf(body.type, v.ASSET_TYPES, 'type');
  else if (!partial) data.type = 'tank';
  if (body.status !== undefined) data.status = v.oneOf(body.status, v.ASSET_STATUSES, 'status');
  else if (!partial) data.status = 'Operational';
  if (body.village !== undefined) data.village = v.text(body.village, 'village', { max: 80 });
  return data;
}

router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const data = readAsset(req.body, false);
    if (req.user.role === 'operator') {
      data.village = data.village || req.user.village;
      assertCanManageVillage(req.user, data.village);
    }
    if (!data.village) throw new HttpError(400, 'village is required');
    const asset = await prisma.asset.create({ data });
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const id = v.parseId(req.params.id);
    const data = readAsset(req.body, true);
    const existing = await prisma.asset.findUnique({ where: { id }, select: { village: true } });
    if (!existing) throw new HttpError(404, `Asset ${id} not found`);
    assertCanManageVillage(req.user, existing.village);
    if (data.village !== undefined) assertCanManageVillage(req.user, data.village);
    const asset = await prisma.asset.update({ where: { id }, data });
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const id = v.parseId(req.params.id);
    await prisma.$transaction([
      prisma.alert.deleteMany({ where: { assetId: id } }),
      prisma.sensorReading.deleteMany({ where: { assetId: id } }),
      prisma.asset.delete({ where: { id } })
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
