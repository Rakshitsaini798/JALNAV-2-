\set QUIET on
\pset pager off
\echo '##### LOCAL DATABASE ONLY: adding 200,000 fake readings. Run once, before recording. #####'
INSERT INTO "SensorReading"("assetId","waterLevel","flowRate","pressure","recordedAt")
SELECT (SELECT MIN(id) FROM "Asset") + (g % 5), random()*100, random()*25, random()*3.5, now() - (g || ' seconds')::interval
FROM generate_series(1, 200000) g
WHERE EXISTS (SELECT 1 FROM "Asset" WHERE id = (SELECT MIN(id) FROM "Asset") + (g % 5));
ANALYZE "SensorReading";
\echo '##### Done. #####'
