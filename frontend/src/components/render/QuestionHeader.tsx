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
}

const TITLE_CLASS =
  "text-[26px] sm:text-[30px] leading-snug font-normal text-ink";

export function QuestionHeader({
  question,
  index,
  onTitleChange,
  onDescriptionChange,
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
          <h1 className={TITLE_CLASS}>{question.title}</h1>
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
