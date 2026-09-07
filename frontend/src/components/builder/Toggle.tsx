"use client";

import { useComingSoon } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/format";

interface ToggleProps {
  /** Announced to assistive tech. The visible label belongs to the row. */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Present in the panel but not wired up: pressing it says so. */
  comingSoon?: boolean;
  hint?: string;
}

/**
 * The switch alone — no visible text.
 *
 * The settings panel is a list of labelled rows, and the row owns the label. A
 * switch that carried its own would print it twice.
 */
export function Toggle({
  label,
  checked,
  onChange,
  disabled,
  comingSoon,
  hint,
}: ToggleProps) {
  const announce = useComingSoon();
  const inert = disabled || comingSoon;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      title={comingSoon ? "Coming soon" : hint}
      onClick={() => (comingSoon ? announce(label) : onChange(!checked))}
      className={cn(
        "relative h-[20px] w-[36px] shrink-0 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-line-strong",
        inert && "opacity-55",
        disabled && "cursor-not-allowed",
      )}
    >
      {/*
        Anchored with `left`, not by its static position. A button centres its
        content, so an absolutely positioned knob with `left: auto` starts from
        that centre and the travel is added to it — which pushed the knob clean
        outside the track.
      */}
      <span
        className={cn(
          "absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[16px]" : "translate-x-0",
        )}
      />
    </button>
  );
}
