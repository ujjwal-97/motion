import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import { IconPicker } from "./IconPicker";
import { PageIcon } from "./PageIcon";

interface PageHeaderProps {
  pageId: string;
}

export function PageHeader({ pageId }: PageHeaderProps) {
  const { pages, updateTitle, updateIcon } = useStore();
  const page = pages.find((p) => p.id === pageId);
  const [titleValue, setTitleValue] = useState(page?.title ?? "");
  const [iconOpen, setIconOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitleValue(page?.title ?? "");
  }, [pageId, page?.title]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [titleValue]);

  const handleTitleBlur = () => {
    const val = titleValue.trim() || "Untitled";
    setTitleValue(val);
    updateTitle(pageId, val);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    }
  };

  if (!page) return null;

  return (
    <div className="w-full max-w-[720px] mx-auto px-16 pt-16 pb-4">
      <div className="relative mb-3" ref={iconRef}>
        <button
          type="button"
          className="w-14 h-14 flex items-center justify-center text-[var(--text)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          onClick={() => setIconOpen((v) => !v)}
          title="Change icon"
        >
          <PageIcon icon={page.icon} size="xl" />
        </button>

        <IconPicker
          open={iconOpen}
          onClose={() => setIconOpen(false)}
          currentIcon={page.icon}
          onSelect={(icon) => updateIcon(pageId, icon)}
        />
      </div>

      <textarea
        ref={titleRef}
        className="w-full resize-none bg-transparent text-[var(--text)] text-4xl font-bold leading-tight placeholder-[var(--text-placeholder)] outline-none overflow-hidden"
        value={titleValue}
        placeholder="Untitled"
        onChange={(e) => setTitleValue(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        rows={1}
        spellCheck
      />
    </div>
  );
}
