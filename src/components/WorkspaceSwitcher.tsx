import { useEffect, useRef } from "react";
import { Check, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "../store";

interface WorkspaceSwitcherProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function WorkspaceSwitcher({
  open,
  onClose,
  anchorRef,
}: WorkspaceSwitcherProps) {
  const {
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
  } = useStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const handleSwitch = async (id: string) => {
    if (id === activeWorkspaceId) {
      onClose();
      return;
    }
    try {
      await switchWorkspace(id);
      onClose();
    } catch {
      // Error shown in global banner.
    }
  };

  const handleCreate = async () => {
    try {
      await createWorkspace();
      onClose();
    } catch {
      // Error shown in global banner.
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg py-1"
    >
      <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        Workspaces
      </div>

      <div className="max-h-56 overflow-y-auto">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;
          return (
            <button
              key={workspace.id}
              type="button"
              className={clsx(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                isActive
                  ? "bg-[var(--bg-active)] text-[var(--text)]"
                  : "text-[var(--text)] hover:bg-[var(--bg-hover)]"
              )}
              onClick={() => void handleSwitch(workspace.id)}
            >
              <span className="w-5 text-center flex-shrink-0">
                {workspace.icon}
              </span>
              <span className="truncate flex-1">{workspace.name}</span>
              {isActive && (
                <Check size={14} className="flex-shrink-0 text-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="my-1 border-t border-[var(--border)]" />

      <button
        type="button"
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)]"
        onClick={() => void handleCreate()}
      >
        <Plus size={14} className="text-[var(--text-secondary)]" />
        New
      </button>
    </div>
  );
}
