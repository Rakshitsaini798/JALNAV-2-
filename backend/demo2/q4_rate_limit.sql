\set QUIET on
\pset pager off
\set ON_ERROR_ROLLBACK on
\pset footer off
BEGIN;
\echo '##### Same request twice: counter goes 1, then 2 #####'
INSERT INTO "FarmerRateLimit"("key","count","resetAt") VALUES ('video-demo-ip',1, now() + interval '15 min')
ON CONFLICT ("key") DO UPDATE SET "count" = "FarmerRateLimit"."count" + 1 RETURNING "key","count";
INSERT INTO "FarmerRateLimit"("key","count","resetAt") VALUES ('video-demo-ip',1, now() + interval '15 min')
ON CONFLICT ("key") DO UPDATE SET "count" = "FarmerRateLimit"."count" + 1 RETURNING "key","count";
ROLLBACK;
