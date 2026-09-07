"use client";

/** The dark OK / Submit button and its persistent `press Enter ↵` hint. */

import { cn } from "@/lib/format";

interface OkButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}

export function OkButton({ label, onClick, disabled, pending }: OkButtonProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className={cn(
          "rounded-lg bg-accent px-5 py-2.5 text-[15px] font-medium text-accent-ink",
          "shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40",
        )}
      >
        {pending ? "Sending…" : label}
      </button>
      <span className="hidden items-center gap-1 text-xs text-ink-muted sm:flex">
        press <kbd className="font-sans font-medium">Enter</kbd>
        <span aria-hidden="true">↵</span>
      </span>
    </div>
  );
}
