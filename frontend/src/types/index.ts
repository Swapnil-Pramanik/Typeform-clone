/**
 * Shared types, mirroring the Pydantic schemas in `backend/app/schemas/`.
 * Any change on one side must be made on the other.
 */

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating"
  | "ending";

export type FormStatus = "draft" | "published";

/** Per-type knobs. Every field is optional; each input reads only its own. */
export interface QuestionSettings {
  max_rating?: number;
  multi_select?: boolean;
  randomize?: boolean;
  allow_other?: boolean;
  allow_none?: boolean;
  vertical_alignment?: boolean;
  min?: number;
  max?: number;
  max_length?: number;
  placeholder?: string;
  button_text?: string;
  icon?: "star" | "heart";
}

export interface QuestionOption {
  id: number;
  label: string;
  position: number;
}

export type RuleOperator =
  | "is"
  | "is_not"
  | "greater_than"
  | "less_than"
  | "answered"
  | "not_answered";

/** One branching rule: if this answer matches, go to `target_question_id`. */
export interface QuestionRule {
  id: number;
  position: number;
  operator: RuleOperator;
  value: unknown;
  target_question_id: number;
}

export interface Question {
  id: number;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  position: number;
  settings: QuestionSettings | null;
  options: QuestionOption[];
  /** Evaluated in order; the first match wins. Empty means "go to the next". */
  rules: QuestionRule[];
}

export interface WelcomeScreen {
  title?: string;
  description?: string;
  button_text?: string;
  estimated_minutes?: number;
}

export interface FormTheme {
  color?: string;
  background?: string;
  font?: string;
}

export interface Form {
  id: number;
  title: string;
  slug: string | null;
  status: FormStatus;
  welcome_screen: WelcomeScreen | null;
  theme: FormTheme | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  questions: Question[];
}

/** A dashboard row. */
export interface FormSummary {
  id: number;
  title: string;
  slug: string | null;
  status: FormStatus;
  /** Drives the dashboard row's thumbnail colour. */
  theme: FormTheme | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  question_count: number;
  response_count: number;
  completed_count: number;
}

/** What `/api/f/{slug}` returns — deliberately without a numeric form ID. */
export interface PublicForm {
  slug: string;
  title: string;
  welcome_screen: WelcomeScreen | null;
  theme: FormTheme | null;
  questions: Question[];
}

/** Anything a respondent can enter, before validation splits it by type. */
export type AnswerValue = string | number | boolean | number[] | null;

export interface AnswerOut {
  question_id: number;
  question_title: string;
  question_type: QuestionType;
  display_value: string;
  text_value: string | null;
  number_value: number | null;
  bool_value: boolean | null;
  option_ids: number[] | null;
}

export interface FormResponse {
  id: number;
  form_id: number;
  started_at: string;
  submitted_at: string | null;
  is_complete: boolean;
  meta: Record<string, unknown> | null;
  answers: AnswerOut[];
}

export interface ResponsePage {
  items: FormResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface EndingPayload {
  id: number;
  title: string;
  description: string | null;
  settings: QuestionSettings;
}

export interface SubmissionResult {
  response_id: number;
  ending: EndingPayload | null;
}

export interface ChoiceCount {
  label: string;
  count: number;
}

export interface QuestionStats {
  question_id: number;
  title: string;
  type: QuestionType;
  answered: number;
  choices: ChoiceCount[] | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  samples: string[] | null;
}

export interface FormSummaryStats {
  form_id: number;
  total_responses: number;
  completed_responses: number;
  completion_rate: number;
  questions: QuestionStats[];
}
