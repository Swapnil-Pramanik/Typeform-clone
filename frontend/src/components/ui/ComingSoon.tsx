"use client";

import { useCallback } from "react";

import { Lock } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

/**
 * Everything the product shows but this build does not implement.
 *
 * Two shapes, one message. A whole area — a workspace tab, the Connect screen —
 * gets the `<ComingSoon>` panel. An individual control that would otherwise sit
 * there inert gets `useComingSoon()`, which answers a click with a toast naming
 * the feature.
 *
 * The rule is that nothing is silently dead: a control that cannot do anything
 * still has to say so when pressed, or it reads as a bug rather than a scope
 * decision.
 */

export function useComingSoon(): (feature: string) => void {
  const toast = useToast();
  return useCallback(
    (feature: string) => toast.show(`Coming soon — ${feature}`),
    [toast],
  );
}

/**
 * Props for a control that only announces itself. Spread onto a `<button>` so
 * it stays focusable and keyboard-reachable rather than being `disabled`, which
 * would swallow the click and tell the user nothing.
 */
export function comingSoonProps(
  announce: (feature: string) => void,
  feature: string,
) {
  return {
    title: `${feature} — coming soon`,
    "aria-label": `${feature} (coming soon)`,
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      announce(feature);
    },
  } as const;
}

export function ComingSoon({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-line bg-panel px-8 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-ink-muted">
        <Lock width={20} height={20} />
      </span>
      <div>
        <h2 className="text-lg font-medium text-ink">{title}</h2>
        <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
      </div>
      {items && (
        <ul className="mt-1 flex flex-wrap justify-center gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-line bg-muted px-3 py-1 text-xs text-ink-muted"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-faint">
        Out of scope for this build — the placement is real, the feature is not.
      </p>
    </div>
  );
}
