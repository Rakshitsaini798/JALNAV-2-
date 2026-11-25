const express = require('express');
const router = express.Router();
const prisma = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createRateLimiter } = require('../utils/rateLimiter');
const v = require('../utils/validate');

const CATEGORIES = ['Pipeline leakage', 'No water supply', 'Dirty water', 'Low water pressure', 'Damaged infrastructure', 'Other'];

const complaintLimiter = createRateLimiter({
  limit: 20,
  windowMs: 15 * 60 * 1000,
  prefix: 'complaint:'
});

// Complaints contain citizens' details, so only staff can list them.
router.get('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status !== undefined) where.status = v.oneOf(req.query.status, v.COMPLAINT_STATUSES, 'status');
    const { limit, skip } = v.pagination(req.query, { defaultLimit: 100, maxLimit: 500 });
    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    res.json(complaints);
  } catch (err) {
    next(err);
  }
});

// Anyone can file a complaint (rate-limited).
router.post('/', complaintLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};
    const hasPoint = body.latitude !== undefined && body.latitude !== null && body.latitude !== '';
    const complaint = await prisma.complaint.create({
      data: {
        title: v.text(body.title, 'title'),
        category: body.category ? v.oneOf(body.category, CATEGORIES, 'category') : 'Other',
        description: v.text(body.description, 'description', { min: 5, max: 500 }),
        latitude: hasPoint ? v.coordinate(body.latitude, 90, 'latitude') : null,
        longitude: hasPoint ? v.coordinate(body.longitude, 180, 'longitude') : null,
        status: 'Pending'
      }
    });
    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const id = v.parseId(req.params.id);
    const status = v.oneOf((req.body || {}).status, v.COMPLAINT_STATUSES, 'status');
    const complaint = await prisma.complaint.update({ where: { id }, data: { status } });
    res.json(complaint);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
