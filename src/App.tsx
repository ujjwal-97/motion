import { useEffect } from "react";
import { useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { NavBar } from "./components/NavBar";
import { PageHeader } from "./components/PageHeader";
import { Editor } from "./components/Editor";
import { CommandMenu } from "./components/CommandMenu";
import { EmptyState } from "./components/EmptyState";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { isDesktopApp } from "./platform";

export default function App() {
  const {
    loadPages,
    loadWorkspaces,
    activePageId,
    activeContent,
    sidebarOpen,
    toggleCommandMenu,
    error,
    clearError,
  } = useStore();

  const inDesktopApp = isDesktopApp();

  /* Load pages on startup */
  useEffect(() => {
    if (inDesktopApp) {
      loadPages();
      loadWorkspaces();
    }
  }, [inDesktopApp]);

  /* Global keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandMenu();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="flex h-screen bg-[var(--bg)] overflow-hidden"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {!inDesktopApp && (
        <div className="absolute top-0 inset-x-0 z-50 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-sm text-[var(--text)]">
          Run <code className="font-mono">npm run tauri dev</code> to use pages.
          The browser preview cannot access local storage.
        </div>
      )}

      {error && (
        <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between gap-3 px-4 py-2 bg-red-500/15 border-b border-red-500/30 text-sm text-[var(--text)]">
          <span>{error}</span>
          <button
            className="text-xs underline opacity-80 hover:opacity-100"
            onClick={clearError}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && <Sidebar />}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 bg-[var(--bg)]">
        <TabBar />
        <NavBar />

        {activePageId ? (
          <div className="flex-1 overflow-y-auto">
            <ErrorBoundary key={activePageId}>
              <PageHeader pageId={activePageId} />
              <div className="max-w-[720px] mx-auto px-16 pb-24">
                <Editor
                  pageId={activePageId}
                  initialContent={activeContent}
                />
              </div>
            </ErrorBoundary>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Global overlays */}
      <CommandMenu />
    </div>
  );
}
