"use client";

/** Yes/No — two lettered cards. Y and N pick, then the flow advances itself. */

import { useEffect, useRef } from "react";

import type { QuestionInputProps } from "@/components/render/types";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { useHotkeys } from "@/lib/hooks";

const AUTO_ADVANCE_MS = 320;

const CHOICES = [
  { key: "Y", label: "Yes", value: true },
  { key: "N", label: "No", value: false },
] as const;

export function YesNoInput({
  value,
  onChange,
  onAdvance,
  interactive,
  invalid,
}: QuestionInputProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const pick = (next: boolean) => {
    if (!interactive) return;
    onChange(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onAdvance, AUTO_ADVANCE_MS);
  };

  useHotkeys((event) => {
    if (event.metaKey || event.ctrlKey) return;
    const match = CHOICES.find((choice) => choice.key === event.key.toUpperCase());
    if (match) {
      event.preventDefault();
      pick(match.value);
    }
  }, interactive);

  return (
    <div className="flex max-w-sm flex-col gap-2.5">
      {CHOICES.map((choice) => {
        const isSelected = value === choice.value;
        return (
          <button
            key={choice.key}
            type="button"
            disabled={!interactive}
            aria-pressed={isSelected}
            onClick={() => pick(choice.value)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3.5 text-left text-[17px]",
              "transition-colors duration-150",
              isSelected
                ? "bg-choice-selected text-ink-strong ring-1 ring-ink/25"
                : "bg-choice text-ink hover:bg-choice-hover",
              invalid && "ring-1 ring-danger",
              !interactive && "cursor-default",
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line-strong bg-choice-key text-xs font-medium">
              {choice.key}
            </span>
            <span className="flex-1">{choice.label}</span>
            {isSelected && <Check width={16} height={16} />}
          </button>
        );
      })}
    </div>
  );
}
