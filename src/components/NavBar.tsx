import { Loader2, ChevronRight } from "lucide-react";
import { useStore } from "../store";
import { PageIcon } from "./PageIcon";
import { DEFAULT_PAGE_ICON } from "../constants/icons";

export function NavBar() {
  const { pages, activePageId, isSaving, selectPage } = useStore();

  const activePage = pages.find((p) => p.id === activePageId);

  const breadcrumb: typeof activePage[] = [];
  if (activePage) {
    let current: (typeof activePage) | undefined = activePage;
    while (current) {
      breadcrumb.unshift(current);
      current = pages.find((p) => p.id === current?.parentId);
    }
  }

  return (
    <nav className="flex items-center gap-1 px-3 h-11 border-b border-[var(--border)] bg-[var(--bg)] flex-shrink-0">
      <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden">
        {breadcrumb.length > 0 ? (
          breadcrumb.map((page, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <span key={page?.id} className="flex items-center gap-0.5 min-w-0">
                {i > 0 && (
                  <ChevronRight
                    size={12}
                    className="text-[var(--text-secondary)] flex-shrink-0 opacity-60"
                  />
                )}
                <button
                  type="button"
                  className={`flex items-center gap-1 min-w-0 rounded px-1.5 py-0.5 text-sm transition-colors ${
                    isLast
                      ? "text-[var(--text)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                  }`}
                  onClick={() => page && selectPage(page.id)}
                  title={page?.title}
                  disabled={isLast}
                >
                  <span className="flex-shrink-0">
                    <PageIcon icon={page?.icon ?? DEFAULT_PAGE_ICON} size="xs" />
                  </span>
                  <span className="truncate max-w-[140px]">
                    {page?.title || "Untitled"}
                  </span>
                </button>
              </span>
            );
          })
        ) : (
          <span className="text-sm text-[var(--text-secondary)]">
            No page selected
          </span>
        )}
      </div>

      {isSaving && (
        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] flex-shrink-0">
          <Loader2 size={11} className="animate-spin" />
          Saving…
        </span>
      )}
    </nav>
  );
}
