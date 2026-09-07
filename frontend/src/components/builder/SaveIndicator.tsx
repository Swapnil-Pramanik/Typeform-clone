"use client";

/** The "Saving… / Saved" indicator that stands in for a save button. */

import type { SaveState } from "@/components/builder/useBuilder";
import { Check, Close } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";

const LABELS: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved",
};

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <span
      role="status"
      className="flex items-center gap-1.5 px-2 text-[12px] text-ink-muted"
    >
      {state === "saving" && <Spinner className="h-3 w-3" />}
      {state === "saved" && <Check width={13} height={13} />}
      {state === "error" && <Close width={13} height={13} className="text-danger" />}
      {LABELS[state]}
    </span>
  );
}
