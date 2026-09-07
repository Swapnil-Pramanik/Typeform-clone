"use client";

/** The progress bar runs along the TOP edge of the viewport, as in the real app. */

import { motion } from "framer-motion";

export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 h-[3px] bg-line/70"
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
