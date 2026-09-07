"use client";

import { TextField } from "@/components/render/inputs/TextField";
import type { QuestionInputProps } from "@/components/render/types";

export function EmailInput({
  value,
  onChange,
  onAdvance,
  interactive,
  autoFocus,
  invalid,
}: QuestionInputProps) {
  return (
    <TextField
      type="email"
      inputMode="email"
      value={typeof value === "string" ? value : ""}
      onChange={onChange}
      onEnter={onAdvance}
      placeholder="name@example.com"
      interactive={interactive}
      autoFocus={autoFocus}
      invalid={invalid}
    />
  );
}
