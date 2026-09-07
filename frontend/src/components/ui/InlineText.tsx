"use client";

/**
 * A textarea that looks like plain text and grows with its content.
 *
 * The builder edits question titles, descriptions and choice labels in place, so
 * the editable field has to be visually indistinguishable from the rendered text
 * beside it in the preview.
 */

import { useEffect, useRef } from "react";

import { cn } from "@/lib/format";

interface InlineTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  onEnter?: () => void;
  onBackspaceWhenEmpty?: () => void;
  autoFocus?: boolean;
}

export function InlineText({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
  onEnter,
  onBackspaceWhenEmpty,
  autoFocus = false,
}: InlineTextProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Height is driven by content, so the preview reflows exactly as the
  // respondent flow will.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && onEnter) {
          event.preventDefault();
          onEnter();
        }
        if (event.key === "Backspace" && value === "" && onBackspaceWhenEmpty) {
          event.preventDefault();
          onBackspaceWhenEmpty();
        }
      }}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent",
        "rounded px-1 -mx-1 focus:outline-none focus:bg-ink/[0.04]",
        "placeholder:text-ink-faint/60",
        className,
      )}
    />
  );
}
