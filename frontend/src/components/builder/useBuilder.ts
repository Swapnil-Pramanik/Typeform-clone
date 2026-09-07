"use client";

/**
 * The builder's editing model.
 *
 * Every edit is written into the React Query cache immediately and flushed to
 * the server on a 600ms debounce, which is the whole of the autosave: no save
 * button, no dirty-state bookkeeping, and the preview reflects the change on the
 * keystroke. Pending patches are merged per question, so a burst of typing is
 * one PATCH rather than one per character.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { api, type QuestionPatch } from "@/lib/api";
import { useDebouncedCallback } from "@/lib/hooks";
import { keys, useFormQuery } from "@/lib/queries";
import type {
  Form,
  FormTheme,
  Question,
  QuestionType,
  RuleOperator,
  WelcomeScreen,
} from "@/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** One branching rule as the builder sends it. */
export interface RulePayload {
  operator: RuleOperator;
  value?: unknown;
  target_question_id: number;
}

const AUTOSAVE_MS = 600;

interface FormPatch {
  title?: string;
  /** The welcome screen is form-level JSON, not a question row. */
  welcome_screen?: WelcomeScreen | null;
  /** So is the theme. */
  theme?: FormTheme | null;
}

export function useBuilder(formId: number) {
  const client = useQueryClient();
  const query = useFormQuery(formId);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const questionPatches = useRef(new Map<number, QuestionPatch>());
  const formPatch = useRef<FormPatch>({});

  const writeCache = useCallback(
    (update: (form: Form) => Form) => {
      client.setQueryData<Form>(keys.form(formId), (form) =>
        form ? update(form) : form,
      );
    },
    [client, formId],
  );

  const flush = useDebouncedCallback(async () => {
    const questions = [...questionPatches.current.entries()];
    const form = { ...formPatch.current };
    questionPatches.current.clear();
    formPatch.current = {};
    if (questions.length === 0 && Object.keys(form).length === 0) return;

    // New options are optimistic and carry placeholder IDs, so a patch that
    // touched the option list has to be reconciled with the server's real ones.
    const touchedOptions = questions.some(([, patch]) => patch.options);

    try {
      await Promise.all([
        ...questions.map(([id, patch]) => api.updateQuestion(id, patch)),
        ...(Object.keys(form).length ? [api.updateForm(formId, form)] : []),
      ]);
      setSaveState("saved");
      void client.invalidateQueries({ queryKey: ["forms"] });
      if (touchedOptions) {
        void client.invalidateQueries({ queryKey: keys.form(formId) });
      }
    } catch {
      setSaveState("error");
    }
  }, AUTOSAVE_MS);

  /**
   * Edit a question: cache first, server a beat later.
   *
   * `settings` is merged against the question's current settings before it is
   * queued, because the server replaces the whole JSON column — sending only the
   * changed key would silently drop the others.
   */
  const patchQuestion = useCallback(
    (id: number, patch: QuestionPatch) => {
      const cached = client
        .getQueryData<Form>(keys.form(formId))
        ?.questions.find((question) => question.id === id);

      const merged: QuestionPatch = patch.settings
        ? { ...patch, settings: { ...cached?.settings, ...patch.settings } }
        : patch;

      writeCache((form) => ({
        ...form,
        questions: form.questions.map((question) =>
          question.id === id ? applyPatch(question, merged) : question,
        ),
      }));

      questionPatches.current.set(id, {
        ...questionPatches.current.get(id),
        ...merged,
      });
      setSaveState("saving");
      flush(null);
    },
    [client, flush, formId, writeCache],
  );

  const patchForm = useCallback(
    (patch: FormPatch) => {
      writeCache((form) => ({ ...form, ...patch }));
      formPatch.current = { ...formPatch.current, ...patch };
      setSaveState("saving");
      flush(null);
    },
    [flush, writeCache],
  );

  const addQuestion = useCallback(
    async (type: QuestionType, title: string, settings?: Question["settings"]) => {
      setSaveState("saving");
      const created = await api.addQuestion(formId, {
        type,
        title,
        settings: settings ?? undefined,
      });
      writeCache((form) => ({ ...form, questions: [...form.questions, created] }));
      setSaveState("saved");
      void client.invalidateQueries({ queryKey: ["forms"] });
      return created;
    },
    [client, formId, writeCache],
  );

  /**
   * Structural changes are written to the cache first so the UI responds at
   * once, and rolled back if the server refuses. Without the rollback the
   * builder would keep showing a block list that was never persisted.
   */
  const deleteQuestion = useCallback(
    async (id: number) => {
      const previous = client.getQueryData<Form>(keys.form(formId));
      writeCache((form) => ({
        ...form,
        questions: form.questions.filter((question) => question.id !== id),
      }));
      try {
        await api.deleteQuestion(id);
      } catch (error) {
        if (previous) client.setQueryData(keys.form(formId), previous);
        throw error;
      }
      void client.invalidateQueries({ queryKey: ["forms"] });
    },
    [client, formId, writeCache],
  );

  /**
   * Rules go straight to the server rather than through the autosave queue: the
   * server can refuse a set that loops, and that refusal has to reach the author
   * attached to the rule they just wrote.
   */
  const setRules = useCallback(
    async (questionId: number, rules: RulePayload[]) => {
      setSaveState("saving");
      try {
        const updated = await api.setRules(questionId, rules);
        writeCache((form) => ({
          ...form,
          questions: form.questions.map((question) =>
            question.id === questionId ? updated : question,
          ),
        }));
        setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        throw error;
      }
    },
    [writeCache],
  );

  /**
   * Reordering sends the complete ordered ID array; the server rewrites every
   * position in one transaction, so the client never computes a position itself.
   */
  const reorder = useCallback(
    async (orderedIds: number[]) => {
      const previous = client.getQueryData<Form>(keys.form(formId));
      writeCache((form) => ({
        ...form,
        questions: orderedIds
          .map((id) => form.questions.find((question) => question.id === id))
          .filter((question): question is Question => Boolean(question))
          .map((question, index) => ({ ...question, position: index })),
      }));
      setSaveState("saving");
      try {
        const updated = await api.reorderQuestions(formId, orderedIds);
        client.setQueryData(keys.form(formId), updated);
        setSaveState("saved");
      } catch (error) {
        if (previous) client.setQueryData(keys.form(formId), previous);
        setSaveState("error");
        throw error;
      }
    },
    [client, formId, writeCache],
  );

  return {
    form: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveState,
    patchQuestion,
    patchForm,
    addQuestion,
    deleteQuestion,
    reorder,
    setRules,
  };
}

/** Apply a patch to the cached question so the preview matches what was typed. */
function applyPatch(question: Question, patch: QuestionPatch): Question {
  return {
    ...question,
    ...patch,
    settings: patch.settings
      ? { ...question.settings, ...patch.settings }
      : question.settings,
    options: patch.options
      ? patch.options.map((option, index) => ({
          // Labels are what the creator sees; real IDs arrive with the refetch
          // that follows the autosave.
          id: question.options[index]?.id ?? -(index + 1),
          label: option.label,
          position: index,
        }))
      : question.options,
  };
}
