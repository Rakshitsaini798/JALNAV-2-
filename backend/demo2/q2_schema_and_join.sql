\set QUIET on
\pset pager off
\pset footer off
\echo '##### SensorReading table: columns, foreign key, indexes #####'
\d "SensorReading"
\echo '##### JOIN: latest reading for every asset in Rampur #####'
SELECT a.id, a.name, a.status, ROUND(l."waterLevel"::numeric,1) AS "waterLevel", l."recordedAt"
FROM "Asset" a
LEFT JOIN LATERAL (
  SELECT r."waterLevel", r."recordedAt" FROM "SensorReading" r
  WHERE r."assetId" = a.id ORDER BY r."recordedAt" DESC, r.id DESC LIMIT 1
) l ON TRUE
WHERE LOWER(BTRIM(a.village)) = 'rampur'
ORDER BY a.id;
