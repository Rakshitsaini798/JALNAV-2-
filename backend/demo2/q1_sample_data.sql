\set QUIET on
\pset pager off
\pset footer off
\echo '##### Sample assets #####'
SELECT id, name, type, status, village, latitude, longitude FROM "Asset" ORDER BY id LIMIT 5;
\echo '##### Latest sensor readings #####'
SELECT id, "assetId", ROUND("waterLevel"::numeric,1) AS "waterLevel", ROUND("flowRate"::numeric,1) AS "flowRate", ROUND(pressure::numeric,1) AS pressure, "recordedAt" FROM "SensorReading" ORDER BY "recordedAt" DESC LIMIT 3;
