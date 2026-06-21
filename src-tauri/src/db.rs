use rusqlite::{params, Connection};
use uuid::Uuid;

const ACTIVE_WORKSPACE_KEY: &str = "active_workspace_id";
const LEGACY_WORKSPACE_NAME_KEY: &str = "workspace_name";
const DEFAULT_WORKSPACE_NAME: &str = "My Workspace";

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn pages_has_workspace_id(conn: &Connection) -> Result<bool, rusqlite::Error> {
    let mut stmt = conn.prepare("PRAGMA table_info(pages)")?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == "workspace_id" {
            return Ok(true);
        }
    }
    Ok(false)
}

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(include_str!("../migrations/001_init.sql"))
        .map_err(|e| e.to_string())?;
    conn.execute_batch(include_str!("../migrations/002_settings.sql"))
        .map_err(|e| e.to_string())?;
    conn.execute_batch(include_str!("../migrations/003_workspaces.sql"))
        .map_err(|e| e.to_string())?;

    if !pages_has_workspace_id(conn).map_err(|e| e.to_string())? {
        conn.execute("ALTER TABLE pages ADD COLUMN workspace_id TEXT", [])
            .map_err(|e| e.to_string())?;
    }

    bootstrap_workspaces(conn)?;
    Ok(())
}

fn bootstrap_workspaces(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM workspaces WHERE is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if count == 0 {
        let id = Uuid::new_v4().to_string();
        let now = now_ms();
        let name: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?",
                params![LEGACY_WORKSPACE_NAME_KEY],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| DEFAULT_WORKSPACE_NAME.to_string());

        conn.execute(
            "INSERT INTO workspaces (id, name, icon, created_at, updated_at)
             VALUES (?, ?, '🏠', ?, ?)",
            params![id, name, now, now],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE pages SET workspace_id = ? WHERE workspace_id IS NULL",
            params![id],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![ACTIVE_WORKSPACE_KEY, id],
        )
        .map_err(|e| e.to_string())?;

        return Ok(());
    }

    let active: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![ACTIVE_WORKSPACE_KEY],
            |row| row.get(0),
        )
        .unwrap_or_default();

    if active.trim().is_empty() {
        let first: String = conn
            .query_row(
                "SELECT id FROM workspaces WHERE is_deleted = 0 ORDER BY created_at ASC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![ACTIVE_WORKSPACE_KEY, first],
        )
        .map_err(|e| e.to_string())?;
    }

    let active_id: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![ACTIVE_WORKSPACE_KEY],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE pages SET workspace_id = ? WHERE workspace_id IS NULL",
        params![active_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
