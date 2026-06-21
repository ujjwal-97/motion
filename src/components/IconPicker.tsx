import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Link2, Shapes } from "lucide-react";
import { PAGE_ICON_PACK } from "./pageIconPack";
import { PageIcon } from "./PageIcon";
import {
  encodeLucideIcon,
  isIconUrl,
  normalizeIconUrl,
} from "../utils/pageIcon";

type PickerTab = "icons" | "link";

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  currentIcon: string;
  onSelect: (icon: string) => void;
}

export function IconPicker({
  open,
  onClose,
  currentIcon,
  onSelect,
}: IconPickerProps) {
  const [tab, setTab] = useState<PickerTab>("icons");
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab("icons");
    setLinkValue(isIconUrl(currentIcon) ? currentIcon : "");
    setLinkError(null);
  }, [open, currentIcon]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const handleLucideSelect = (name: string) => {
    onSelect(encodeLucideIcon(name));
    onClose();
  };

  const handleLinkSubmit = () => {
    const url = normalizeIconUrl(linkValue);
    if (!url) {
      setLinkError("Enter a valid http or https link");
      return;
    }
    onSelect(url);
    onClose();
  };

  if (!open) return null;

  const previewUrl = normalizeIconUrl(linkValue);

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-1 z-50 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl w-80 overflow-hidden"
    >
      <div className="flex border-b border-[var(--border)]">
        <button
          type="button"
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
            tab === "icons"
              ? "text-[var(--text)] border-b-2 border-[var(--text)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text)]"
          )}
          onClick={() => setTab("icons")}
        >
          <Shapes size={13} />
          Icons
        </button>
        <button
          type="button"
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
            tab === "link"
              ? "text-[var(--text)] border-b-2 border-[var(--text)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text)]"
          )}
          onClick={() => setTab("link")}
        >
          <Link2 size={13} />
          Link
        </button>
      </div>

      {tab === "icons" ? (
        <div className="p-3 max-h-72 overflow-y-auto text-[var(--text)]">
          <div className="grid grid-cols-8 gap-1">
            {PAGE_ICON_PACK.map(({ name, icon: Icon, label }) => {
              const selected =
                currentIcon === encodeLucideIcon(name) ||
                currentIcon === name;
              return (
                <button
                  key={name}
                  type="button"
                  title={label}
                  className={clsx(
                    "w-8 h-8 flex items-center justify-center rounded-md transition-colors text-[var(--text)]",
                    selected
                      ? "bg-[var(--bg-active)] ring-1 ring-[var(--border)]"
                      : "hover:bg-[var(--bg-hover)]"
                  )}
                  onClick={() => handleLucideSelect(name)}
                >
                  <Icon size={16} strokeWidth={1.75} className="page-icon-lucide" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Paste a link to an image. The icon is loaded from that URL.
          </p>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--bg-hover)] border border-[var(--border)] flex-shrink-0">
              {previewUrl ? (
                <PageIcon icon={previewUrl} size="md" />
              ) : (
                <Link2 size={16} className="text-[var(--text-secondary)]" />
              )}
            </div>
            <input
              className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-[var(--bg-hover)] rounded-md border border-[var(--border)] outline-none focus:border-[var(--accent)]"
              placeholder="https://example.com/icon.png"
              value={linkValue}
              onChange={(e) => {
                setLinkValue(e.target.value);
                setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLinkSubmit();
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").trim();
                const url = normalizeIconUrl(pasted);
                if (!url) return;
                e.preventDefault();
                onSelect(url);
                onClose();
              }}
            />
          </div>

          {linkError && (
            <p className="text-xs text-red-500">{linkError}</p>
          )}

          <button
            type="button"
            className="w-full px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            disabled={!linkValue.trim()}
            onClick={handleLinkSubmit}
          >
            Use link
          </button>
        </div>
      )}
    </div>
  );
}
