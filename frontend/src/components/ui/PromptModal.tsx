"use client";

/**
 * Ask for one line of text.
 *
 * Replaces `window.prompt`, which the browser draws in its own chrome — wrong
 * typeface, wrong buttons, wrong position, and on some browsers suppressible
 * entirely. This is the same dialog every other question in the app is asked
 * in.
 *
 * The field is selected on mount, so a rename starts by replacing the old name
 * the way the native prompt did.
 */

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface PromptModalProps {
  open: boolean;
  title: string;
  label: string;
  /** Prefilled and pre-selected. */
  initialValue?: string;
  confirmLabel: string;
  placeholder?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function PromptModal({ open, title, ...rest }: PromptModalProps) {
  // `Modal` mounts its children only while open, so the body's state starts
  // from `initialValue` on every open with no effect to keep it in step.
  return (
    <Modal open={open} onClose={rest.onCancel} title={title}>
      {open && <PromptBody {...rest} />}
    </Modal>
  );
}

function PromptBody({
  label,
  initialValue = "",
  confirmLabel,
  placeholder,
  pending = false,
  onCancel,
  onConfirm,
}: Omit<PromptModalProps, "open" | "title">) {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();
  const submit = () => {
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="px-5 py-5">
        <label className="block text-[13px] font-medium text-ink" htmlFor="prompt-field">
          {label}
        </label>
        <input
          id="prompt-field"
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onFocus={(event) => event.target.select()}
          className="mt-2 w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint"
        />
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!trimmed || pending}>
          {pending ? "Working…" : confirmLabel}
        </Button>
      </footer>
    </form>
  );
}
