"use client";

/**
 * The builder: block list, live preview and settings panel.
 *
 * The page itself only wires the three panes to `useBuilder` — the editing model,
 * the autosave and the reorder call all live there.
 */

import { use, useMemo, useState } from "react";

import { AddElementModal } from "@/components/builder/AddElementModal";
import { FormShell } from "@/components/builder/FormShell";
import { PreviewPane } from "@/components/builder/PreviewPane";
import { DesignSettings } from "@/components/builder/DesignSettings";
import { QuestionList } from "@/components/builder/QuestionList";
import { SaveIndicator } from "@/components/builder/SaveIndicator";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import {
  DESIGN,
  WELCOME,
  question as questionSelection,
  selectedQuestion,
  type Selection,
} from "@/components/builder/selection";
import { useBuilder } from "@/components/builder/useBuilder";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingPane } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { BLOCKS } from "@/lib/questionTypes";
import type { QuestionType } from "@/types";

export default function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const formId = Number(use(params).id);
  const builder = useBuilder(formId);
  const toast = useToast();

  const [chosen, setChosen] = useState<Selection | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const questions = useMemo(
    () => builder.form?.questions ?? [],
    [builder.form?.questions],
  );
  const welcome = builder.form?.welcome_screen ?? null;

  // The selection is derived, not synchronised: after a delete or a reload the
  // chosen block may be gone, and falling back needs no effect.
  const fallback: Selection = questions[0]
    ? questionSelection(questions[0].id)
    : WELCOME;
  const chosenIsValid =
    chosen !== null &&
    (chosen.kind === "welcome"
      ? welcome !== null
      : chosen.kind === "design"
        ? true
        : questions.some((q) => q.id === chosen.id));
  const selection = chosenIsValid ? chosen : fallback;
  const selected = selectedQuestion(selection, questions);
  const pages = questions.filter((question) => question.type !== "ending");
  const badgeIndex =
    selected && selected.type !== "ending"
      ? pages.findIndex((question) => question.id === selected.id) + 1
      : null;

  /** Structural edits go straight to the server, so each one can fail visibly. */
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (failure) {
      toast.show(errorMessage(failure), "error");
    }
  };

  const addBlock = (type: QuestionType) =>
    run(async () => {
      const meta = BLOCKS[type];
      // Question types are created untitled so the renderer's placeholder shows
      // and the creator types straight in; only endings ship with real copy.
      const created = await builder.addQuestion(
        type,
        meta.defaultTitle ?? "",
        meta.defaultSettings,
      );
      setChosen(questionSelection(created.id));
    });

  const removeSelected = () =>
    run(async () => {
      if (!selected) return;
      await builder.deleteQuestion(selected.id);
      toast.show("Block deleted. Existing answers to it are kept.");
    });

  const reorder = (ids: number[]) => run(() => builder.reorder(ids));

  /** Adding a welcome screen is a form patch, not a new question row. */
  const addWelcome = () => {
    builder.patchForm({
      welcome_screen: welcome ?? {
        title: "",
        description: "",
        button_text: "Start",
      },
    });
    setChosen(WELCOME);
  };

  return (
    <FormShell
      formId={formId}
      headerSlot={<SaveIndicator state={builder.saveState} />}
    >
      {builder.isLoading ? (
        <div className="flex-1">
          <LoadingPane label="Loading your form" />
        </div>
      ) : builder.error ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            title="Couldn’t load this form"
            description={errorMessage(builder.error)}
          />
        </div>
      ) : (
        <>
          <QuestionList
            questions={questions}
            selected={selection}
            onSelect={setChosen}
            welcome={welcome}
            onAddWelcome={addWelcome}
            onSelectDesign={() => setChosen(DESIGN)}
            onReorder={(ids) => void reorder(ids)}
            onAddContent={() => setAddOpen(true)}
            onAddEnding={() => void addBlock("ending")}
          />

          <PreviewPane
            question={selected}
            index={badgeIndex}
            onPatch={(patch) =>
              selected && builder.patchQuestion(selected.id, patch)
            }
            welcome={selection.kind === "welcome" ? welcome : null}
            onWelcomePatch={(patch) =>
              builder.patchForm({ welcome_screen: { ...welcome, ...patch } })
            }
            formTitle={builder.form?.title ?? ""}
            theme={builder.form?.theme ?? null}
          />

          {selection.kind === "design" ? (
            <DesignSettings
              theme={builder.form?.theme ?? null}
              onPatch={(patch) =>
                builder.patchForm({
                  theme: { ...(builder.form?.theme ?? {}), ...patch },
                })
              }
            />
          ) : (
            <SettingsPanel
              question={selected}
              onPatch={(patch) =>
                selected && builder.patchQuestion(selected.id, patch)
              }
              onDelete={() => void removeSelected()}
              welcome={selection.kind === "welcome" ? welcome : null}
              onWelcomePatch={(patch) =>
                builder.patchForm({ welcome_screen: { ...welcome, ...patch } })
              }
              onWelcomeRemove={() => {
                builder.patchForm({ welcome_screen: null });
                setChosen(null);
              }}
            />
          )}

          <AddElementModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onPick={(type) => void addBlock(type)}
            onPickWelcome={addWelcome}
          />
        </>
      )}
    </FormShell>
  );
}
