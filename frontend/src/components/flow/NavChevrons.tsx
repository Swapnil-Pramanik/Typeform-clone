"use client";

/** Stacked up/down buttons in the bottom-right corner, beside the Powered-by badge. */

import { ChevronDown, ChevronUp } from "@/components/ui/icons";
import { cn } from "@/lib/format";

interface NavChevronsProps {
  onUp: () => void;
  onDown: () => void;
  canGoUp: boolean;
  canGoDown: boolean;
  /** Form settings. With both off the corner is empty and nothing renders. */
  showArrows?: boolean;
  showBranding?: boolean;
}

const BUTTON =
  "flex h-9 w-9 items-center justify-center bg-accent text-accent-ink transition-opacity disabled:opacity-30";

export function NavChevrons({
  onUp,
  onDown,
  canGoUp,
  canGoDown,
  showArrows = true,
  showBranding = true,
}: NavChevronsProps) {
  if (!showArrows && !showBranding) return null;

  return (
    <div className="fixed bottom-5 right-5 z-30 flex items-center gap-3">
      {showBranding && (
      <a
        href="https://www.typeform.com"
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-[11px] font-medium text-ink-muted shadow-sm hover:text-ink"
      >
        Powered by <span className="font-semibold text-ink">Typeform</span>
      </a>
      )}

      {showArrows && (
      <div className="flex overflow-hidden rounded-md shadow-sm">
        <button
          type="button"
          onClick={onUp}
          disabled={!canGoUp}
          aria-label="Previous question"
          className={cn(BUTTON, "border-r border-accent-ink/20")}
        >
          <ChevronUp width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={!canGoDown}
          aria-label="Next question"
          className={BUTTON}
        >
          <ChevronDown width={16} height={16} />
        </button>
      </div>
      )}
    </div>
  );
}
