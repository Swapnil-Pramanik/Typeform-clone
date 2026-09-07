"use client";

/** Optional first screen: centred title, Start button, and a "Takes X minutes" line. */

import { useHotkeys } from "@/lib/hooks";
import type { WelcomeScreen as WelcomeScreenData } from "@/types";

interface WelcomeScreenProps {
  data: WelcomeScreenData;
  formTitle: string;
  onStart: () => void;
  interactive?: boolean;
}

export function WelcomeScreen({
  data,
  formTitle,
  onStart,
  interactive = true,
}: WelcomeScreenProps) {
  useHotkeys((event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStart();
    }
  }, interactive);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <h1 className="text-[32px] leading-tight font-medium text-ink sm:text-[40px]">
        {data.title || formTitle}
      </h1>
      {data.description && (
        <p className="text-[17px] leading-relaxed text-ink-muted">{data.description}</p>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onStart}
          className="rounded-lg bg-accent px-7 py-3 text-[17px] font-medium text-accent-ink shadow-sm transition-opacity hover:opacity-90"
        >
          {data.button_text || "Start"}
        </button>
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          press <kbd className="font-sans font-medium">Enter</kbd>
          <span aria-hidden="true">↵</span>
        </span>
      </div>

      {data.estimated_minutes ? (
        <p className="text-sm text-ink-faint">
          Takes {data.estimated_minutes} minute
          {data.estimated_minutes === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
