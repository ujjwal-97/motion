import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useStore } from "../store";
import type { SearchResult } from "../types";
import { clsx } from "clsx";
import { PageIcon } from "./PageIcon";

export function CommandMenu() {
  const { commandMenuOpen, toggleCommandMenu, selectPage } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchPages, pages } = useStore();

  /* Focus input on open */
  useEffect(() => {
    if (commandMenuOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandMenuOpen]);

  /* Search on query change */
  useEffect(() => {
    if (!commandMenuOpen) return;
    if (!query.trim()) {
      // Show recent pages
      const recent = [...pages]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8)
        .map((p) => ({ id: p.id, title: p.title, icon: p.icon, snippet: "" }));
      setResults(recent);
      return;
    }
    searchPages(query.trim()).then((res) => {
      setResults(res);
      setSelectedIndex(0);
    });
  }, [query, commandMenuOpen, pages]);

  /* Keyboard navigation */
  useEffect(() => {
    if (!commandMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { toggleCommandMenu(); return; }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i === 0 ? results.length - 1 : i - 1));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        selectPage(results[selectedIndex].id);
        toggleCommandMenu();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandMenuOpen, results, selectedIndex]);

  if (!commandMenuOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={toggleCommandMenu}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={15} className="text-[var(--text-secondary)] flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[var(--text)] text-sm outline-none placeholder-[var(--text-placeholder)]"
            placeholder="Search or jump to a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)]"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && query ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No pages found for "{query}"
            </div>
          ) : (
            results.map((result, i) => (
              <button
                key={result.id}
                className={clsx(
                  "w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-hover)]",
                  i === selectedIndex && "bg-[var(--bg-hover)]"
                )}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => {
                  selectPage(result.id);
                  toggleCommandMenu();
                }}
              >
                <span className="mt-0.5 flex-shrink-0">
                  <PageIcon icon={result.icon} size="md" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] truncate">
                    {result.title || "Untitled"}
                  </div>
                  {result.snippet && (
                    <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {result.snippet}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--text-secondary)]">
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            <kbd className="font-mono">↵</kbd> open
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            <kbd className="font-mono">Esc</kbd> dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
