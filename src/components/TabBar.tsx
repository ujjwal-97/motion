import { PanelLeft, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "../store";

export function TabBar() {
  const {
    pages,
    openTabIds,
    activePageId,
    sidebarOpen,
    setSidebarOpen,
    selectPage,
    closeTab,
    openNewTab,
  } = useStore();

  const tabs = openTabIds
    .map((id) => pages.find((p) => p.id === id))
    .filter(Boolean);

  const handleNewTab = async () => {
    try {
      await openNewTab();
    } catch {
      // Error shown in global banner.
    }
  };

  return (
    <div className="relative flex items-end h-[52px] border-b border-[var(--border)] bg-[var(--bg-sidebar)] flex-shrink-0">
      <div
        data-tauri-drag-region="deep"
        className="absolute inset-0 z-0"
        aria-hidden
      />

      {/* Sidebar toggle — aligned with tab row */}
      <div
        className={clsx(
          "relative z-10 flex flex-shrink-0 h-8 pointer-events-none",
          sidebarOpen ? "pl-2 pr-1" : "pl-[68px] pr-1"
        )}
      >
        <button
          type="button"
          data-tauri-drag-region="false"
          className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <PanelLeft size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex items-end min-w-0 flex-1 overflow-x-auto scrollbar-none pointer-events-none">
        <div className="flex items-end gap-px pointer-events-none">
          {tabs.map((page) => {
            if (!page) return null;
            const isActive = page.id === activePageId;
            return (
              <div
                key={page.id}
                data-tauri-drag-region="false"
                className={clsx(
                  "pointer-events-auto group flex items-center gap-1.5 h-8 max-w-[200px] min-w-[120px] px-2.5 rounded-t-md border border-b-0 cursor-pointer transition-colors flex-shrink-0",
                  isActive
                    ? "bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                    : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                )}
                onClick={() => void selectPage(page.id, { switchOnly: true })}
              >
                <span className="text-sm flex-shrink-0 leading-none">
                  {page.icon}
                </span>
                <span className="text-xs truncate flex-1 font-medium">
                  {page.title || "Untitled"}
                </span>
                <button
                  type="button"
                  data-tauri-drag-region="false"
                  className={clsx(
                    "w-4 h-4 flex items-center justify-center rounded flex-shrink-0 text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text)]",
                    isActive
                      ? "opacity-70 hover:opacity-100"
                      : "opacity-0 group-hover:opacity-70 hover:!opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(page.id);
                  }}
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            data-tauri-drag-region="false"
            className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] flex-shrink-0"
            onClick={() => void handleNewTab()}
            title="New tab"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
