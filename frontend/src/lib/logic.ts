/**
 * Client mirror of `backend/app/services/logic.py`.
 *
 * This decides what a respondent actually sees, so it has to agree with the
 * server, which decides which answers were required. The rules are stated once,
 * in that module's docstring — change them there first.
 *
 * A step resolves by evaluating the answered question's rules in order and
 * taking the first match; with no match the flow falls through to the next
 * question by position. The builder's "Always go to" is an `always` rule stored
 * last, so it wins only after every conditional rule has declined. A rule pointing at a question that is no longer in the
 * form is ignored rather than followed.
 */

import type { AnswerValue, Question, QuestionRule } from "@/types";

function isBlank(answer: AnswerValue): boolean {
  if (answer === null || answer === undefined) return true;
  if (typeof answer === "string") return answer.trim() === "";
  if (Array.isArray(answer)) return answer.length === 0;
  return false;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "boolean" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matches(
  rule: QuestionRule,
  question: Question,
  answer: AnswerValue,
): boolean {
  if (rule.operator === "always") return true;
  if (rule.operator === "answered") return !isBlank(answer);
  if (rule.operator === "not_answered") return isBlank(answer);
  if (isBlank(answer)) return false;

  const expected = rule.value;

  if (rule.operator === "greater_than" || rule.operator === "less_than") {
    const left = asNumber(answer);
    const right = asNumber(expected);
    if (left === null || right === null) return false;
    return rule.operator === "greater_than" ? left > right : left < right;
  }

  const affirmative = rule.operator === "is";

  if (question.type === "multiple_choice" || question.type === "dropdown") {
    // A multi-select answer matches a rule about any one of its selections,
    // which is what an author means by "if they picked Support".
    const chosen = Array.isArray(answer) ? answer : [answer];
    const present = chosen.some((option) => String(option) === String(expected));
    return affirmative ? present : !present;
  }

  if (question.type === "yes_no") {
    const equal = Boolean(answer) === Boolean(expected);
    return affirmative ? equal : !equal;
  }

  if (question.type === "number" || question.type === "rating") {
    const left = asNumber(answer);
    const right = asNumber(expected);
    const equal = left !== null && right !== null && left === right;
    return affirmative ? equal : !equal;
  }

  const equal =
    String(answer).trim().toLowerCase() ===
    String(expected ?? "").trim().toLowerCase();
  return affirmative ? equal : !equal;
}

/** The index of the next question, or `null` when the form is over. */
export function nextIndex(
  order: Question[],
  index: number,
  answer: AnswerValue,
): number | null {
  const question = order[index];
  if (!question) return null;

  for (const rule of question.rules) {
    const target = order.findIndex((q) => q.id === rule.target_question_id);
    if (target < 0) continue; // the target left the form; fall through
    if (matches(rule, question, answer)) return target;
  }

  return index + 1 < order.length ? index + 1 : null;
}

/**
 * How many steps remain, following the path the current answers imply.
 *
 * With branching the total length is not known in advance, so the progress bar
 * is an estimate of the route ahead rather than a count of all questions. The
 * walk is bounded by the form's length, so a rule set that loops cannot hang it.
 */
export function remainingSteps(
  order: Question[],
  index: number,
  answers: Record<number, AnswerValue>,
): number {
  let steps = 0;
  let cursor: number | null = index;
  const seen = new Set<number>();

  while (cursor !== null && !seen.has(cursor) && steps <= order.length) {
    seen.add(cursor);
    const question = order[cursor];
    cursor = nextIndex(order, cursor, answers[question.id] ?? null);
    if (cursor !== null) steps += 1;
  }

  return steps;
}
