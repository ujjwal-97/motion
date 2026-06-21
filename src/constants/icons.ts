import { encodeLucideIcon } from "../utils/pageIcon";

export const DEFAULT_WORKSPACE_ICON = encodeLucideIcon("home");
export const DEFAULT_PAGE_ICON = encodeLucideIcon("file-text");

/** Legacy emoji icons stored before Lucide defaults. */
export const LEGACY_EMOJI_ICON_MAP: Record<string, string> = {
  "🏠": "home",
  "📄": "file-text",
  "📁": "folder",
};
