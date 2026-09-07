"use client";

/**
 * The primitives the settings panel is built from.
 *
 * The real panel is a flat list of labelled rows — sentence case, control on the
 * right — not a stack of captioned sections. Keeping the row shapes here means
 * the question, welcome and ending panels cannot drift apart in spacing or type.
 */

import type { ReactNode } from "react";

import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { Plus } from "@/components/ui/icons";
import { cn } from "@/lib/format";

/** A label on the left, a control on the right. */
export function Row({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  /** Shown in a small circled `?` beside the label, as the real panel does. */
  hint?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-2.5", className)}>
      <span className="flex items-center gap-1.5 text-[14px] text-ink">
        {label}
        {hint && (
          <span
            title={hint}
            aria-label={hint}
            className="flex h-[15px] w-[15px] shrink-0 cursor-help items-center justify-center rounded-full border border-line-strong text-[10px] text-ink-faint"
          >
            ?
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

/** A full-width block: a label above, the control beneath. */
export function Field({
  label,
  children,
  counter,
}: {
  label: string;
  children: ReactNode;
  /** e.g. `5/24` — the real panel counts characters under its text fields. */
  counter?: string;
}) {
  return (
    <div className="px-4 py-2.5">
      <p className="mb-1.5 text-[14px] text-ink">{label}</p>
      {children}
      {counter && (
        <p className="mt-1 text-right text-[12px] text-ink-faint tabular-nums">
          {counter}
        </p>
      )}
    </div>
  );
}

/**
 * A row that opens something — "Image or video", "Logic" — with a `+` on the
 * right. Out-of-scope ones announce themselves rather than sitting dead.
 */
export function AddRow({
  label,
  onAdd,
  comingSoonLabel,
  trailing,
}: {
  label: string;
  onAdd?: () => void;
  comingSoonLabel?: string;
  trailing?: ReactNode;
}) {
  const comingSoon = useComingSoon();
  const props = comingSoonLabel
    ? comingSoonProps(comingSoon, comingSoonLabel)
    : { onClick: onAdd, "aria-label": `Add ${label}` };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-2 text-[14px] text-ink">
        {label}
        {trailing}
      </span>
      <button
        type="button"
        {...props}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-ink-muted transition-colors hover:text-ink"
      >
        <Plus width={15} height={15} />
      </button>
    </div>
  );
}

export function Divider() {
  return <div className="mx-4 border-t border-line" />;
}

export const PANEL_INPUT =
  "w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[14px] text-ink";
