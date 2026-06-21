use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use uuid::Uuid;

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

#[tauri::command]
pub fn list_pages(state: State<AppState>) -> Result<Vec<PageMeta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, title, icon, parent_id, position, cover_color, created_at, updated_at
             FROM pages WHERE is_deleted = 0
             ORDER BY parent_id NULLS FIRST, position ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let pages = stmt
        .query_map([], |row| {
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
    let id = Uuid::new_v4().to_string();
    let now = now_ms();

    let position: i32 = db
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM pages WHERE parent_id IS ? AND is_deleted = 0",
            params![parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    db.execute(
        "INSERT INTO pages (id, title, icon, parent_id, position, content, created_at, updated_at)
         VALUES (?, ?, '📄', ?, ?, '', ?, ?)",
        params![id, title, parent_id, position, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(PageMeta {
        id,
        title,
        icon: "📄".to_string(),
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
    let pattern = format!("%{}%", query.to_lowercase());

    let mut stmt = db
        .prepare(
            "SELECT id, title, icon, content FROM pages
             WHERE is_deleted = 0 AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
             ORDER BY updated_at DESC LIMIT 20",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map(params![pattern, pattern], |row| {
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

const WORKSPACE_NAME_KEY: &str = "workspace_name";
const DEFAULT_WORKSPACE_NAME: &str = "My Workspace";

#[tauri::command]
pub fn get_workspace_name(state: State<AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let name: String = db
        .query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![WORKSPACE_NAME_KEY],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| DEFAULT_WORKSPACE_NAME.to_string());
    Ok(name)
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
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![WORKSPACE_NAME_KEY, trimmed],
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
    let mut stmt = db
        .prepare(
            "SELECT id, title, icon, parent_id, content FROM pages WHERE is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let all_pages: Vec<PageExportRow> = stmt
        .query_map([], |row| {
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

    Ok(ExportResult {
        exported_count,
        destination: dest.display().to_string(),
    })
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
