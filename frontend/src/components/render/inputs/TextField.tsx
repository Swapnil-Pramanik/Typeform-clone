"use client";

/**
 * The borderless underlined field the flow uses for every free-text answer.
 *
 * Not a question type — a primitive the text-shaped inputs share so the
 * caret size, placeholder colour and underline behaviour are defined once.
 */

import { useEffect, useRef } from "react";

import { cn } from "@/lib/format";

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder: string;
  interactive: boolean;
  autoFocus: boolean;
  invalid: boolean;
  multiline?: boolean;
  type?: "text" | "email" | "number";
  inputMode?: "text" | "email" | "numeric" | "decimal";
  min?: number;
  max?: number;
}

export function TextField({
  value,
  onChange,
  onEnter,
  placeholder,
  interactive,
  autoFocus,
  invalid,
  multiline = false,
  type = "text",
  inputMode,
  min,
  max,
}: TextFieldProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (interactive && autoFocus) ref.current?.focus();
  }, [interactive, autoFocus]);

  const shared = {
    value,
    placeholder,
    disabled: !interactive,
    "aria-invalid": invalid,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    className: cn(
      "tf-caret w-full bg-transparent text-[26px] sm:text-[28px] font-normal",
      "placeholder:text-ink-faint/70 focus:outline-none focus-visible:outline-none disabled:cursor-default",
      "border-b pb-2 transition-colors",
      invalid ? "border-danger" : "border-line-strong focus:border-ink",
    ),
  };

  if (multiline) {
    return (
      <textarea
        {...shared}
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        rows={2}
        onKeyDown={(event) => {
          // Shift+Enter inserts a newline; plain Enter advances, as in the real app.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onEnter();
          }
        }}
        className={cn(shared.className, "resize-none tf-scrollbar max-h-48")}
      />
    );
  }

  return (
    <input
      {...shared}
      ref={ref as React.RefObject<HTMLInputElement>}
      type={type}
      inputMode={inputMode}
      min={min}
      max={max}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}
