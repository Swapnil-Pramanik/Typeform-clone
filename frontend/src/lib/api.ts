/**
 * The only place that knows the backend's URL and error shape.
 *
 * Everything is a thin typed wrapper: hooks and components never build a URL or
 * read a `Response` object themselves.
 */

import type {
  Form,
  FormSummary,
  FormSummaryStats,
  FormTheme,
  PublicForm,
  Question,
  QuestionSettings,
  QuestionType,
  ResponsePage,
  SubmissionResult,
  WelcomeScreen,
} from "@/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

/** A failed request, carrying the offending question ID when the server sent one. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the request never reached the server. */
    readonly status: number,
    readonly questionId?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the API could not be reached at all, rather than refusing. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

const offlineMessage = () => `Can't reach the API at ${API_BASE}. Is the backend running?`;

interface ValidationDetail {
  question_id?: number;
  message?: string;
}

async function toApiError(response: Response): Promise<ApiError> {
  let detail: unknown;
  try {
    detail = (await response.json())?.detail;
  } catch {
    detail = undefined;
  }

  if (typeof detail === "string") {
    return new ApiError(detail, response.status);
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    const { message, question_id } = detail as ValidationDetail;
    return new ApiError(message ?? "Request failed.", response.status, question_id);
  }
  return new ApiError(`Request failed (${response.status}).`, response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    // fetch only rejects when the request never reached the server — a stopped
    // backend, DNS failure or a CORS preflight refusal. Turning it into an
    // ApiError here means no caller has to special-case a bare TypeError, and
    // no failure can surface as silence.
    throw new ApiError(offlineMessage(), 0);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const body = (payload: unknown) => JSON.stringify(payload);

/* --- authoring surface ---------------------------------------------------- */

export interface QuestionPatch {
  type?: QuestionType;
  title?: string;
  description?: string | null;
  required?: boolean;
  settings?: QuestionSettings;
  options?: { label: string }[];
}

export const api = {
  listForms: (search?: string) =>
    request<FormSummary[]>(
      `/api/forms${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),

  createForm: (title = "Untitled form") =>
    request<Form>("/api/forms", { method: "POST", body: body({ title }) }),

  getForm: (id: number) => request<Form>(`/api/forms/${id}`),

  updateForm: (
    id: number,
    patch: { title?: string; welcome_screen?: WelcomeScreen | null; theme?: FormTheme | null },
  ) => request<Form>(`/api/forms/${id}`, { method: "PATCH", body: body(patch) }),

  deleteForm: (id: number) => request<void>(`/api/forms/${id}`, { method: "DELETE" }),

  duplicateForm: (id: number) =>
    request<Form>(`/api/forms/${id}/duplicate`, { method: "POST" }),

  publishForm: (id: number) => request<Form>(`/api/forms/${id}/publish`, { method: "POST" }),

  unpublishForm: (id: number) =>
    request<Form>(`/api/forms/${id}/unpublish`, { method: "POST" }),

  addQuestion: (
    formId: number,
    payload: { type: QuestionType; title?: string; required?: boolean; settings?: QuestionSettings },
  ) =>
    request<Question>(`/api/forms/${formId}/questions`, {
      method: "POST",
      body: body(payload),
    }),

  updateQuestion: (questionId: number, patch: QuestionPatch) =>
    request<Question>(`/api/questions/${questionId}`, {
      method: "PATCH",
      body: body(patch),
    }),

  deleteQuestion: (questionId: number) =>
    request<void>(`/api/questions/${questionId}`, { method: "DELETE" }),

  /** Sends the complete ordered array — the server rewrites every position. */
  reorderQuestions: (formId: number, questionIds: number[]) =>
    request<Form>(`/api/forms/${formId}/questions/order`, {
      method: "PUT",
      body: body({ question_ids: questionIds }),
    }),

  listResponses: (formId: number, page = 1, pageSize = 25) =>
    request<ResponsePage>(
      `/api/forms/${formId}/responses?page=${page}&page_size=${pageSize}`,
    ),

  getSummary: (formId: number) =>
    request<FormSummaryStats>(`/api/forms/${formId}/summary`),

  csvUrl: (formId: number) => `${API_BASE}/api/forms/${formId}/responses.csv`,

  /* --- public surface ----------------------------------------------------- */

  getPublicForm: (slug: string) => request<PublicForm>(`/api/f/${slug}`),

  submitResponse: (
    slug: string,
    payload: {
      answers: { question_id: number; value: unknown }[];
      is_complete?: boolean;
    },
  ) =>
    request<SubmissionResult>(`/api/f/${slug}/responses`, {
      method: "POST",
      body: body(payload),
    }),
};
