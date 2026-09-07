/**
 * Client mirror of `backend/app/services/validation.py`.
 *
 * This exists for instant inline feedback only. The server re-validates every
 * submission and is the authority; if the two ever disagree, the server wins and
 * this file is the one that is wrong. The rules are stated once, in that
 * module's docstring — change them there first, then here.
 */

import type { AnswerValue, Question } from "@/types";

export const EMAIL_RE = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

export const DEFAULT_MAX_RATING = 5;
const DEFAULT_SHORT_TEXT_MAX = 200;
const DEFAULT_LONG_TEXT_MAX = 2000;

export function isBlank(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Returns an error message, or `null` when the answer is acceptable. */
export function validateAnswer(question: Question, value: AnswerValue): string | null {
  if (question.type === "ending") return null;

  if (isBlank(value)) {
    return question.required ? "This field is required." : null;
  }

  const settings = question.settings ?? {};

  switch (question.type) {
    case "short_text":
    case "long_text": {
      const max =
        settings.max_length ??
        (question.type === "long_text" ? DEFAULT_LONG_TEXT_MAX : DEFAULT_SHORT_TEXT_MAX);
      return String(value).trim().length > max
        ? `Please keep this under ${max} characters.`
        : null;
    }

    case "email":
      return EMAIL_RE.test(String(value).trim()) ? null : "Enter a valid email address.";

    case "number": {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return "Enter a number.";
      if (settings.min !== undefined && parsed < settings.min)
        return `Must be at least ${settings.min}.`;
      if (settings.max !== undefined && parsed > settings.max)
        return `Must be at most ${settings.max}.`;
      return null;
    }

    case "yes_no":
      return typeof value === "boolean" ? null : "Choose Yes or No.";

    case "rating": {
      const max = settings.max_rating ?? DEFAULT_MAX_RATING;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= max
        ? null
        : `Pick a rating between 1 and ${max}.`;
    }

    case "multiple_choice":
    case "dropdown": {
      const chosen = Array.isArray(value) ? value : [value];
      const multi = question.type === "multiple_choice" && Boolean(settings.multi_select);
      if (!multi && chosen.length > 1) return "Pick one option.";
      const valid = new Set(question.options.map((option) => option.id));
      return chosen.every((id) => valid.has(Number(id)))
        ? null
        : "That option does not belong to this question.";
    }

    default:
      return null;
  }
}
