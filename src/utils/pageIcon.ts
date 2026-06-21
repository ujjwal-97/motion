import { LEGACY_EMOJI_ICON_MAP } from "../constants/icons";

export const LUCIDE_ICON_PREFIX = "lucide:";

export function isIconUrl(icon: string): boolean {
  const trimmed = icon.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLucideIcon(icon: string): boolean {
  return icon.startsWith(LUCIDE_ICON_PREFIX);
}

export function parseLucideIcon(icon: string): string | null {
  if (!isLucideIcon(icon)) return null;
  const name = icon.slice(LUCIDE_ICON_PREFIX.length).trim();
  return name || null;
}

export function encodeLucideIcon(name: string): string {
  return `${LUCIDE_ICON_PREFIX}${name}`;
}

export function resolveLucideIconName(icon: string): string | null {
  const parsed = parseLucideIcon(icon);
  if (parsed) return parsed;
  return LEGACY_EMOJI_ICON_MAP[icon] ?? null;
}

export function normalizeIconUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!isIconUrl(trimmed)) return null;
  return trimmed;
}
