"use client";

/**
 * Where a block sits on the form's surface.
 *
 * Shared by the respondent flow and the builder's canvas, because a preview
 * that positions blocks differently from the real thing is worse than no
 * preview. The two consumers differ only in what they measure: the flow fills
 * the viewport, the canvas fills its card.
 *
 * Two placements, matching the real product:
 *
 * - **Questions** sit in a column that starts about a quarter of the way across
 *   a wide screen, left-aligned. Narrow screens have no room for that, so they
 *   centre instead.
 * - **Welcome, ending and closed screens** are centred at every width. They are
 *   whole-screen moments rather than one step in a column, and left-aligning
 *   them was a bug: the offset was on the shared wrapper, so they inherited a
 *   position meant for questions.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/format";

/** A question's column: offset left once there is room for it. */
export const STAGE_OFFSET =
  "@min-[1024px]:pl-[26cqw] @min-[1024px]:pr-16";

/** A whole-screen moment: centred at every width. */
export const STAGE_CENTRED = "flex justify-center";

export function FormStage({
  children,
  /** Fill the containing box rather than the viewport — the builder's canvas. */
  fill = false,
}: {
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div className={cn("flex items-center", fill ? "min-h-full" : "min-h-dvh")}>
      <div className="w-full px-6 py-16 @min-[640px]:px-10 @min-[640px]:py-24">
        {children}
      </div>
    </div>
  );
}
