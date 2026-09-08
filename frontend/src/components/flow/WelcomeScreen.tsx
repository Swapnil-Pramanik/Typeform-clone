"use client";

/**
 * Optional first screen: centred title, Start button, and a "Takes X minutes"
 * line beneath.
 *
 * Like `EndingScreen`, passing the change callbacks turns the copy into editable
 * text, so the builder previews a welcome screen through this same component
 * rather than a second one that could drift from it.
 */

import { InlineText } from "@/components/ui/InlineText";
import { useHotkeys } from "@/lib/hooks";
import type { WelcomeScreen as WelcomeScreenData } from "@/types";

interface WelcomeScreenProps {
  data: WelcomeScreenData;
  formTitle: string;
  onStart: () => void;
  interactive?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
}

const TITLE_CLASS =
  "text-[32px] leading-tight font-medium text-ink @min-[640px]:text-[40px]";

export function WelcomeScreen({
  data,
  formTitle,
  onStart,
  interactive = true,
  onTitleChange,
  onDescriptionChange,
}: WelcomeScreenProps) {
  useHotkeys((event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStart();
    }
  }, interactive);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
      {onTitleChange ? (
        <InlineText
          value={data.title ?? ""}
          onChange={onTitleChange}
          ariaLabel="Welcome title"
          placeholder={formTitle}
          className={`${TITLE_CLASS} text-center`}
        />
      ) : (
        <h1 className={TITLE_CLASS}>{data.title || formTitle}</h1>
      )}

      {onDescriptionChange ? (
        <InlineText
          value={data.description ?? ""}
          onChange={onDescriptionChange}
          ariaLabel="Welcome description"
          placeholder="Description (optional)"
          className="text-center text-[17px] leading-relaxed text-ink-muted"
        />
      ) : (
        data.description && (
          <p className="text-[17px] leading-relaxed text-ink-muted">{data.description}</p>
        )
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!interactive}
          className="rounded-lg bg-accent px-7 py-3 text-[17px] font-medium text-accent-ink shadow-sm transition-opacity enabled:hover:opacity-90 disabled:cursor-default"
        >
          {data.button_text || "Start"}
        </button>
        {interactive && (
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            press <kbd className="font-sans font-medium">Enter</kbd>
            <span aria-hidden="true">↵</span>
          </span>
        )}
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
