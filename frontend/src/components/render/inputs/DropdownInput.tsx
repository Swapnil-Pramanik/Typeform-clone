"use client";

/**
 * Dropdown — a searchable list rather than a native `<select>`.
 *
 * The real product filters as you type and keeps the flow keyboard-only, which
 * a native select on desktop cannot do.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { QuestionInputProps } from "@/components/render/types";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export function DropdownInput({
  question,
  value,
  onChange,
  onAdvance,
  interactive,
  autoFocus,
  invalid,
}: QuestionInputProps) {
  const selectedId = Array.isArray(value) ? value[0] : null;
  const selected = question.options.find((option) => option.id === selectedId) ?? null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (interactive && autoFocus) inputRef.current?.focus();
  }, [interactive, autoFocus]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return question.options;
    return question.options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [query, question.options]);

  const choose = (optionId: number) => {
    onChange([optionId]);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-2 border-b pb-2 transition-colors",
          invalid ? "border-danger" : "border-line-strong focus-within:border-ink",
        )}
      >
        <input
          ref={inputRef}
          disabled={!interactive}
          value={open ? query : (selected?.label ?? "")}
          placeholder="Type or select an option"
          aria-invalid={invalid}
          aria-expanded={open}
          role="combobox"
          aria-controls={`dropdown-${question.id}`}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setHighlighted((current) => {
                const step = event.key === "ArrowDown" ? 1 : -1;
                const next = current + step;
                return (next + matches.length) % Math.max(matches.length, 1);
              });
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const option = open ? matches[highlighted] : null;
              if (option) choose(option.id);
              else onAdvance();
            }
          }}
          className="tf-caret w-full bg-transparent text-[26px] @min-[640px]:text-[28px] placeholder:text-ink-faint/70 focus:outline-none focus-visible:outline-none disabled:cursor-default"
        />
        <ChevronDown className="shrink-0 text-ink-faint" />
      </div>

      {open && interactive && (
        <ul
          id={`dropdown-${question.id}`}
          role="listbox"
          className="tf-scrollbar absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-panel py-1 shadow-lg"
        >
          {matches.length === 0 && (
            <li className="px-4 py-3 text-sm text-ink-faint">No matches</li>
          )}
          {matches.map((option, index) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={option.id === selectedId}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(option.id)}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-[15px]",
                  index === highlighted ? "bg-muted" : "hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
