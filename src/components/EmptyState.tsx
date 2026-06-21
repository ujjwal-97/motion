import { Plus } from "lucide-react";
import { useStore } from "../store";
import { AppIcon } from "./AppIcon";

export function EmptyState() {
  const { createPage, selectPage } = useStore();

  const handleCreate = async () => {
    try {
      const page = await createPage(null);
      await selectPage(page.id);
    } catch {
      // Error is shown in the global banner.
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm ring-1 ring-[var(--border)]">
        <AppIcon size={64} className="w-full h-full" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
          No page selected
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs">
          Select a page from the sidebar, or create a new one to start writing.
        </p>
      </div>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        onClick={handleCreate}
      >
        <Plus size={15} />
        New page
      </button>
    </div>
  );
}
