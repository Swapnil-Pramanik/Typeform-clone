/**
 * What the builder currently has selected.
 *
 * A welcome screen is not a question row — it lives in `forms.welcome_screen`
 * as JSON — so the selection cannot simply be a question ID. Making that a
 * discriminated union keeps the distinction visible instead of smuggling a
 * sentinel ID through the component tree.
 *
 * Design used to be a third member here, which was the bug behind an empty
 * canvas: opening the design panel *deselected the block*, so there was nothing
 * left to preview the colours on. Design is a mode of the right-hand panel, not
 * a thing that can be selected.
 */

import type { Question } from "@/types";

export type Selection = { kind: "welcome" } | { kind: "question"; id: number };

export const WELCOME: Selection = { kind: "welcome" };

export const question = (id: number): Selection => ({ kind: "question", id });

export function selectedQuestion(
  selection: Selection,
  questions: Question[],
): Question | null {
  if (selection.kind !== "question") return null;
  return questions.find((q) => q.id === selection.id) ?? null;
}
