"use client";

/**
 * The thank-you screen, rendered from data.
 *
 * Endings are rows in `questions` with `type = "ending"`, so a creator can edit
 * the copy and the button label without a code change — which is why the submit
 * endpoint returns the ending payload rather than the client hardcoding one.
 *
 * Like `QuestionHeader`, passing the change callbacks turns the copy into
 * editable text, so the builder previews an ending through this same component.
 */

import { Check } from "@/components/ui/icons";
import { InlineText } from "@/components/ui/InlineText";
import type { EndingPayload } from "@/types";

interface EndingScreenProps {
  ending: EndingPayload | null;
  onRestart?: () => void;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
}

const TITLE_CLASS =
  "text-[28px] leading-tight font-medium text-ink sm:text-[34px]";

export function EndingScreen({
  ending,
  onRestart,
  onTitleChange,
  onDescriptionChange,
}: EndingScreenProps) {
  const editable = Boolean(onTitleChange);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink">
        <Check width={22} height={22} />
      </span>

      {onTitleChange ? (
        <InlineText
          value={ending?.title ?? ""}
          onChange={onTitleChange}
          ariaLabel="Ending title"
          placeholder="Thanks for completing this typeform!"
          className={`${TITLE_CLASS} text-center`}
        />
      ) : (
        <h1 className={TITLE_CLASS}>
          {ending?.title ?? "Thanks for completing this typeform!"}
        </h1>
      )}

      {onDescriptionChange ? (
        <InlineText
          value={ending?.description ?? ""}
          onChange={onDescriptionChange}
          ariaLabel="Ending description"
          placeholder="Description (optional)"
          className="text-center text-[17px] text-ink-muted"
        />
      ) : (
        ending?.description && (
          <p className="text-[17px] text-ink-muted">{ending.description}</p>
        )
      )}

      {(onRestart || editable) && (
        <button
          type="button"
          onClick={onRestart}
          disabled={!onRestart}
          className="mt-2 rounded-lg border border-line-strong px-5 py-2.5 text-[15px] font-medium text-ink transition-colors enabled:hover:bg-muted disabled:cursor-default"
        >
          {ending?.settings?.button_text ?? "Submit another response"}
        </button>
      )}
    </div>
  );
}
