import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProjector, levelColor, latestReadingByAsset, villagesOf, smoothTowards, hubAsset } from '../src/geo.js';

const rampur = [
  { latitude: 26.8467, longitude: 80.9462 },
  { latitude: 26.852, longitude: 80.951 },
  { latitude: 26.841, longitude: 80.942 }
];

test('projector puts the centre of the village at the origin', () => {
  const project = makeProjector(rampur);
  const lat = rampur.reduce((s, p) => s + p.latitude, 0) / 3;
  const lng = rampur.reduce((s, p) => s + p.longitude, 0) / 3;
  const { x, z } = project(lat, lng);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(z) < 1e-9);
});

test('north is -z and east is +x, at about 4 metres per unit', () => {
  const project = makeProjector(rampur, 4);
  const base = project(26.8467, 80.9462);
  const north = project(26.8467 + 0.001, 80.9462); // ~110 m north
  const east = project(26.8467, 80.9462 + 0.001); // ~99 m east
  assert.ok(north.z < base.z);
  assert.ok(Math.abs(base.z - north.z - 110.54 / 4) < 0.5);
  assert.ok(east.x > base.x);
  assert.ok(Math.abs(east.x - base.x - 99.3 / 4) < 0.5);
});

test('levelColor matches the backend thresholds', () => {
  assert.equal(levelColor(15.5), 0xef4444);
  assert.equal(levelColor(19.99), 0xef4444);
  assert.equal(levelColor(20), 0xf59e0b);
  assert.equal(levelColor(72), 0x22c55e);
  assert.equal(levelColor(null), 0x94a3b8);
});

test('latestReadingByAsset keeps only the newest reading per asset', () => {
  const latest = latestReadingByAsset([
    { assetId: 1, waterLevel: 10, recordedAt: '2026-01-01T10:00:00Z' },
    { assetId: 1, waterLevel: 80, recordedAt: '2026-01-01T12:00:00Z' },
    { assetId: 2, waterLevel: 50, recordedAt: '2026-01-01T09:00:00Z' }
  ]);
  assert.equal(latest.get(1).waterLevel, 80);
  assert.equal(latest.size, 2);
});

test('smoothTowards is frame-rate independent', () => {
  let a = 0;
  for (let i = 0; i < 30; i += 1) a = smoothTowards(a, 100, 3, 1 / 30); // 30 FPS for 1 s
  let b = 0;
  for (let i = 0; i < 144; i += 1) b = smoothTowards(b, 100, 3, 1 / 144); // 144 FPS for 1 s
  assert.ok(Math.abs(a - b) < 1e-6);
});

test('villagesOf and hubAsset', () => {
  const assets = [
    { id: 2, type: 'pump', village: 'Rampur' },
    { id: 1, type: 'tank', village: 'Rampur' },
    { id: 3, type: 'tank', village: 'Lakhanpur' }
  ];
  assert.deepEqual(villagesOf(assets), ['Lakhanpur', 'Rampur']);
  assert.equal(hubAsset(assets).id, 1);
});
