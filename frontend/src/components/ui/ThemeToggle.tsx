"use client";

/**
 * Light/dark switch.
 *
 * Nearly free given the token layer: it only flips `data-theme` on <html>, and
 * every colour follows because no component names a raw colour.
 */

import { useSyncExternalStore } from "react";

import { Moon, Sun } from "@/components/ui/icons";
import { readTheme, setTheme, subscribeToTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    () => "light" as const,
  );
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
    >
      {dark ? <Moon /> : <Sun />}
    </button>
  );
}
