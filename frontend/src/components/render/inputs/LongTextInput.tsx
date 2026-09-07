"use client";

import { TextField } from "@/components/render/inputs/TextField";
import type { QuestionInputProps } from "@/components/render/types";

export function LongTextInput({
  question,
  value,
  onChange,
  onAdvance,
  interactive,
  autoFocus,
  invalid,
}: QuestionInputProps) {
  return (
    <div>
      <TextField
        multiline
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        onEnter={onAdvance}
        placeholder={question.settings?.placeholder ?? "Type your answer here..."}
        interactive={interactive}
        autoFocus={autoFocus}
        invalid={invalid}
      />
      <p className="mt-2 text-xs text-ink-faint">
        Shift ⇧ + Enter ↵ to make a line break
      </p>
    </div>
  );
}
