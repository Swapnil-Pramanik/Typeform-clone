"use client";

/**
 * The summary's drawing primitives: a ring, a donut and two kinds of bar.
 *
 * Inline SVG and divs rather than a charting library. Four shapes over data
 * this simple is not worth a dependency, and every one of them has to take its
 * colours from the token layer so the panel themes like everything else — which
 * is the first thing a chart library takes away.
 *
 * Every figure animates from empty on mount and holds still under
 * `prefers-reduced-motion`; a bar that grows is the difference between a table
 * of numbers and something you actually read.
 */

import { motion } from "framer-motion";

import { percent } from "@/lib/format";
import { cn } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";

const GROW = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

/** A single-value gauge: completion rate, mostly. */
export function Ring({
  value,
  label,
  size = 96,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(Math.max(value, 0), 1) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted-strong"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-brand"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduced ? circumference - filled : circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={reduced ? { duration: 0 } : GROW}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[19px] font-semibold tabular-nums text-ink">
          {percent(value)}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Two-slice donut for a yes/no split, with the leading share in the middle. */
export function Donut({
  slices,
  size = 130,
}: {
  slices: { label: string; count: number; color: string }[];
  size?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Offsets as a prefix sum rather than a running variable: each arc starts
  // where the ones before it ended, and nothing is reassigned mid-render.
  const shares = slices.map((slice) => (total ? slice.count / total : 0));
  const arcs = slices.map((slice, index) => ({
    ...slice,
    share: shares[index],
    dash: shares[index] * circumference,
    offset:
      shares.slice(0, index).reduce((sum, share) => sum + share, 0) * circumference,
  }));
  const leader = arcs.reduce(
    (best, arc) => (arc.count > best.count ? arc : best),
    arcs[0],
  );

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted-strong"
          />
          {arcs.map((arc) => (
            <motion.circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              stroke={arc.color}
              strokeDasharray={`${arc.dash} ${circumference}`}
              initial={{
                strokeDashoffset: reduced ? -arc.offset : circumference - arc.offset,
              }}
              animate={{ strokeDashoffset: -arc.offset }}
              transition={reduced ? { duration: 0 } : GROW}
            />
          ))}
        </svg>
        {total > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-semibold tabular-nums text-ink">
              {percent(leader.share)}
            </span>
            <span className="text-[11px] text-ink-muted">{leader.label}</span>
          </div>
        )}
      </div>

      <ul className="flex min-w-0 flex-col gap-2">
        {arcs.map((arc) => (
          <li key={arc.label} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: arc.color }}
            />
            <span className="truncate text-ink">{arc.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">
              {arc.count} · {percent(arc.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical bars for a numeric spread — a rating's scale, or a number's values. */
export function Histogram({
  buckets,
  color,
}: {
  buckets: { value: number; count: number }[];
  color: string;
}) {
  const reduced = usePrefersReducedMotion();
  const peak = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="flex items-end gap-1.5">
      {buckets.map((bucket, index) => (
        <div
          key={bucket.value}
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
        >
          <span className="text-[11px] tabular-nums text-ink-muted">
            {bucket.count || ""}
          </span>

          {/* The track has to be a definite height, not a flex-grown one: a
              percentage height resolves against nothing in an auto-height
              parent, and every bar came out invisible. */}
          <div className="flex h-[96px] w-full items-end">
            <motion.div
              className={cn(
                "w-full rounded-t-md",
                bucket.count === 0 && "bg-muted-strong",
              )}
              style={bucket.count ? { backgroundColor: color } : undefined}
              initial={{ height: reduced ? undefined : "2%" }}
              animate={{
                height: bucket.count
                  ? `${Math.max((bucket.count / peak) * 100, 6)}%`
                  : "3%",
              }}
              transition={reduced ? { duration: 0 } : { ...GROW, delay: index * 0.05 }}
            />
          </div>

          <span className="text-[11px] tabular-nums text-ink-faint">
            {Number.isInteger(bucket.value) ? bucket.value : bucket.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bars, ordered by count — how a choice question reads best. */
export function RankedBars({
  rows,
  color,
}: {
  rows: { label: string; count: number }[];
  color: string;
}) {
  const reduced = usePrefersReducedMotion();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const peak = Math.max(...rows.map((row) => row.count), 1);
  const ranked = [...rows].sort((a, b) => b.count - a.count);

  return (
    <ul className="flex flex-col gap-2.5">
      {ranked.map((row, index) => {
        const share = total ? row.count / total : 0;
        return (
          <li key={row.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate text-ink">{row.label}</span>
              <span className="shrink-0 tabular-nums text-ink-muted">
                {row.count} · {percent(share)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted-strong">
              <motion.div
                className="h-full rounded-full"
                // The leading answer is the one worth seeing first, so it keeps
                // the full colour and the rest step back from it.
                style={{
                  backgroundColor: color,
                  opacity: 1 - Math.min(index, 4) * 0.16,
                }}
                initial={{ width: reduced ? undefined : 0 }}
                animate={{ width: `${(row.count / peak) * 100}%` }}
                transition={
                  reduced ? { duration: 0 } : { ...GROW, delay: index * 0.06 }
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
