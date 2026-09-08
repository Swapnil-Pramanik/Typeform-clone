"use client";

/**
 * The numbered badge, question text and description.
 *
 * Shared by the respondent flow and the builder preview. When `onTitleChange` is
 * supplied the text becomes editable in place; otherwise it renders as static
 * text. The badge sits *inline* immediately before the question text, which is
 * what the real product does.
 */

import { InlineText } from "@/components/ui/InlineText";
import { cn } from "@/lib/format";
import type { Question } from "@/types";

interface QuestionHeaderProps {
  question: Question;
  /** 1-based number shown in the badge. Endings show no badge. */
  index: number | null;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  /** Form settings: an asterisk marks a required question when switched on. */
  showRequiredAsterisk?: boolean;
}

// `min-w-0 flex-1` is load-bearing: the title sits in a flex row beside the
// number badge, and a flex item defaults to `min-width: auto` — it refuses to
// shrink below its content. At 390px that pushed the row wider than the card,
// and because the column stretches to its widest child it took the description
// out with it. Both were clipped by the card's overflow.
const TITLE_CLASS =
  "min-w-0 flex-1 text-[26px] @min-[640px]:text-[30px] leading-snug font-normal text-ink";

export function QuestionHeader({
  question,
  index,
  onTitleChange,
  onDescriptionChange,
  showRequiredAsterisk = false,
}: QuestionHeaderProps) {
  const editable = Boolean(onTitleChange);
  const showDescription = editable || Boolean(question.description);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        {index !== null && (
          <span
            className={cn(
              "mt-[9px] flex h-[22px] min-w-[22px] shrink-0 items-center justify-center",
              "rounded-md bg-accent px-1.5 text-[12px] font-medium text-accent-ink",
            )}
            aria-hidden="true"
          >
            {index}
          </span>
        )}

        {onTitleChange ? (
          <InlineText
            value={question.title}
            onChange={onTitleChange}
            ariaLabel="Question text"
            placeholder="Your question here"
            className={TITLE_CLASS}
          />
        ) : (
          <h1 className={TITLE_CLASS}>
            {question.title}
            {showRequiredAsterisk && question.required && (
              <span aria-hidden="true" className="text-ink-muted">
                {" "}
                *
              </span>
            )}
          </h1>
        )}
      </div>

      {showDescription && (
        <div className={cn(index !== null && "pl-[32px]")}>
          {onDescriptionChange ? (
            <InlineText
              value={question.description ?? ""}
              onChange={onDescriptionChange}
              ariaLabel="Description"
              placeholder="Description (optional)"
              className="text-[15px] text-ink-muted"
            />
          ) : (
            <p className="text-[15px] text-ink-muted">{question.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
