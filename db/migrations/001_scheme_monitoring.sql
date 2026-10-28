-- Scheme source monitoring (written by the daily refresh job).
CREATE TABLE IF NOT EXISTS scheme_source_status (
  url                        TEXT PRIMARY KEY,
  last_checked_at            TIMESTAMPTZ,
  last_success_at            TIMESTAMPTZ,
  last_hash                  TEXT,
  baseline_hash              TEXT,
  baseline_for               TEXT,
  changed_since_verification BOOLEAN NOT NULL DEFAULT FALSE,
  last_changed_at            TIMESTAMPTZ,
  last_error                 TEXT,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheme_refresh_runs (
  id          BIGSERIAL PRIMARY KEY,
  started_at  TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  checked     INTEGER NOT NULL,
  changed     JSONB NOT NULL DEFAULT '[]',
  failed      JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS scheme_refresh_runs_finished_idx ON scheme_refresh_runs (finished_at DESC);
