"use client";

/**
 * One question block, rendered identically wherever it appears.
 *
 * The builder's live preview and the public fill page both mount this component
 * and differ only by props: the preview passes `interactive={false}` plus the
 * inline-editing callbacks, the fill page passes `interactive` and real handlers.
 * There is no second renderer to keep in sync, so the preview cannot lie.
 */

import { QUESTION_INPUTS } from "@/components/render/inputs";
import { QuestionHeader } from "@/components/render/QuestionHeader";
import { OkButton } from "@/components/render/OkButton";
import type { AnswerValue, Question } from "@/types";

export interface QuestionRendererProps {
  question: Question;
  /** 1-based badge number. `null` hides the badge (endings). */
  index: number | null;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onAdvance: () => void;
  interactive: boolean;
  autoFocus?: boolean;
  error?: string | null;
  /** The final answerable question submits rather than continuing. */
  isLast?: boolean;
  pending?: boolean;
  /** Supplied only by the builder, which edits the text in place. */
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  /** The builder replaces the choice list with an editable one. */
  bodySlot?: React.ReactNode;
  /** Hidden in the builder preview, where advancing means nothing. */
  showActions?: boolean;
  /** From the form's settings; both default to the flow's usual behaviour. */
  showRequiredAsterisk?: boolean;
  showAnswerLetters?: boolean;
}

export function QuestionRenderer({
  question,
  index,
  value,
  onChange,
  onAdvance,
  interactive,
  autoFocus = false,
  error = null,
  isLast = false,
  pending = false,
  onTitleChange,
  onDescriptionChange,
  bodySlot,
  showActions = true,
  showRequiredAsterisk = false,
  showAnswerLetters = true,
}: QuestionRendererProps) {
  const Input = QUESTION_INPUTS[question.type];

  return (
    <div className="flex w-full flex-col gap-6">
      <QuestionHeader
        question={question}
        index={index}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        showRequiredAsterisk={showRequiredAsterisk}
      />

      <div className="flex flex-col gap-2">
        {bodySlot ??
          (Input ? (
            <Input
              question={question}
              value={value}
              onChange={onChange}
              onAdvance={onAdvance}
              interactive={interactive}
              autoFocus={autoFocus}
              invalid={Boolean(error)}
              showLetters={showAnswerLetters}
            />
          ) : null)}

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>

      {showActions && (
        <div className="pt-1">
          <OkButton
            label={isLast ? "Submit" : "OK"}
            onClick={onAdvance}
            pending={pending}
          />
        </div>
      )}
    </div>
  );
}
