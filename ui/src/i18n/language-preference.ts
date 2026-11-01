export const LANGUAGE_STORAGE_KEY = "paperclip.ui.language";
export type UiLanguage = "en" | "zh-CN";

export function resolveUiLanguage(saved: string | null, defaultLanguage: UiLanguage = "zh-CN"): UiLanguage {
  if (saved === "en" || saved === "zh-CN") return saved;
  return defaultLanguage;
}

export function readUiLanguage(): UiLanguage {
  // Server rendering and the existing Node-based test suite retain English.
  if (typeof window === "undefined") return "en";
  try {
    const defaultLanguage = import.meta.env.VITE_DEFAULT_UI_LANGUAGE === "en" ? "en" : "zh-CN";
    return resolveUiLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY), defaultLanguage);
  } catch {
    return "zh-CN";
  }
}

export function saveUiLanguage(language: UiLanguage) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
