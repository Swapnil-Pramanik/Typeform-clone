"use client";

import { TextField } from "@/components/render/inputs/TextField";
import type { QuestionInputProps } from "@/components/render/types";

export function NumberInput({
  question,
  value,
  onChange,
  onAdvance,
  interactive,
  autoFocus,
  invalid,
}: QuestionInputProps) {
  return (
    <TextField
      type="number"
      inputMode="numeric"
      min={question.settings?.min}
      max={question.settings?.max}
      value={value === null || value === undefined ? "" : String(value)}
      // Kept as a string here; `validateAnswer` and the server coerce it.
      onChange={onChange}
      onEnter={onAdvance}
      placeholder="Type your answer here..."
      interactive={interactive}
      autoFocus={autoFocus}
      invalid={invalid}
    />
  );
}
