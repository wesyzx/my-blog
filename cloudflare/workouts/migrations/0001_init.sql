CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_activity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  local_date TEXT NOT NULL,
  distance_meters REAL NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
  duration_seconds REAL NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  elevation_gain_meters REAL NOT NULL DEFAULT 0 CHECK (elevation_gain_meters >= 0),
  pace_seconds_per_km REAL CHECK (pace_seconds_per_km IS NULL OR pace_seconds_per_km >= 0),
  route_polyline TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (source, source_activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activities_started_at ON activities (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_local_date ON activities (local_date);

CREATE TABLE IF NOT EXISTS sync_cursors (
  source TEXT PRIMARY KEY,
  cursor TEXT,
  last_synced_at TEXT,
  status TEXT NOT NULL DEFAULT 'never',
  last_error TEXT
);
