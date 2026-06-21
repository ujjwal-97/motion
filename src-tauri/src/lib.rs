mod commands;
mod db;
mod markdown;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&data_dir)?;

            let db_path = data_dir.join("motion.db");
            let conn = Connection::open(&db_path).expect("failed to open database");

            db::run_migrations(&conn).expect("failed to run database migrations");

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_pages,
            commands::create_page,
            commands::update_page_title,
            commands::update_page_icon,
            commands::update_page_content,
            commands::get_page_content,
            commands::delete_page,
            commands::move_page,
            commands::search_pages,
            commands::list_workspaces,
            commands::get_active_workspace,
            commands::create_workspace,
            commands::switch_workspace,
            commands::update_workspace,
            commands::delete_workspace,
            commands::get_workspace_name,
            commands::update_workspace_name,
            commands::export_pages,
            commands::import_pages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
