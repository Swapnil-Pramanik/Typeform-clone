"use client";

import { useComingSoon } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/format";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Present in the panel but not wired up. Rendered off and non-interactive. */
  comingSoon?: boolean;
  hint?: string;
}

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
    <label
      className={cn(
        "flex items-center justify-between gap-3 py-2",
        inert && "opacity-55",
      )}
      title={comingSoon ? "Coming soon" : hint}
    >
      <span className="text-[13px] text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => (comingSoon ? announce(label) : onChange(!checked))}
        className={cn(
          "relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line-strong",
          inert && "cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-4 w-4 rounded-full bg-bg shadow transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </label>
  );
}
