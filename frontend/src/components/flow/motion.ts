/**
 * The one-question-at-a-time transition.
 *
 * The incoming question rises from below while the outgoing one lifts away and
 * blurs out. Direction is part of flow state, so going back animates the other
 * way round. Under `prefers-reduced-motion` the Y travel and blur are dropped
 * and the step becomes a plain cross-fade.
 */

import type { Transition, Variants } from "framer-motion";

export const STEP_TRAVEL = 40;

export const stepTransition: Transition = {
  duration: 0.45,
  ease: [0.16, 1, 0.3, 1],
};

export const reducedTransition: Transition = { duration: 0.18, ease: "easeOut" };

/** `custom` is the direction: 1 travelling forward, -1 going back. */
export function stepVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    enter: (direction: number) => ({
      opacity: 0,
      y: direction >= 0 ? STEP_TRAVEL : -STEP_TRAVEL,
      filter: "blur(6px)",
    }),
    center: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: (direction: number) => ({
      opacity: 0,
      y: direction >= 0 ? -STEP_TRAVEL : STEP_TRAVEL,
      filter: "blur(6px)",
    }),
  };
}
