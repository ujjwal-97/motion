CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT    PRIMARY KEY NOT NULL,
    name        TEXT    NOT NULL,
    icon        TEXT    NOT NULL DEFAULT '🏠',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    is_deleted  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workspaces_deleted ON workspaces (is_deleted);

INSERT OR IGNORE INTO settings (key, value) VALUES ('active_workspace_id', '');
