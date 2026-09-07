"use client";

/**
 * The light/dark preference, kept outside React.
 *
 * `data-theme` on <html> is the single source of truth — it is set by the inline
 * script in the root layout before first paint, so an external store reading it
 * needs no effect to catch up and never flashes the wrong theme.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "tf-theme";
const listeners = new Set<() => void>();

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing can refuse storage; the theme still applies for this page.
  }
  listeners.forEach((listener) => listener());
}
