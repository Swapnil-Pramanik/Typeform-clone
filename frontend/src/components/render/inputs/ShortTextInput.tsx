"use client";

import { TextField } from "@/components/render/inputs/TextField";
import type { QuestionInputProps } from "@/components/render/types";

export function ShortTextInput({
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
      value={typeof value === "string" ? value : ""}
      onChange={onChange}
      onEnter={onAdvance}
      placeholder={question.settings?.placeholder ?? "Type your answer here..."}
      interactive={interactive}
      autoFocus={autoFocus}
      invalid={invalid}
    />
  );
}
