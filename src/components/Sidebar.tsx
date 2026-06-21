import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  Trash2,
  FilePlus,
  Search,
  Download,
  Upload,
  Pencil,
  ChevronDown,
  Shapes,
} from "lucide-react";
import { useStore } from "../store";
import { buildTree, type PageNode } from "../types";
import { clsx } from "clsx";
import { ExportWorkspaceDialog } from "./ExportWorkspaceDialog";
import { ImportWorkspaceDialog } from "./ImportWorkspaceDialog";
import { IconPicker } from "./IconPicker";
import { PageIcon } from "./PageIcon";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

/* ── Page Item ─────────────────────────────────────── */
interface PageItemProps {
  node: PageNode;
  depth: number;
}

function PageItem({ node, depth }: PageItemProps) {
  const { activePageId, selectPage, createPage, deletePage } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = activePageId === node.id;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const page = await createPage(node.id);
    setExpanded(true);
    selectPage(page.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await deletePage(node.id);
  };

  return (
    <div>
      <div
        className={clsx(
          "group flex items-center gap-0.5 rounded-md px-1 py-0.5 cursor-pointer select-none relative",
          isActive ? "bg-[var(--bg-active)]" : "hover:bg-[var(--bg-hover)]"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => selectPage(node.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Expand toggle */}
        <button
          className={clsx(
            "flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-transform",
            node.children.length === 0 && "opacity-0 pointer-events-none",
            expanded && "rotate-90"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <ChevronRight size={12} />
        </button>

        {/* Icon */}
        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <PageIcon icon={node.icon} size="xs" />
        </span>

        {/* Title */}
        <span
          className={clsx(
            "flex-1 text-sm truncate ml-1",
            isActive ? "text-[var(--text)] font-medium" : "text-[var(--text)]"
          )}
        >
          {node.title || "Untitled"}
        </span>

        {/* Actions */}
        {(hovered || isActive) && (
          <div className="flex items-center gap-0.5 ml-1">
            <button
              className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-active)]"
              onClick={handleAddChild}
              title="Add sub-page"
            >
              <Plus size={12} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-active)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                title="More options"
              >
                <MoreHorizontal size={12} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-50 min-w-[160px] bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    onClick={handleAddChild}
                  >
                    <FilePlus size={13} className="text-[var(--text-secondary)]" />
                    Add sub-page
                  </button>
                  <div className="my-1 border-t border-[var(--border)]" />
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--bg-hover)]"
                    onClick={handleDelete}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <PageItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Workspace Header ──────────────────────────────── */
function WorkspaceHeader() {
  const {
    workspaces,
    activeWorkspaceId,
    workspaceName,
    updateWorkspaceName,
    updateWorkspaceIcon,
    deleteWorkspace,
    createWorkspace,
  } = useStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(workspaceName);
  const menuRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const switcherAnchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setValue(workspaceName);
  }, [workspaceName, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const startEditing = () => {
    setMenuOpen(false);
    setSwitcherOpen(false);
    setIconOpen(false);
    setValue(workspaceName);
    setEditing(true);
  };

  const openIconPicker = () => {
    setMenuOpen(false);
    setSwitcherOpen(false);
    setIconOpen(true);
  };

  const handleIconSelect = async (icon: string) => {
    try {
      await updateWorkspaceIcon(icon);
    } catch {
      // Error shown in global banner.
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId || workspaces.length <= 1) return;
    setMenuOpen(false);
    try {
      await deleteWorkspace(activeWorkspaceId);
    } catch {
      // Error shown in global banner.
    }
  };

  const handleNewWorkspace = async () => {
    setMenuOpen(false);
    setSwitcherOpen(false);
    try {
      await createWorkspace();
    } catch {
      // Error shown in global banner.
    }
  };

  const cancelEditing = () => {
    setValue(workspaceName);
    setEditing(false);
  };

  const saveEditing = async () => {
    const next = value.trim() || "My Workspace";
    setValue(next);
    setEditing(false);
    if (next !== workspaceName) {
      try {
        await updateWorkspaceName(next);
      } catch {
        setValue(workspaceName);
      }
    }
  };

  return (
    <>
      {/* macOS traffic-light / window drag strip — aligns with TabBar */}
      <div className="relative flex-shrink-0 h-[52px]">
        {!editing && (
          <div
            data-tauri-drag-region="deep"
            className="absolute inset-0 z-0"
            aria-hidden
          />
        )}
      </div>

      {/* Workspace switcher row */}
      <div className="relative mx-2 mb-1">
        <div
          ref={switcherAnchorRef}
          className="flex items-center gap-2 px-2 h-11 rounded-md min-w-0 hover:bg-[var(--bg-hover)] transition-colors"
        >
          <button
            type="button"
            data-tauri-drag-region="false"
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
            onClick={() => {
              if (editing) return;
              setMenuOpen(false);
              setIconOpen(false);
              setSwitcherOpen((v) => !v);
            }}
          >
            <div className="relative flex-shrink-0" ref={iconRef}>
              <button
                type="button"
                data-tauri-drag-region="false"
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--text)] hover:bg-[var(--bg-active)] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  openIconPicker();
                }}
                title="Change icon"
              >
                <PageIcon icon={activeWorkspace?.icon ?? "🏠"} size="xs" />
              </button>
              <IconPicker
                open={iconOpen}
                onClose={() => setIconOpen(false)}
                currentIcon={activeWorkspace?.icon ?? "🏠"}
                onSelect={(icon) => void handleIconSelect(icon)}
              />
            </div>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {editing ? (
                <input
                  ref={inputRef}
                  data-tauri-drag-region="false"
                  className="w-full text-sm font-semibold bg-[var(--bg-hover)] text-[var(--text)] rounded px-1.5 py-0.5 outline-none border border-[var(--accent)]"
                  value={value}
                  maxLength={80}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={() => void saveEditing()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveEditing();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditing();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="text-sm font-semibold text-[var(--text)] truncate px-1.5 py-0.5">
                    {workspaceName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={clsx(
                      "flex-shrink-0 text-[var(--text-secondary)] transition-transform",
                      switcherOpen && "rotate-180"
                    )}
                  />
                </>
              )}
            </div>
          </button>

          {!editing && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                type="button"
                data-tauri-drag-region="false"
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-active)]"
                onClick={() => {
                  setSwitcherOpen(false);
                  setMenuOpen((v) => !v);
                }}
                title="Workspace options"
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-7 z-50 min-w-[180px] bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    onClick={() => void handleNewWorkspace()}
                  >
                    <Plus size={13} className="text-[var(--text-secondary)]" />
                    New
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    onClick={startEditing}
                  >
                    <Pencil size={13} className="text-[var(--text-secondary)]" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    onClick={openIconPicker}
                  >
                    <Shapes size={13} className="text-[var(--text-secondary)]" />
                    Icon
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setImportOpen(true);
                    }}
                  >
                    <Upload size={13} className="text-[var(--text-secondary)]" />
                    Import
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setExportOpen(true);
                    }}
                  >
                    <Download size={13} className="text-[var(--text-secondary)]" />
                    Export
                  </button>
                  {workspaces.length > 1 && (
                    <>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--bg-hover)]"
                        onClick={() => void handleDeleteWorkspace()}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <WorkspaceSwitcher
          open={switcherOpen && !editing}
          onClose={() => setSwitcherOpen(false)}
          anchorRef={switcherAnchorRef}
        />
      </div>

      <ExportWorkspaceDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
      <ImportWorkspaceDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}

