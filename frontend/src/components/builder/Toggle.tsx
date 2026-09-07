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
        Two things worth stating.

        Anchored with `left`, not by its static position: a button centres its
        content, so an absolutely positioned knob with `left: auto` starts from
        that centre and the travel is added to it — which pushed the knob clean
        outside the track.

        And the knob is never a fixed white. On, the track is the accent, so the
        knob takes the accent's own contrast colour; off, it takes a token that
        flips with the theme. A hardcoded white knob vanished against the white
        accent in dark mode.
      */}
      <span
        className={cn(
          "absolute left-[2px] top-[2px] h-4 w-4 rounded-full shadow-sm transition-transform",
          checked ? "translate-x-[16px] bg-accent-ink" : "translate-x-0 bg-switch-knob",
        )}
      />
    </button>
  );
}
