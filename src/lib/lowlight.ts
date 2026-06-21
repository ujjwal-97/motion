import { createLowlight, common } from "lowlight";

export const lowlight = createLowlight(common);

export const SUPPORTED_LANGUAGES = lowlight.listLanguages().sort();

export function detectLanguage(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const result = lowlight.highlightAuto(trimmed);
  const language = result.data?.language;
  return typeof language === "string" ? language : null;
}
