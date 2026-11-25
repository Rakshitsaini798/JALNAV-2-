// Used only when the backend isn't running, so the 3D view still opens.
export const sampleData = {
  assets: [
    { id: 1, name: 'Rampur Central Overhead Tank', type: 'tank', latitude: 26.8467, longitude: 80.9462, status: 'Operational', village: 'Rampur' },
    { id: 2, name: 'North Ward Borewell', type: 'borewell', latitude: 26.852, longitude: 80.951, status: 'Operational', village: 'Rampur' },
    { id: 3, name: 'South Hamlet Borewell', type: 'borewell', latitude: 26.841, longitude: 80.942, status: 'Maintenance', village: 'Rampur' },
    { id: 4, name: 'Sector 2 Booster Pump', type: 'pump', latitude: 26.849, longitude: 80.944, status: 'Operational', village: 'Rampur' },
    { id: 5, name: 'Village Main Feeder Line', type: 'pipeline', latitude: 26.848, longitude: 80.9485, status: 'Operational', village: 'Rampur' }
  ],
  readings: [
    { assetId: 1, waterLevel: 15.5, flowRate: 14.2, pressure: 1.4, recordedAt: '2026-01-01T00:00:00Z' },
    { assetId: 2, waterLevel: 60, flowRate: 12, pressure: 1.8, recordedAt: '2026-01-01T00:00:00Z' },
    { assetId: 4, waterLevel: 72, flowRate: 18.5, pressure: 2.2, recordedAt: '2026-01-01T00:00:00Z' }
  ],
  alerts: [{ id: 1, assetId: 1, message: 'Critical low water level (15.5%)', severity: 'Critical', status: 'Open' }]
};
