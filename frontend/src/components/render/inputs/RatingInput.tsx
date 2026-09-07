"use client";

/** Rating — a row of stars. Number keys pick, then the flow advances itself. */

import { useEffect, useRef, useState } from "react";

import type { QuestionInputProps } from "@/components/render/types";
import { Star } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { useHotkeys } from "@/lib/hooks";
import { DEFAULT_MAX_RATING } from "@/lib/validation";

const AUTO_ADVANCE_MS = 380;

export function RatingInput({
  question,
  value,
  onChange,
  onAdvance,
  interactive,
  invalid,
}: QuestionInputProps) {
  const max = question.settings?.max_rating ?? DEFAULT_MAX_RATING;
  const selected = typeof value === "number" ? value : 0;
  const [hovered, setHovered] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const pick = (score: number) => {
    if (!interactive) return;
    onChange(score);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onAdvance, AUTO_ADVANCE_MS);
  };

  useHotkeys((event) => {
    if (event.metaKey || event.ctrlKey) return;
    // Two-digit scales (1..10) are reachable because 0 maps to 10.
    if (!/^[0-9]$/.test(event.key)) return;
    const digit = Number(event.key);
    const score = digit === 0 ? 10 : digit;
    if (score >= 1 && score <= max) {
      event.preventDefault();
      pick(score);
    }
  }, interactive);

  const active = hovered || selected;

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg",
          invalid && "ring-1 ring-danger p-1",
        )}
        onMouseLeave={() => setHovered(0)}
        role="radiogroup"
        aria-label={question.title}
      >
        {Array.from({ length: max }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected === score}
            aria-label={`${score} of ${max}`}
            disabled={!interactive}
            onMouseEnter={() => setHovered(score)}
            onClick={() => pick(score)}
            className={cn(
              "flex flex-col items-center gap-1 rounded px-1.5 py-1 transition-transform",
              interactive && "hover:scale-110",
              !interactive && "cursor-default",
              score <= active ? "text-ink-strong" : "text-ink-faint/50",
            )}
          >
            <Star filled={score <= active} width={30} height={30} />
            <span className="text-[11px] tabular-nums text-ink-faint">{score}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Press a number key from 1 to {max}
      </p>
    </div>
  );
}
