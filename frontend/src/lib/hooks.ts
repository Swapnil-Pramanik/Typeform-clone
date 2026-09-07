"use client";

/** Small hooks with no server-state involvement. */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

//: Vertical arrows mean "previous/next step" in the flow, and nothing to a
//: single-line field — so they are the one kind of key allowed to escape one.
const VERTICAL_ARROWS = new Set(["ArrowUp", "ArrowDown"]);

/**
 * Window-level key handling for the respondent flow.
 *
 * Keystrokes aimed at a focused field are ignored. A letter shortcut must never
 * steal a character from a text answer, and Enter must not advance twice — the
 * text inputs handle their own Enter, so a window-level handler firing as well
 * would skip a question.
 *
 * Vertical arrows are the exception: they carry no meaning inside a single-line
 * input, so they are allowed through to drive step navigation. A textarea keeps
 * them for moving the caret, and anything a component already handled — the
 * dropdown's own list navigation — arrives with `defaultPrevented` set and is
 * left alone.
 */
export function useHotkeys(
  handler: (event: KeyboardEvent) => void,
  enabled = true,
): void {
  const latest = useRef(handler);
  // Written in an effect rather than during render, so the ref is only ever
  // mutated after the render it belongs to has committed.
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable === true;

      if (typing) {
        const escapes = VERTICAL_ARROWS.has(event.key) && tag === "INPUT";
        if (!escapes) return;
      }

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
  useEffect(() => {
    latest.current = onFlush;
  });

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

/** Subscribe to a media query as an external store — no state, no effect. */
function subscribeToMedia(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** `prefers-reduced-motion`, watched live so a mid-session change is honoured. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMedia(REDUCED_MOTION),
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false, // the server cannot know; assume motion is fine
  );
}

const noopSubscribe = () => () => {};

/** True once the component has mounted on the client. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
