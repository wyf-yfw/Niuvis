CREATE TABLE IF NOT EXISTS schema_info (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_info (key, value)
VALUES ('initialized_at', datetime('now'));
