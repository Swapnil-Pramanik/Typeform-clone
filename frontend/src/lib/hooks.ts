"use client";

/** Small hooks with no server-state involvement. */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Window-level key handling for the respondent flow.
 *
 * Keystrokes aimed at a focused field are ignored entirely. A letter shortcut
 * must never steal a character from a text answer, and Enter must not advance
 * twice — the text inputs already handle their own Enter, so a window-level
 * handler firing as well would skip a question.
 */
export function useHotkeys(
  handler: (event: KeyboardEvent) => void,
  enabled = true,
): void {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable === true;
      if (typing) return;
      latest.current(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/**
 * Calls `onFlush` once the value has stopped changing for `delay` ms.
 *
 * This is the whole of the builder's autosave: no dirty-state bookkeeping and no
 * save button, which is also what the real product does.
 */
export function useDebouncedCallback<T>(
  onFlush: (value: T) => void,
  delay = 600,
): (value: T) => void {
  const latest = useRef(onFlush);
  latest.current = onFlush;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (value: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(value), delay);
    },
    [delay],
  );
}

/** `prefers-reduced-motion`, watched live so a mid-session change is honoured. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** True once the component has mounted on the client. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
