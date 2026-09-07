"use client";

/**
 * Multiple choice — full-width cards with a letter key, as in the real flow.
 *
 * Pressing A, B, C… selects the matching option. A single-select question
 * advances on its own after a short beat; a multi-select one waits for OK,
 * because the respondent may not be finished picking.
 */

import { useEffect, useRef } from "react";

import type { QuestionInputProps } from "@/components/render/types";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { useHotkeys } from "@/lib/hooks";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Long enough for the selection to register visually before the card moves. */
const AUTO_ADVANCE_MS = 320;

function toArray(value: QuestionInputProps["value"]): number[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "number") return [value];
  return [];
}

export function ChoiceInput({
  question,
  value,
  onChange,
  onAdvance,
  interactive,
  invalid,
  showLetters = true,
}: QuestionInputProps) {
  const multi = Boolean(question.settings?.multi_select);
  const selected = toArray(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toggle = (optionId: number) => {
    if (!interactive) return;

    if (multi) {
      onChange(
        selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      );
      return;
    }

    onChange([optionId]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onAdvance, AUTO_ADVANCE_MS);
  };

  useHotkeys((event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const index = LETTERS.indexOf(event.key.toUpperCase());
    const option = question.options[index];
    if (index >= 0 && option) {
      event.preventDefault();
      toggle(option.id);
    }
  }, interactive);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5" role="listbox" aria-multiselectable={multi}>
        {question.options.map((option, index) => {
          const isSelected = selected.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={!interactive}
                onClick={() => toggle(option.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left",
                  "text-[17px] transition-colors duration-150",
                  isSelected
                    ? "bg-choice-selected text-ink-strong ring-1 ring-ink/25"
                    : "bg-choice text-ink hover:bg-choice-hover",
                  invalid && "ring-1 ring-danger",
                  !interactive && "cursor-default",
                )}
              >
                {showLetters && (
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded",
                      "border border-line-strong bg-choice-key text-xs font-medium",
                    )}
                  >
                    {LETTERS[index] ?? index + 1}
                  </span>
                )}
                <span className="flex-1">{option.label}</span>
                {isSelected && <Check width={16} height={16} className="shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      {multi && (
        <p className="text-xs text-ink-faint">Choose as many as you like</p>
      )}
    </div>
  );
}
