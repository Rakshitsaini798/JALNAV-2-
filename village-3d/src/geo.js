// Pure helper functions (no Three.js), so they can be unit-tested with Node.

const METERS_PER_DEG_LAT = 110540;
const METERS_PER_DEG_LNG_AT_EQUATOR = 111320;

// Converts real latitude/longitude into scene coordinates (x = east, z = south),
// centred on the middle of the given points. 1 scene unit = metersPerUnit metres.
export function makeProjector(points, metersPerUnit = 4) {
  if (!points.length) return () => ({ x: 0, z: 0 });
  const center = {
    lat: points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.longitude, 0) / points.length
  };
  const lngScale = METERS_PER_DEG_LNG_AT_EQUATOR * Math.cos((center.lat * Math.PI) / 180);
  return (lat, lng) => ({
    x: ((lng - center.lng) * lngScale) / metersPerUnit,
    z: (-(lat - center.lat) * METERS_PER_DEG_LAT) / metersPerUnit
  });
}

// Same thresholds as the backend: below 20% is critical.
export function levelColor(level) {
  if (level === null || level === undefined) return 0x94a3b8;
  if (level < 20) return 0xef4444;
  if (level < 50) return 0xf59e0b;
  return 0x22c55e;
}

export function latestReadingByAsset(readings) {
  const latest = new Map();
  for (const reading of readings) {
    const current = latest.get(reading.assetId);
    if (!current || new Date(reading.recordedAt) > new Date(current.recordedAt)) {
      latest.set(reading.assetId, reading);
    }
  }
  return latest;
}

export function villagesOf(assets) {
  return [...new Set(assets.map((a) => a.village).filter(Boolean))].sort();
}

// Frame-rate independent smoothing: moves `current` towards `target` at the same speed at 30 or 144 FPS.
export function smoothTowards(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}

// Picks the main tank of a village: the one other assets are piped to.
export function hubAsset(assets) {
  return assets.find((a) => a.type === 'tank') || assets[0] || null;
}
