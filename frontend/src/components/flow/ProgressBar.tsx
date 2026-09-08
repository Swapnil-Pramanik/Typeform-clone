"use client";

/**
 * The progress bar runs along the TOP edge, as in the real app.
 *
 * `contained` swaps `fixed` for `absolute` so the builder's preview keeps it
 * inside the frame it is drawn in. On the public page it stays fixed, which is
 * what keeps it in place when a long question scrolls.
 */

import { motion } from "framer-motion";

import { cn } from "@/lib/format";

export function ProgressBar({
  value,
  contained = false,
}: {
  value: number;
  contained?: boolean;
}) {
  return (
    <div
      className={cn(
        contained ? "absolute" : "fixed",
        "inset-x-0 top-0 z-30 h-[3px] bg-line/70",
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label="Form progress"
    >
      <motion.div
        className="h-full bg-accent"
        initial={false}
        animate={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
