\set QUIET on
\pset pager off
\set ON_ERROR_ROLLBACK on
\pset footer off
BEGIN;
\echo '##### 1. FOREIGN KEY: reading for an asset that does not exist #####'
INSERT INTO "SensorReading"("assetId","waterLevel","flowRate","pressure") VALUES (999999, 50, 10, 2);
\echo '##### 2. NOT NULL: asset with no name #####'
INSERT INTO "Asset"(name,type,latitude,longitude,status,village) VALUES (NULL,'tank',26.8,80.9,'Operational','Rampur');
\echo '##### 3. RESTRICT: delete an asset that still has readings #####'
DELETE FROM "Asset" WHERE id = (SELECT "assetId" FROM "SensorReading" LIMIT 1);
\echo '##### 4. UNIQUE: reuse the same Idempotency-Key #####'
INSERT INTO "Complaint"(title,category,description) VALUES ('Demo A','Other','demo complaint A');
INSERT INTO "FarmerComplaintAccess"("complaintId",token,"idempotencyKey") VALUES (currval('"Complaint_id_seq"'),'t1','video-demo-key-0001');
INSERT INTO "Complaint"(title,category,description) VALUES ('Demo B','Other','demo complaint B');
INSERT INTO "FarmerComplaintAccess"("complaintId",token,"idempotencyKey") VALUES (currval('"Complaint_id_seq"'),'t2','video-demo-key-0001');
ROLLBACK;
\echo '##### All rolled back. Nothing changed. #####'
