\set QUIET on
\pset pager off
\pset footer off
SELECT count(*) AS total_readings FROM "SensorReading";
\echo '##### Latest reading for one asset #####'
EXPLAIN ANALYZE SELECT "waterLevel","recordedAt" FROM "SensorReading"
WHERE "assetId" = (SELECT MIN(id) FROM "Asset") ORDER BY "recordedAt" DESC, id DESC LIMIT 1;
