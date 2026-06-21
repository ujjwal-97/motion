import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, X } from "lucide-react";
import { useStore } from "../store";

interface ImportWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportWorkspaceDialog({
  open: isOpen,
  onClose,
}: ImportWorkspaceDialogProps) {
  const { importPages } = useStore();
  const [source, setSource] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleChooseFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose import folder",
    });

    if (!selected || Array.isArray(selected)) return;
    setSource(selected);
  };

  const handleImport = async () => {
    if (!source) return;

    setImporting(true);
    try {
      await importPages(source);
      setSource(null);
      onClose();
    } catch {
      // Error shown in global banner.
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setSource(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Import</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Import Markdown files from a folder into this workspace
            </p>
          </div>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={handleClose}
            disabled={importing}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-[var(--border)] hover:bg-[var(--bg-hover)] text-left"
            onClick={() => void handleChooseFolder()}
            disabled={importing}
          >
            <FolderOpen
              size={18}
              className="text-[var(--text-secondary)] flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text)]">
                {source ? "Change folder" : "Choose folder"}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                {source ?? "Select a folder containing .md files"}
              </p>
            </div>
          </button>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Folder structure becomes nested pages. YAML frontmatter with{" "}
            <code className="text-[11px]">title</code> and{" "}
            <code className="text-[11px]">icon</code> is supported.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={handleClose}
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => void handleImport()}
            disabled={importing || !source}
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
