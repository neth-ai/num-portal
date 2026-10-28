-- NUM Portal - database schema for the manual vs DevOps deployment experiment.

-- The two participants. Roles are data on each run, never tabs in the interface.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per deployment. 5 scenarios x 10 runs x 2 methods = 100 rows when the study ends.
CREATE TABLE runs (
  id            SERIAL PRIMARY KEY,
  scenario      TEXT NOT NULL CHECK (scenario IN ('S1', 'S2', 'S3', 'S4', 'S5')),
  method        TEXT NOT NULL CHECK (method IN ('A', 'B')),
  run_no        INTEGER NOT NULL,
  order_group   TEXT,                                  -- ABBA counterbalancing group
  dev_user      TEXT,                                  -- Dev-1 or Dev-2
  ops_user      TEXT,                                  -- Ops-1 or Ops-2
  t_commit      TIMESTAMPTZ,
  t_handoff     TIMESTAMPTZ,                           -- Method A only
  t_ops_start   TIMESTAMPTZ,                           -- Method A only
  t_live        TIMESTAMPTZ,
  deployment_s  DOUBLE PRECISION,                      -- A: t_live - t_ops_start, B: whole pipeline
  lead_time_s   DOUBLE PRECISION,                      -- t_live - t_commit
  handoff_wait_s DOUBLE PRECISION,                     -- t_ops_start - t_handoff (B is always 0)
  handoffs      INTEGER NOT NULL DEFAULT 0,
  manual_steps  INTEGER NOT NULL DEFAULT 0,            -- A: commands typed, B: 1 (the push)
  result        TEXT NOT NULL CHECK (result IN ('success', 'failed', 'rolled_back')),
  recovery_s    DOUBLE PRECISION,
  sha           TEXT,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'gitlab', 'rollback-log')),
  is_dummy      BOOLEAN NOT NULL DEFAULT false,        -- example rows, never reported in the thesis
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (method, scenario, run_no)
);
CREATE INDEX runs_scenario_method ON runs (scenario, method);
CREATE INDEX runs_created ON runs (created_at DESC);

-- One row per handoff request from the Dev team to the Operations team (Method A).
CREATE TABLE handoffs (
  id           SERIAL PRIMARY KEY,
  run_id       INTEGER REFERENCES runs(id) ON DELETE SET NULL,
  scenario     TEXT NOT NULL CHECK (scenario IN ('S1', 'S2', 'S3', 'S4', 'S5')),
  version      TEXT,
  note         TEXT NOT NULL,
  new_settings TEXT NOT NULL DEFAULT 'none',
  db_steps     TEXT NOT NULL DEFAULT 'none',
  status       TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'deploying', 'live', 'failed')),
  tries        INTEGER NOT NULL DEFAULT 1,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_at     TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  steps_done   JSONB NOT NULL DEFAULT '[]'::jsonb,     -- indexes of the ticked steps
  step_times   JSONB NOT NULL DEFAULT '{}'::jsonb      -- index -> mm:ss
);
CREATE INDEX handoffs_status ON handoffs (status);

-- One row per code change made on the Change code page. Both methods share it.
CREATE TABLE releases (
  id          SERIAL PRIMARY KEY,
  scenario    TEXT NOT NULL CHECK (scenario IN ('S1', 'S2', 'S3', 'S4', 'S5')),
  run_no      INTEGER NOT NULL,
  message     TEXT NOT NULL,
  code        TEXT NOT NULL,
  sha         TEXT,
  handoff_id  INTEGER REFERENCES handoffs(id) ON DELETE SET NULL,
  t_commit    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pipelines and jobs received from GitLab webhooks (Method B).
CREATE TABLE pipeline_runs (
  id             BIGINT PRIMARY KEY,
  ref            TEXT NOT NULL,
  sha            TEXT NOT NULL,
  status         TEXT NOT NULL,
  source         TEXT,
  commit_message TEXT,
  scenario       TEXT,
  run_no         INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  duration_sec   DOUBLE PRECISION,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pipeline_runs_created ON pipeline_runs (created_at DESC);

CREATE TABLE job_runs (
  id           BIGINT PRIMARY KEY,
  pipeline_id  BIGINT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  stage        TEXT NOT NULL,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  duration_sec DOUBLE PRECISION,
  log          TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX job_runs_pipeline ON job_runs (pipeline_id);