/* ── Sidebar ───────────────────────────────────────── */
export function Sidebar() {
  const { pages, createPage, selectPage, toggleCommandMenu } = useStore();
  const tree = buildTree(pages);

  const handleNewPage = async () => {
    try {
      const page = await createPage(null);
      await selectPage(page.id);
    } catch {
      // Error is shown in the global banner.
    }
  };

  return (
    <aside
      className="flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] select-none"
      style={{ width: 240, minWidth: 240 }}
    >
      <WorkspaceHeader />

      {/* Quick find */}
      <button
        className="mx-2 mb-1 flex items-center gap-2 px-2 h-11 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-sm"
        onClick={toggleCommandMenu}
      >
        <Search size={14} />
        <span>Quick find</span>
        <span className="ml-auto text-xs opacity-50">⌘K</span>
      </button>

      {/* Page tree */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {tree.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              No pages yet
            </p>
          </div>
        ) : (
          tree.map((node) => (
            <PageItem key={node.id} node={node} depth={0} />
          ))
        )}
      </div>

      {/* Footer: New page */}
      <div className="px-2 pb-3 pt-1 border-t border-[var(--border)]">
        <button
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-sm"
          onClick={handleNewPage}
        >
          <Plus size={14} />
          <span>New page</span>
        </button>
      </div>
    </aside>
  );
}
