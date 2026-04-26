export type Theme = "dark" | "light";

const STORAGE_KEY = "onl-theme";

function safeMatchMedia(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(query);
}

export function getSystemTheme(): Theme {
  const prefersDark = safeMatchMedia("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === "dark" || value === "light") return value;
  return null;
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function initTheme(): Theme {
  const theme = getStoredTheme() ?? getSystemTheme();
  applyTheme(theme);
  return theme;
}

