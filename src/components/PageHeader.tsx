import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";

const COMMON_EMOJIS = [
  "📄","📝","📋","📌","📍","📎","🗒","🗓","📅","📆",
  "💡","🔑","🏠","🚀","⭐","🎯","🔥","💎","🌟","✅",
  "📊","📈","📉","🗂","📁","💼","🎨","🎵","🎬","📸",
  "🌍","🌱","🍎","☕","🏋","🧠","💻","🔧","⚙","🛡",
  "🎉","🎁","❤","🙌","👋","🤝","💬","💭","🔔","📢",
];

interface PageHeaderProps {
  pageId: string;
}

export function PageHeader({ pageId }: PageHeaderProps) {
  const { pages, updateTitle, updateIcon } = useStore();
  const page = pages.find((p) => p.id === pageId);
  const [titleValue, setTitleValue] = useState(page?.title ?? "");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  /* Sync local title when page changes */
  useEffect(() => {
    setTitleValue(page?.title ?? "");
  }, [pageId, page?.title]);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [titleValue]);

  /* Close emoji picker on outside click */
  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen]);

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

  const handleEmojiSelect = (emoji: string) => {
    updateIcon(pageId, emoji);
    setEmojiOpen(false);
  };

  if (!page) return null;

  return (
    <div className="w-full max-w-[720px] mx-auto px-16 pt-16 pb-4">
      {/* Icon */}
      <div className="relative mb-3" ref={emojiRef}>
        <button
          className="text-5xl hover:bg-[var(--bg-hover)] rounded-lg p-1 transition-colors leading-none"
          onClick={() => setEmojiOpen((v) => !v)}
          title="Change icon"
        >
          {page.icon}
        </button>

        {/* Emoji picker */}
        {emojiOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl p-3 w-72">
            <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">
              Common icons
            </p>
            <div className="grid grid-cols-10 gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-[var(--bg-hover)] transition-colors"
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2 mb-1 font-medium">
              Or paste any emoji
            </p>
            <input
              className="w-full px-2 py-1 text-sm bg-[var(--bg-hover)] rounded-md border border-[var(--border)] outline-none focus:border-[var(--accent)]"
              placeholder="Paste emoji…"
              maxLength={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  handleEmojiSelect(e.currentTarget.value);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Page title */}
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
