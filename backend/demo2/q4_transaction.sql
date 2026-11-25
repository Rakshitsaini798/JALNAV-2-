\set QUIET on
\pset pager off
\pset footer off
SELECT count(*) AS complaints_before FROM "Complaint";
BEGIN;
INSERT INTO "Complaint"(title,category,description) VALUES ('No water supply - Rampur','No water supply','No water for two days');
INSERT INTO "FarmerComplaintAccess"("complaintId",token) VALUES (999999,'demo-token');
COMMIT;
SELECT count(*) AS complaints_after FROM "Complaint";
