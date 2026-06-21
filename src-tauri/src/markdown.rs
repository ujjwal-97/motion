use pulldown_cmark::{html, Options, Parser};
use rusqlite::params;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub struct ParsedMarkdown {
    pub title: Option<String>,
    pub icon: Option<String>,
    pub body: String,
}

pub fn parse_frontmatter(raw: &str) -> ParsedMarkdown {
    let trimmed = raw.trim_start_matches('\u{feff}');
    if !trimmed.starts_with("---") {
        return ParsedMarkdown {
            title: None,
            icon: None,
            body: trimmed.to_string(),
        };
    }

    let after_first = trimmed.strip_prefix("---").unwrap_or(trimmed).trim_start();
    let Some((frontmatter, body)) = after_first.split_once("\n---") else {
        return ParsedMarkdown {
            title: None,
            icon: None,
            body: trimmed.to_string(),
        };
    };

    let mut title = None;
    let mut icon = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
            match key.as_str() {
                "title" if !value.is_empty() => title = Some(value),
                "icon" if !value.is_empty() => icon = Some(value),
                _ => {}
            }
        }
    }

    ParsedMarkdown {
        title,
        icon,
        body: body.trim_start_matches('\n').trim_start_matches('\r').to_string(),
    }
}

pub fn markdown_to_html(markdown: &str) -> String {
    if markdown.trim().is_empty() {
        return String::new();
    }

    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(markdown, options);
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

pub fn collect_markdown_files(
    dir: &Path,
    base: &Path,
    out: &mut Vec<(PathBuf, String)>,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_markdown_files(&path, base, out)?;
            continue;
        }

        if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");
        if file_name.starts_with('.') {
            continue;
        }

        let relative = path
            .strip_prefix(base)
            .map_err(|e| e.to_string())?
            .to_path_buf();
        let content = fs::read_to_string(&path).map_err(|e| {
            format!("Failed to read '{}': {e}", path.display())
        })?;
        out.push((relative, content));
    }

    Ok(())
}

fn path_key(relative: &Path) -> PathBuf {
    relative.with_extension("")
}

fn segment_title(segment: &str) -> String {
    let trimmed = segment.trim();
    if trimmed.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed.to_string()
    }
}

fn title_from_file(relative: &Path, parsed: &ParsedMarkdown) -> String {
    if let Some(title) = parsed.title.as_ref() {
        let trimmed = title.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    relative
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(segment_title)
        .unwrap_or_else(|| "Untitled".to_string())
}

fn next_position(
    db: &rusqlite::Connection,
    workspace_id: &str,
    parent_id: Option<&str>,
) -> Result<i32, String> {
    db.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM pages
         WHERE workspace_id = ? AND parent_id IS ? AND is_deleted = 0",
        params![workspace_id, parent_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

fn insert_page(
    db: &rusqlite::Connection,
    workspace_id: &str,
    parent_id: Option<String>,
    title: String,
    icon: String,
    content: String,
    now: i64,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let position = next_position(db, workspace_id, parent_id.as_deref())?;

    db.execute(
        "INSERT INTO pages (id, title, icon, parent_id, position, content, workspace_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            title,
            icon,
            parent_id,
            position,
            content,
            workspace_id,
            now,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

fn update_page(
    db: &rusqlite::Connection,
    id: &str,
    title: String,
    icon: String,
    content: String,
    now: i64,
) -> Result<(), String> {
    db.execute(
        "UPDATE pages SET title = ?, icon = ?, content = ?, updated_at = ? WHERE id = ?",
        params![title, icon, content, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn import_markdown_tree(
    db: &rusqlite::Connection,
    workspace_id: &str,
    source: &Path,
) -> Result<u32, String> {
    if !source.is_dir() {
        return Err("Import source must be a folder".to_string());
    }

    let mut files: Vec<(PathBuf, String)> = Vec::new();
    collect_markdown_files(source, source, &mut files)?;

    if files.is_empty() {
        return Err("No Markdown files found in the selected folder".to_string());
    }

    files.sort_by(|(a, _), (b, _)| {
        a.components()
            .count()
            .cmp(&b.components().count())
            .then_with(|| a.as_os_str().cmp(b.as_os_str()))
    });

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    let mut path_to_id: HashMap<PathBuf, String> = HashMap::new();
    let mut imported_count = 0u32;

    for (relative, raw) in files {
        let parsed = parse_frontmatter(&raw);
        let page_key = path_key(&relative);
        let html = markdown_to_html(&parsed.body);
        let title = title_from_file(&relative, &parsed);
        let icon = parsed
            .icon
            .unwrap_or_else(|| "📄".to_string());

        let mut parent_id: Option<String> = None;
        if let Some(parent_path) = page_key.parent() {
            if !parent_path.as_os_str().is_empty() {
                let mut current = PathBuf::new();
                for component in parent_path.components() {
                    let std::path::Component::Normal(name) = component else {
                        continue;
                    };
                    current.push(name);
                    if path_to_id.contains_key(&current) {
                        parent_id = Some(path_to_id[&current].clone());
                        continue;
                    }

                    let folder_title = segment_title(name.to_string_lossy().as_ref());
                    let folder_id = insert_page(
                        db,
                        workspace_id,
                        parent_id.clone(),
                        folder_title,
                        "📁".to_string(),
                        String::new(),
                        now,
                    )?;
                    path_to_id.insert(current.clone(), folder_id.clone());
                    parent_id = Some(folder_id);
                    imported_count += 1;
                }
            }
        }

        if let Some(existing_id) = path_to_id.get(&page_key).cloned() {
            update_page(db, &existing_id, title, icon, html, now)?;
        } else {
            let id = insert_page(
                db,
                workspace_id,
                parent_id,
                title,
                icon,
                html,
                now,
            )?;
            path_to_id.insert(page_key, id);
            imported_count += 1;
        }
    }

    Ok(imported_count)
}
