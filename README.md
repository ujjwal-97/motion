# motion

<p align="center">
  <img src="public/motion-icon.svg" alt="motion app icon" width="96" height="96" />
</p>

A local-first desktop notes app for organizing ideas in nested pages, with a rich editor and a workspace you fully own.

motion stores everything on your machine. No account, no cloud dependency, and no background sync in the current release — your notes stay in a SQLite database under your user data folder until you choose to export them.

## What motion is for

motion is built for people who want a calm place to think, write, and structure knowledge over time:

- **Capture notes** in a WYSIWYG editor with formatting, lists, tasks, links, images, and more
- **Organize pages** in a nested tree inside a workspace
- **Navigate quickly** with tabs, breadcrumbs, and Quick Find (`⌘K`)
- **Work offline** with automatic saves to a local database
- **Export selectively** to Markdown files when you need files outside the app

The long-term direction is a focused writing tool that grows in capability without giving up local ownership: single-user desktop today, multi-device sync later, and shared workspaces after that.

## Features

### Workspace & pages

- Rename your workspace from the sidebar
- Create, nest, reorder, and delete pages
- Per-page title and emoji icon
- Soft-delete support in the data model

### Editor

- Rich text editing powered by Tiptap
- Slash commands (`/`) for inserting blocks and formatting
- Bubble menu for inline formatting on text selections
- Auto-save with a saving indicator in the nav bar

### Navigation

- Collapsible sidebar with a page tree
- Tab bar for working across multiple pages at once
  - Sidebar and Quick Find navigate in the current tab
  - The **+** button opens a new tab explicitly
- Breadcrumb trail for parent pages

### Search & export

- Quick Find (`⌘K`) to jump to any page by title
- Export workspace: pick pages and write them as `.md` files with YAML frontmatter (`title`, `icon`)

### Desktop shell

- Native macOS window with an overlay title bar
- Draggable top bar regions for moving the window
- `acceptFirstMouse` so the window can be dragged even when unfocused

## Tech stack

| Layer | Stack |
|-------|--------|
| Desktop shell | [Tauri 2](https://v2.tauri.app/) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| State | Zustand |
| Editor | Tiptap v3 |
| Database | SQLite via `rusqlite` (bundled) |
| Icons | Lucide |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install)
- macOS platform dependencies for Tauri — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
npm install
npm run tauri dev
```

The Vite dev server runs on port `1420`. Use the Tauri command above for the full desktop app. A browser-only preview (`npm run dev`) cannot access the local database or Tauri commands.

### Production build

```bash
npm run tauri build
```

## Data storage

On macOS, the SQLite database lives at:

```
~/Library/Application Support/notepad/motion.db
```

Page content is stored as HTML in the database. Export converts pages to Markdown with frontmatter.

## Project layout

```
motion/
├── src/                    # React frontend
│   ├── components/         # UI (Sidebar, Editor, TabBar, CommandMenu, …)
│   ├── store.ts            # Zustand app state
│   └── api.ts              # Tauri command bridge
├── src-tauri/
│   ├── src/commands.rs     # Rust IPC handlers
│   ├── migrations/         # SQLite schema
│   └── capabilities/       # Tauri permissions
└── package.json
```

## Roadmap

**Now (v0.1)** — Single user, macOS desktop, local SQLite storage

**Next** — Multi-device sync via Google Drive

**Later** — Multi-user workspaces with shared pages

## License

Private project — all rights reserved unless otherwise noted.
