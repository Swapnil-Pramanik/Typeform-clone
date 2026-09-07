"use client";

/**
 * The public respondent experience: one question at a time, keyboard-first.
 *
 * The view owns presentation and network calls only — the step machine lives in
 * `useFormFlow` and every question is drawn by the shared `QuestionRenderer`,
 * the same component the builder previews with.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { ClosedScreen } from "@/components/flow/ClosedScreen";
import { EndingScreen } from "@/components/flow/EndingScreen";
import { NavChevrons } from "@/components/flow/NavChevrons";
import { ProgressBar } from "@/components/flow/ProgressBar";
import { WelcomeScreen } from "@/components/flow/WelcomeScreen";
import {
  reducedTransition,
  stepTransition,
  stepVariants,
} from "@/components/flow/motion";
import { useFormFlow } from "@/components/flow/useFormFlow";
import { QuestionRenderer } from "@/components/render/QuestionRenderer";
import { ApiError, API_BASE, api } from "@/lib/api";
import { formSurface } from "@/lib/formTheme";
import { useHotkeys, usePrefersReducedMotion } from "@/lib/hooks";
import {
  DEFAULT_FORM_SETTINGS,
  type EndingPayload,
  type PublicForm,
} from "@/types";

export function FormFlow({ form }: { form: PublicForm }) {
  const settings = { ...DEFAULT_FORM_SETTINGS, ...(form.settings ?? {}) };
  const flow = useFormFlow(form);
  const reduced = usePrefersReducedMotion();

  const [pending, setPending] = useState(false);
  const [ending, setEnding] = useState<EndingPayload | null>(null);
  const submitted = useRef(false);

  // Read through the flow's getter, never the render closure: this runs from an
  // auto-advance timer and from the visibility handler, both of which can fire
  // a beat after the answer was recorded.
  const getAnswers = flow.getAnswers;
  const payload = useCallback(
    () =>
      Object.entries(getAnswers())
        .filter(([, value]) => value !== null && value !== "")
        .map(([questionId, value]) => ({
          question_id: Number(questionId),
          value,
        })),
    [getAnswers],
  );

  const submit = useCallback(async () => {
    if (submitted.current) return;
    setPending(true);
    try {
      const result = await api.submitResponse(form.slug, {
        answers: payload(),
        is_complete: true,
      });
      submitted.current = true;
      setEnding(result.ending);
      flow.finish();
    } catch (error) {
      // The server is the authority. If it disagrees with the client mirror,
      // jump the respondent back to the question it named.
      if (error instanceof ApiError) {
        const index = flow.questions.findIndex(
          (q) => q.id === error.questionId,
        );
        if (index >= 0) flow.jumpTo(index);
        flow.setError(error.message);
      } else {
        flow.setError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }, [flow, form.slug, payload]);

  const onAdvance = useCallback(() => {
    const ok = flow.advance();
    if (ok && flow.isLast) void submit();
  }, [flow, submit]);

  /**
   * Enter advances from anywhere, including the choice and rating screens where
   * there is no text field to catch the key. The arrows step the flow the way
   * the corner chevrons do — down or right forward, up or left back — so the
   * whole form is navigable without ever reaching for the mouse.
   */
  useHotkeys((event) => {
    if (flow.phase !== "question") return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onAdvance();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      onAdvance();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      flow.goBack();
    }
  }, flow.phase === "question");

  /**
   * Drop-out beacon. A respondent who answered something and then left is
   * recorded as a partial response, which is what makes the dashboard's
   * completion rate mean anything.
   */
  useEffect(() => {
    const onHide = () => {
      if (submitted.current || document.visibilityState !== "hidden") return;
      const answers = payload();
      if (answers.length === 0) return;
      submitted.current = true;
      navigator.sendBeacon(
        `${API_BASE}/api/f/${form.slug}/responses`,
        new Blob([JSON.stringify({ answers, is_complete: false })], {
          type: "application/json",
        }),
      );
    };

    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [form.slug, payload]);

  const transition = reduced ? reducedTransition : stepTransition;
  const variants = stepVariants(reduced);

  return (
    <main
      /* text-ink so inherited colours resolve against this surface, not <body>. */
      className="relative min-h-dvh overflow-hidden bg-bg font-[family-name:var(--font-form)] text-ink"
      style={formSurface(form.theme)}
    >
      {form.accepting_responses === false ? (
        <div className="flex min-h-dvh items-center">
          <div className="w-full px-6 py-24 sm:px-10 lg:pl-[26vw] lg:pr-16">
            <div className="flex justify-center lg:justify-start">
              <ClosedScreen title={form.title} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {flow.phase === "question" && settings.show_progress_bar && (
            <ProgressBar value={flow.progress} />
          )}

          <div className="flex min-h-dvh items-center">
            <div className="w-full px-6 py-24 sm:px-10 lg:pl-[26vw] lg:pr-16">
              <AnimatePresence
                mode="wait"
                custom={flow.direction}
                initial={false}
              >
                {flow.phase === "welcome" && form.welcome_screen && (
                  <motion.div
                    key="welcome"
                    custom={flow.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex justify-center lg:justify-start"
                  >
                    <WelcomeScreen
                      data={form.welcome_screen}
                      formTitle={form.title}
                      onStart={flow.start}
                    />
                  </motion.div>
                )}

                {flow.phase === "question" && flow.current && (
                  <motion.div
                    key={flow.current.id}
                    custom={flow.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="max-w-2xl"
                  >
                    <QuestionRenderer
                      question={flow.current}
                      index={
                        settings.show_question_number ? flow.index + 1 : null
                      }
                      value={flow.answers[flow.current.id] ?? null}
                      onChange={(value) =>
                        flow.setAnswer(flow.current!.id, value)
                      }
                      onAdvance={onAdvance}
                      interactive
                      autoFocus
                      error={flow.error}
                      isLast={flow.isLast}
                      pending={pending}
                      showRequiredAsterisk={settings.show_required_asterisk}
                      showAnswerLetters={settings.show_answer_letters}
                    />
                  </motion.div>
                )}

                {flow.phase === "ending" && (
                  <motion.div
                    key="ending"
                    custom={flow.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex justify-center lg:justify-start"
                  >
                    <EndingScreen
                      ending={ending}
                      onRestart={() => {
                        submitted.current = false;
                        setEnding(null);
                        flow.restart();
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {flow.phase === "question" && (
            <NavChevrons
              onUp={flow.goBack}
              onDown={onAdvance}
              canGoUp={flow.canGoBack}
              canGoDown={!pending}
              showArrows={settings.show_navigation_arrows}
              showBranding={settings.show_branding}
            />
          )}
        </>
      )}
    </main>
  );
}
