"use client";

/**
 * The respondent flow's state machine, kept out of the view.
 *
 * Phases: `welcome` (only when the form defines one) → `question` → `ending`.
 * `direction` is state rather than a derived value because the exit animation
 * has to know which way the respondent is travelling.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { nextIndex, remainingSteps } from "@/lib/logic";
import { validateAnswer } from "@/lib/validation";
import type { AnswerValue, PublicForm, Question } from "@/types";

export type FlowPhase = "welcome" | "question" | "ending";

export interface FlowState {
  phase: FlowPhase;
  index: number;
  direction: number;
  answers: Record<number, AnswerValue>;
  error: string | null;
  /**
   * Indexes of the questions actually visited, current one last.
   *
   * Branching makes the route personal, so "back" cannot be `index - 1` — that
   * would walk into a question this respondent was never shown. Retracing the
   * stack is the only way back that matches the way in.
   */
  history: number[];
}

export interface FormFlow extends FlowState {
  questions: Question[];
  /** Latest answers, safe to read from a timer or an unload handler. */
  getAnswers: () => Record<number, AnswerValue>;
  current: Question | undefined;
  isLast: boolean;
  progress: number;
  answeredCount: number;
  setAnswer: (questionId: number, value: AnswerValue) => void;
  /** Validates the current answer; returns true when the flow may move on. */
  advance: () => boolean;
  goBack: () => void;
  /** True when there is a previous step on the route this respondent took. */
  canGoBack: boolean;
  jumpTo: (index: number) => void;
  start: () => void;
  finish: () => void;
  restart: () => void;
  setError: (message: string | null) => void;
}

export function useFormFlow(form: PublicForm): FormFlow {
  const questions = useMemo(
    () => form.questions.filter((question) => question.type !== "ending"),
    [form.questions],
  );

  const hasWelcome = Boolean(form.welcome_screen?.title || form.welcome_screen?.description);

  const [state, setState] = useState<FlowState>({
    phase: hasWelcome ? "welcome" : "question",
    index: 0,
    direction: 1,
    answers: {},
    error: null,
    history: [0],
  });

  /**
   * Rating and yes/no auto-advance on a timer, so `advance` fires from a
   * closure created one render before the answer landed in state. Reading
   * through a ref makes every caller — timers included — see the latest answers.
   */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const current = questions[state.index];
  /** Last means "no question follows on this route", not "last in the list". */
  const isLast =
    current !== undefined &&
    nextIndex(questions, state.index, state.answers[current.id] ?? null) === null;

  const setAnswer = useCallback((questionId: number, value: AnswerValue) => {
    setState((previous) => ({
      ...previous,
      answers: { ...previous.answers, [questionId]: value },
      // Clearing on change is what makes the error feel inline rather than modal.
      error: null,
    }));
  }, []);

  const advance = useCallback((): boolean => {
    const { index, answers } = stateRef.current;
    const question = questions[index];
    if (!question) return false;

    const message = validateAnswer(question, answers[question.id] ?? null);
    if (message) {
      setState((previous) => ({ ...previous, error: message }));
      return false;
    }

    const target = nextIndex(questions, index, answers[question.id] ?? null);
    if (target !== null) {
      setState((previous) => ({
        ...previous,
        index: target,
        direction: 1,
        error: null,
        history: [...previous.history, target],
      }));
    }
    return true;
  }, [questions]);

  const goBack = useCallback(() => {
    setState((previous) => {
      if (previous.history.length < 2) return previous;
      const history = previous.history.slice(0, -1);
      return {
        ...previous,
        index: history[history.length - 1],
        direction: -1,
        error: null,
        history,
      };
    });
  }, []);

  const jumpTo = useCallback((index: number) => {
    setState((previous) => ({
      ...previous,
      direction: index >= previous.index ? 1 : -1,
      index,
      error: null,
      // Jumping is the server correcting us, so the route rewinds to that point
      // rather than pretending the questions after it were never seen.
      history: previous.history.includes(index)
        ? previous.history.slice(0, previous.history.indexOf(index) + 1)
        : [...previous.history, index],
    }));
  }, []);

  const start = useCallback(
    () => setState((previous) => ({ ...previous, phase: "question", direction: 1 })),
    [],
  );

  const finish = useCallback(
    () => setState((previous) => ({ ...previous, phase: "ending", direction: 1 })),
    [],
  );

  const restart = useCallback(
    () =>
      setState({
        phase: hasWelcome ? "welcome" : "question",
        index: 0,
        direction: 1,
        answers: {},
        error: null,
        history: [0],
      }),
    [hasWelcome],
  );

  const setError = useCallback(
    (message: string | null) => setState((previous) => ({ ...previous, error: message })),
    [],
  );

  const answeredCount = Object.values(state.answers).filter(
    (value) => value !== null && value !== "" && !(Array.isArray(value) && value.length === 0),
  ).length;

  return {
    ...state,
    questions,
    getAnswers: () => stateRef.current.answers,
    current,
    isLast,
    canGoBack: state.history.length > 1,
    // Branching means the length of a route is not known in advance, so progress
    // compares the steps taken against the steps still ahead on the current
    // route rather than against every question in the form.
    progress: questions.length
      ? state.phase === "ending"
        ? 1
        : state.history.length /
          (state.history.length + remainingSteps(questions, state.index, state.answers) + 1)
      : 0,
    answeredCount,
    setAnswer,
    advance,
    goBack,
    jumpTo,
    start,
    finish,
    restart,
    setError,
  };
}
