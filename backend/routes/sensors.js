const express = require('express');
const router = express.Router();
const prisma = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');

router.get('/', async (req, res, next) => {
  try {
    const readings = await prisma.sensorReading.findMany({
      take: 50,
      orderBy: { recordedAt: 'desc' },
      include: { asset: { select: { id: true, name: true, village: true, type: true } } }
    });
    res.json(readings);
  } catch (err) {
    next(err);
  }
});

router.post('/simulate', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    let targetAsset = null;
    const body = req.body || {};
    if (body.assetId !== undefined) {
      const id = Number(body.assetId);
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'assetId must be a positive integer');
      targetAsset = await prisma.asset.findUnique({ where: { id } });
      if (!targetAsset) throw new HttpError(404, `Asset ${id} not found`);
    }
    if (!targetAsset) {
      targetAsset = await prisma.asset.findFirst({
        orderBy: { id: 'asc' }
      });
    }
    if (!targetAsset) {
      return res.status(400).json({ error: 'No assets available for simulation. Please register an asset first.' });
    }

    const waterLevel = +(Math.random() * 100).toFixed(1);
    const flowRate = +(Math.random() * 25).toFixed(1);
    const pressure = +(Math.random() * 3.5).toFixed(1);

    const assetSummary = { select: { id: true, name: true, village: true, type: true } };
    // The reading and its alert are saved in one transaction: both or neither.
    const { reading, generatedAlert } = await prisma.$transaction(async (tx) => {
      const reading = await tx.sensorReading.create({
        data: { assetId: targetAsset.id, waterLevel, flowRate, pressure },
        include: { asset: assetSummary }
      });
      let generatedAlert = null;
      if (waterLevel < 20) {
        generatedAlert = await tx.alert.create({
          data: {
            assetId: targetAsset.id,
            message: `Critical low water level (${waterLevel}%) detected at ${targetAsset.name}`,
            severity: 'Critical',
            status: 'Open'
          },
          include: { asset: assetSummary }
        });
      }
      return { reading, generatedAlert };
    });

    res.status(201).json({ reading, alert: generatedAlert });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
