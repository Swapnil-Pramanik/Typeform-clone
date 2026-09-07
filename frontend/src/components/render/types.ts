import type { AnswerValue, Question } from "@/types";

/**
 * The contract every question input honours.
 *
 * The same components serve the builder's live preview and the public fill page.
 * `interactive` is the only difference between the two: in the builder the input
 * is displayed but inert, so the preview cannot swallow the creator's keystrokes.
 */
export interface QuestionInputProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Commit and advance. Inputs that auto-advance (rating, yes/no) call this. */
  onAdvance: () => void;
  interactive: boolean;
  autoFocus: boolean;
  /** Set when the field should read as invalid; the message renders above it. */
  invalid: boolean;
  /** Form setting: the A/B/C keys beside choice cards. */
  showLetters?: boolean;
}
