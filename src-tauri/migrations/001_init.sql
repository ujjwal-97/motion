PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS pages (
    id          TEXT    PRIMARY KEY NOT NULL,
    title       TEXT    NOT NULL DEFAULT 'Untitled',
    icon        TEXT    NOT NULL DEFAULT '📄',
    parent_id   TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    content     TEXT    NOT NULL DEFAULT '',
    cover_color TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES pages(id)
);

CREATE INDEX IF NOT EXISTS idx_pages_parent   ON pages (parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_updated  ON pages (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_deleted  ON pages (is_deleted);
