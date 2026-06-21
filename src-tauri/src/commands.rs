use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use uuid::Uuid;

use crate::markdown;
use crate::AppState;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PageMeta {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub parent_id: Option<String>,
    pub position: i32,
    pub cover_color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMeta {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub page_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
}

const ACTIVE_WORKSPACE_KEY: &str = "active_workspace_id";

fn get_active_workspace_id(db: &rusqlite::Connection) -> Result<String, String> {
    let active: String = db
        .query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![ACTIVE_WORKSPACE_KEY],
            |row| row.get(0),
        )
        .map_err(|_| "No active workspace".to_string())?;

    if active.trim().is_empty() {
        return Err("No active workspace".to_string());
    }

    Ok(active)
}

fn row_to_workspace(row: &rusqlite::Row<'_>) -> rusqlite::Result<WorkspaceMeta> {
    Ok(WorkspaceMeta {
        id: row.get(0)?,
        name: row.get(1)?,
        icon: row.get(2)?,
        page_count: row.get::<_, i64>(3)? as u32,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

const DEFAULT_WORKSPACE_ICON: &str = "lucide:home";
const DEFAULT_PAGE_ICON: &str = "lucide:file-text";

const WORKSPACE_SELECT: &str = "SELECT w.id, w.name, w.icon,
    (SELECT COUNT(*) FROM pages p
     WHERE p.workspace_id = w.id AND p.is_deleted = 0) AS page_count,
    w.created_at, w.updated_at
 FROM workspaces w";

#[tauri::command]
pub fn list_pages(state: State<AppState>) -> Result<Vec<PageMeta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    let mut stmt = db
        .prepare(
            "SELECT id, title, icon, parent_id, position, cover_color, created_at, updated_at
             FROM pages
             WHERE is_deleted = 0 AND workspace_id = ?
             ORDER BY parent_id NULLS FIRST, position ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let pages = stmt
        .query_map(params![workspace_id], |row| {
            Ok(PageMeta {
                id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
                parent_id: row.get(3)?,
                position: row.get(4)?,
                cover_color: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(pages)
}

#[tauri::command]
pub fn create_page(
    state: State<AppState>,
    parent_id: Option<String>,
    title: String,
) -> Result<PageMeta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    let id = Uuid::new_v4().to_string();
    let now = now_ms();

    let position: i32 = db
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM pages
             WHERE parent_id IS ? AND workspace_id = ? AND is_deleted = 0",
            params![parent_id, workspace_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    db.execute(
        "INSERT INTO pages (id, title, icon, parent_id, position, content, workspace_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, '', ?, ?, ?)",
        params![id, title, DEFAULT_PAGE_ICON, parent_id, position, workspace_id, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(PageMeta {
        id,
        title,
        icon: DEFAULT_PAGE_ICON.to_string(),
        parent_id,
        position,
        cover_color: None,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_page_title(
    state: State<AppState>,
    id: String,
    title: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE pages SET title = ?, updated_at = ? WHERE id = ?",
        params![title, now_ms(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_page_icon(
    state: State<AppState>,
    id: String,
    icon: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE pages SET icon = ?, updated_at = ? WHERE id = ?",
        params![icon, now_ms(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_page_content(
    state: State<AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE pages SET content = ?, updated_at = ? WHERE id = ?",
        params![content, now_ms(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_page_content(state: State<AppState>, id: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let content: String = db
        .query_row(
            "SELECT content FROM pages WHERE id = ? AND is_deleted = 0",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
pub fn delete_page(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    delete_recursive(&db, &id, now)
}

fn delete_recursive(db: &rusqlite::Connection, id: &str, now: i64) -> Result<(), String> {
    let children: Vec<String> = {
        let mut stmt = db
            .prepare("SELECT id FROM pages WHERE parent_id = ? AND is_deleted = 0")
            .map_err(|e| e.to_string())?;
        let result = stmt
            .query_map(params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        result
    };

    for child_id in children {
        delete_recursive(db, &child_id, now)?;
    }

    db.execute(
        "UPDATE pages SET is_deleted = 1, updated_at = ? WHERE id = ?",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn move_page(
    state: State<AppState>,
    id: String,
    parent_id: Option<String>,
    position: i32,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE pages SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?",
        params![parent_id, position, now_ms(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_pages(
    state: State<AppState>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    let pattern = format!("%{}%", query.to_lowercase());

    let mut stmt = db
        .prepare(
            "SELECT id, title, icon, content FROM pages
             WHERE is_deleted = 0 AND workspace_id = ?
               AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
             ORDER BY updated_at DESC LIMIT 20",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map(params![workspace_id, pattern, pattern], |row| {
            let content: String = row.get(3)?;
            let stripped = strip_html(&content);
            let snippet = if stripped.len() > 120 {
                format!("{}…", &stripped[..120])
            } else {
                stripped
            };
            Ok(SearchResult {
                id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
                snippet,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub fn list_workspaces(state: State<AppState>) -> Result<Vec<WorkspaceMeta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(&format!(
            "{WORKSPACE_SELECT} WHERE w.is_deleted = 0 ORDER BY w.created_at ASC"
        ))
        .map_err(|e| e.to_string())?;

    let workspaces = stmt
        .query_map([], row_to_workspace)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(workspaces)
}

#[tauri::command]
pub fn get_active_workspace(state: State<AppState>) -> Result<WorkspaceMeta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    db.query_row(
        &format!("{WORKSPACE_SELECT} WHERE w.id = ? AND w.is_deleted = 0"),
        params![workspace_id],
        row_to_workspace,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_workspace(
    state: State<AppState>,
    name: Option<String>,
) -> Result<WorkspaceMeta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    let trimmed = name
        .unwrap_or_else(|| "New Workspace".to_string())
        .trim()
        .to_string();
    let workspace_name = if trimmed.is_empty() {
        "New Workspace".to_string()
    } else if trimmed.len() > 80 {
        return Err("Workspace name must be 80 characters or fewer".to_string());
    } else {
        trimmed
    };

    db.execute(
        "INSERT INTO workspaces (id, name, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)",
        params![id, workspace_name, DEFAULT_WORKSPACE_ICON, now, now],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![ACTIVE_WORKSPACE_KEY, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(WorkspaceMeta {
        id,
        name: workspace_name,
        icon: DEFAULT_WORKSPACE_ICON.to_string(),
        page_count: 0,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn switch_workspace(state: State<AppState>, id: String) -> Result<WorkspaceMeta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace = db
        .query_row(
            &format!("{WORKSPACE_SELECT} WHERE w.id = ? AND w.is_deleted = 0"),
            params![id],
            row_to_workspace,
        )
        .map_err(|_| "Workspace not found".to_string())?;

    db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![ACTIVE_WORKSPACE_KEY, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(workspace)
}

#[tauri::command]
pub fn update_workspace(
    state: State<AppState>,
    id: String,
    name: Option<String>,
    icon: Option<String>,
) -> Result<WorkspaceMeta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let existing = db
        .query_row(
            &format!("{WORKSPACE_SELECT} WHERE w.id = ? AND w.is_deleted = 0"),
            params![id],
            row_to_workspace,
        )
        .map_err(|_| "Workspace not found".to_string())?;

    let next_name = if let Some(name) = name {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err("Workspace name cannot be empty".to_string());
        }
        if trimmed.len() > 80 {
            return Err("Workspace name must be 80 characters or fewer".to_string());
        }
        trimmed.to_string()
    } else {
        existing.name
    };

    let next_icon = icon.unwrap_or(existing.icon);
    let now = now_ms();

    db.execute(
        "UPDATE workspaces SET name = ?, icon = ?, updated_at = ? WHERE id = ?",
        params![next_name, next_icon, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(WorkspaceMeta {
        id,
        name: next_name,
        icon: next_icon,
        page_count: existing.page_count,
        created_at: existing.created_at,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_workspace(state: State<AppState>, id: String) -> Result<WorkspaceMeta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM workspaces WHERE is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if count <= 1 {
        return Err("You must keep at least one workspace".to_string());
    }

    db.query_row(
        "SELECT id FROM workspaces WHERE id = ? AND is_deleted = 0",
        params![id],
        |row| row.get::<_, String>(0),
    )
    .map_err(|_| "Workspace not found".to_string())?;

    let now = now_ms();
    db.execute(
        "UPDATE workspaces SET is_deleted = 1, updated_at = ? WHERE id = ?",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    soft_delete_workspace_pages(&db, &id, now)?;

    let active_id = get_active_workspace_id(&db)?;
    if active_id == id {
        let fallback: WorkspaceMeta = db
            .query_row(
                &format!(
                    "{WORKSPACE_SELECT} WHERE w.is_deleted = 0 ORDER BY w.created_at ASC LIMIT 1"
                ),
                [],
                row_to_workspace,
            )
            .map_err(|e| e.to_string())?;

        db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![ACTIVE_WORKSPACE_KEY, fallback.id],
        )
        .map_err(|e| e.to_string())?;

        return Ok(fallback);
    }

    let workspace = db
        .query_row(
            &format!("{WORKSPACE_SELECT} WHERE w.id = ? AND w.is_deleted = 0"),
            params![active_id],
            row_to_workspace,
        )
        .map_err(|e| e.to_string())?;

    Ok(workspace)
}

fn soft_delete_workspace_pages(
    db: &rusqlite::Connection,
    workspace_id: &str,
    now: i64,
) -> Result<(), String> {
    let mut stmt = db
        .prepare("SELECT id FROM pages WHERE workspace_id = ? AND is_deleted = 0")
        .map_err(|e| e.to_string())?;
    let page_ids = stmt
        .query_map(params![workspace_id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for page_id in page_ids {
        delete_recursive(db, &page_id, now)?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_workspace_name(state: State<AppState>) -> Result<String, String> {
    let workspace = get_active_workspace(state)?;
    Ok(workspace.name)
}

#[tauri::command]
pub fn update_workspace_name(state: State<AppState>, name: String) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Workspace name cannot be empty".to_string());
    }
    if trimmed.len() > 80 {
        return Err("Workspace name must be 80 characters or fewer".to_string());
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    db.execute(
        "UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?",
        params![trimmed, now_ms(), workspace_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
#[derive(Debug, Clone)]
struct PageExportRow {
    id: String,
    title: String,
    icon: String,
    parent_id: Option<String>,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub exported_count: u32,
    pub destination: String,
}

#[tauri::command]
pub fn export_pages(
    state: State<AppState>,
    page_ids: Vec<String>,
    destination: String,
) -> Result<ExportResult, String> {
    if page_ids.is_empty() {
        return Err("Select at least one page to export".to_string());
    }

    let dest = PathBuf::from(destination.trim());
    if dest.as_os_str().is_empty() {
        return Err("Export destination is required".to_string());
    }

    std::fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    let mut stmt = db
        .prepare(
            "SELECT id, title, icon, parent_id, content FROM pages
             WHERE is_deleted = 0 AND workspace_id = ?",
        )
        .map_err(|e| e.to_string())?;

    let all_pages: Vec<PageExportRow> = stmt
        .query_map(params![workspace_id], |row| {
            Ok(PageExportRow {
                id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
                parent_id: row.get(3)?,
                content: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let page_map: HashMap<String, PageExportRow> = all_pages
        .into_iter()
        .map(|p| (p.id.clone(), p))
        .collect();

    let selected: HashMap<String, &PageExportRow> = page_ids
        .iter()
        .filter_map(|id| page_map.get(id).map(|p| (id.clone(), p)))
        .collect();

    if selected.is_empty() {
        return Err("No matching pages found to export".to_string());
    }

    let converter = htmd::HtmlToMarkdown::new();
    let mut exported_count = 0u32;

    for page in selected.values() {
        let relative = build_export_relative_path(page, &page_map);
        let file_path = dest.join(&relative);

        if let Some(parent) = file_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let body = if page.content.trim().is_empty() {
            String::new()
        } else {
            converter
                .convert(&page.content)
                .map_err(|e| format!("Failed to convert page '{}': {e}", page.title))?
        };

        let title = if page.title.trim().is_empty() {
            "Untitled".to_string()
        } else {
            page.title.trim().to_string()
        };

        let markdown = format!(
            "---\ntitle: {}\nicon: \"{}\"\n---\n\n{}",
            escape_yaml(&title),
            escape_yaml(&page.icon),
            body.trim()
        );

        std::fs::write(&file_path, markdown).map_err(|e| {
            format!(
                "Failed to write '{}': {e}",
                file_path.display()
            )
        })?;

        exported_count += 1;
    }

    let workspace_name: String = db
        .query_row(
            "SELECT name FROM workspaces WHERE id = ?",
            params![workspace_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    write_export_manifest(&dest, &workspace_name, exported_count)?;

    Ok(ExportResult {
        exported_count,
        destination: dest.display().to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported_count: u32,
    pub source: String,
}

#[tauri::command]
pub fn import_pages(state: State<AppState>, source: String) -> Result<ImportResult, String> {
    let src = PathBuf::from(source.trim());
    if src.as_os_str().is_empty() {
        return Err("Import source is required".to_string());
    }
    if !src.is_dir() {
        return Err("Import source must be a folder".to_string());
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let workspace_id = get_active_workspace_id(&db)?;
    let imported_count =
        markdown::import_markdown_tree(&db, &workspace_id, &src).map_err(|e| e.to_string())?;

    Ok(ImportResult {
        imported_count,
        source: src.display().to_string(),
    })
}

fn write_export_manifest(
    dest: &Path,
    workspace_name: &str,
    exported_count: u32,
) -> Result<(), String> {
    let manifest = serde_json::json!({
        "version": 1,
        "format": "motion-markdown",
        "workspaceName": workspace_name,
        "exportedCount": exported_count,
        "exportedAt": now_ms(),
    });

    fs::write(
        dest.join("motion-export.json"),
        serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("Failed to write export manifest: {e}"))?;

    Ok(())
}

fn build_export_relative_path(
    page: &PageExportRow,
    pages: &HashMap<String, PageExportRow>,
) -> PathBuf {
    let mut segments: Vec<String> = Vec::new();
    let mut current_parent = page.parent_id.clone();

    while let Some(parent_id) = current_parent {
        if let Some(parent) = pages.get(&parent_id) {
            segments.push(sanitize_filename(&parent.title));
            current_parent = parent.parent_id.clone();
        } else {
            break;
        }
    }

    segments.reverse();
    let mut path = PathBuf::new();
    for segment in segments {
        path.push(segment);
    }
    path.push(format!("{}.md", sanitize_filename(&page.title)));
    path
}

fn sanitize_filename(name: &str) -> String {
    let trimmed = name.trim();
    let base = if trimmed.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed.to_string()
    };

    let sanitized: String = base
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();

    let trimmed_sanitized = sanitized.trim().trim_matches('.');
    if trimmed_sanitized.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed_sanitized.to_string()
    }
}

fn escape_yaml(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn strip_html(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(c),
            _ => {}
        }
    }
    result.trim().to_string()
}
