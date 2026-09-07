"use client";

/**
 * Light/dark switch.
 *
 * Nearly free given the token layer: it only flips `data-theme` on <html>, and
 * every colour follows because no component names a raw colour.
 */

import { useEffect, useState } from "react";

import { Moon, Sun } from "@/components/ui/icons";
import { useMounted } from "@/lib/hooks";

const STORAGE_KEY = "tf-theme";

export function ThemeToggle() {
  const mounted = useMounted();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial =
      stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(initial);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark, mounted]);

  return (
    <button
      type="button"
      onClick={() => setDark((value) => !value)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-choice hover:text-ink"
    >
      {mounted && dark ? <Moon /> : <Sun />}
    </button>
  );
}
