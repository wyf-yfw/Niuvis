-- P1: 核心业务表 + FTS5 索引

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  model TEXT,
  pinned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tool_call_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT,
  user_request TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY NOT NULL,
  agent_run_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'low',
  requires_confirmation INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL,
  tool_call_id TEXT,
  affected_paths_json TEXT NOT NULL DEFAULT '[]',
  approved_by_user INTEGER,
  result TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS computer_index_items (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  mime TEXT,
  size INTEGER,
  modified_at TEXT,
  source TEXT,
  permissions_json TEXT,
  content_hash TEXT,
  content_snippet TEXT DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_computer_index_items_path ON computer_index_items(path);

CREATE VIRTUAL TABLE IF NOT EXISTS computer_index_fts USING fts5(
  name,
  path,
  content_snippet,
  content='computer_index_items',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS computer_index_items_ai AFTER INSERT ON computer_index_items BEGIN
  INSERT INTO computer_index_fts(rowid, name, path, content_snippet)
  VALUES (new.rowid, new.name, new.path, COALESCE(new.content_snippet, ''));
END;

CREATE TRIGGER IF NOT EXISTS computer_index_items_ad AFTER DELETE ON computer_index_items BEGIN
  INSERT INTO computer_index_fts(computer_index_fts, rowid, name, path, content_snippet)
  VALUES ('delete', old.rowid, old.name, old.path, COALESCE(old.content_snippet, ''));
END;

CREATE TRIGGER IF NOT EXISTS computer_index_items_au AFTER UPDATE ON computer_index_items BEGIN
  INSERT INTO computer_index_fts(computer_index_fts, rowid, name, path, content_snippet)
  VALUES ('delete', old.rowid, old.name, old.path, COALESCE(old.content_snippet, ''));
  INSERT INTO computer_index_fts(rowid, name, path, content_snippet)
  VALUES (new.rowid, new.name, new.path, COALESCE(new.content_snippet, ''));
END;

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY NOT NULL,
  scope TEXT NOT NULL,
  allowed_paths_json TEXT NOT NULL DEFAULT '[]',
  denied_paths_json TEXT NOT NULL DEFAULT '[]',
  risk_rules_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_kind_key ON memories(kind, key);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
