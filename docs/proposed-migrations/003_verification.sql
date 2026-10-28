-- PROPOSAL ONLY: review before applying. Existing runs stay unverified.
BEGIN;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS health_check_ok BOOLEAN;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS health_check_url TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS reset_confirmed_at TIMESTAMPTZ;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS environment_error BOOLEAN;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS t_pipeline_start TIMESTAMPTZ;
COMMIT;
-- order_group and all four time points already exist. Collection code must explicitly
-- record the actual order, baseline reset and public health response per run.
-- Do not backfill health success from a GitLab job status.
