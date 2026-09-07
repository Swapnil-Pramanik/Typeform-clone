"use client";

/**
 * The choice list as the builder edits it: click a label and type, Enter adds
 * the next choice, Backspace on an empty label removes it.
 *
 * It is passed to `QuestionRenderer` as the body slot, so the surrounding
 * question — badge, title, description, spacing — is still drawn by the one
 * shared renderer rather than by a builder-only copy of it.
 */

import { useState } from "react";

import { Plus, Trash } from "@/components/ui/icons";
import { InlineText } from "@/components/ui/InlineText";
import type { Question } from "@/types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface EditableChoiceListProps {
  question: Question;
  onChange: (labels: string[]) => void;
}

export function EditableChoiceList({ question, onChange }: EditableChoiceListProps) {
  const labels = question.options.map((option) => option.label);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const replace = (index: number, label: string) =>
    onChange(labels.map((existing, i) => (i === index ? label : existing)));

  const insertAfter = (index: number) => {
    const next = [...labels];
    next.splice(index + 1, 0, "");
    onChange(next);
    setFocusIndex(index + 1);
  };

  const removeAt = (index: number) => {
    if (labels.length === 1) return;
    onChange(labels.filter((_, i) => i !== index));
    setFocusIndex(Math.max(index - 1, 0));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {question.options.map((option, index) => (
        <div
          key={`${option.id}-${index}`}
          className="group flex items-center gap-3 rounded-lg bg-choice px-4 py-3"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line-strong bg-choice-key text-xs font-medium">
            {LETTERS[index] ?? index + 1}
          </span>

          <InlineText
            value={option.label}
            onChange={(label) => replace(index, label)}
            ariaLabel={`Choice ${index + 1}`}
            placeholder="Choice"
            className="text-[17px]"
            autoFocus={focusIndex === index}
            onEnter={() => insertAfter(index)}
            onBackspaceWhenEmpty={() => removeAt(index)}
          />

          <button
            type="button"
            onClick={() => removeAt(index)}
            aria-label={`Delete choice ${index + 1}`}
            disabled={labels.length === 1}
            className="rounded p-1 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 disabled:hidden"
          >
            <Trash width={15} height={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => insertAfter(labels.length - 1)}
        className="flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-choice hover:text-ink"
      >
        <Plus width={14} height={14} />
        Add choice
      </button>
    </div>
  );
}
