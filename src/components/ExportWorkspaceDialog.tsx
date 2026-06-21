import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ChevronRight, Folder, X } from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "../store";
import { buildTree, type PageNode } from "../types";
import {
  collectAllPageIds,
  getNodeSelectionState,
  toggleNodeSelection,
  type SelectionState,
} from "../utils/exportSelection";

interface ExportWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

function SelectionCheckbox({
  state,
  onChange,
}: {
  state: SelectionState;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      className="w-3.5 h-3.5 accent-[var(--accent)] cursor-pointer"
      checked={state === "all"}
      ref={(el) => {
        if (el) el.indeterminate = state === "partial";
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

interface ExportTreeItemProps {
  node: PageNode;
  depth: number;
  selected: Set<string>;
  onToggleNode: (node: PageNode) => void;
}

function ExportTreeItem({
  node,
  depth,
  selected,
  onToggleNode,
}: ExportTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const state = getNodeSelectionState(node, selected);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onToggleNode(node)}
      >
        <SelectionCheckbox
          state={state}
          onChange={() => onToggleNode(node)}
        />

        {hasChildren ? (
          <button
            type="button"
            className={clsx(
              "w-4 h-4 flex items-center justify-center text-[var(--text-secondary)] transition-transform",
              expanded && "rotate-90"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            <ChevronRight size={12} />
          </button>
        ) : (
          <span className="w-4" />
        )}

        {hasChildren ? (
          <Folder size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
        ) : null}

        <span className="w-5 h-5 flex items-center justify-center text-[15px] flex-shrink-0">
          {node.icon}
        </span>

        <span className="text-sm text-[var(--text)] truncate flex-1">
          {node.title || "Untitled"}
        </span>

        <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
          {hasChildren ? "folder" : "md"}
        </span>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <ExportTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selected={selected}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportWorkspaceDialog({
  open: isOpen,
  onClose,
}: ExportWorkspaceDialogProps) {
  const { pages, workspaceName, exportPages, activePageId, activeContent } =
    useStore();
  const tree = useMemo(() => buildTree(pages), [pages]);
  const allIds = useMemo(() => collectAllPageIds(pages), [pages]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(allIds));
    }
  }, [isOpen, allIds]);

  const selectAllState: SelectionState = useMemo(() => {
    if (allIds.length === 0) return "none";
    const count = allIds.filter((id) => selected.has(id)).length;
    if (count === 0) return "none";
    if (count === allIds.length) return "all";
    return "partial";
  }, [allIds, selected]);

  const toggleSelectAll = () => {
    if (selectAllState === "all") {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const handleExport = async () => {
    const pageIds = Array.from(selected);
    if (pageIds.length === 0) return;

    const destination = await open({
      directory: true,
      multiple: false,
      title: "Choose export folder",
      defaultPath: workspaceName,
    });

    if (!destination || Array.isArray(destination)) return;

    setExporting(true);
    try {
      await exportPages(pageIds, destination, {
        activePageId,
        activeContent,
      });
      onClose();
    } catch {
      // Error shown in global banner.
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Export
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Choose pages to export as Markdown files
            </p>
          </div>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-sidebar)]">
          <SelectionCheckbox state={selectAllState} onChange={toggleSelectAll} />
          <button
            type="button"
            className="text-sm font-medium text-[var(--text)]"
            onClick={toggleSelectAll}
          >
            Select all
          </button>
          <span className="ml-auto text-xs text-[var(--text-secondary)]">
            {selected.size} selected
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {tree.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              No pages to export
            </div>
          ) : (
            tree.map((node) => (
              <ExportTreeItem
                key={node.id}
                node={node}
                depth={0}
                selected={selected}
                onToggleNode={(n) =>
                  setSelected(toggleNodeSelection(n, selected))
                }
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={onClose}
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => void handleExport()}
            disabled={exporting || selected.size === 0}
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
