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
import { QuestionList } from "@/components/builder/QuestionList";
import { SaveIndicator } from "@/components/builder/SaveIndicator";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
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

  const [chosenId, setChosenId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const questions = useMemo(
    () => builder.form?.questions ?? [],
    [builder.form?.questions],
  );

  // The selection is derived, not synchronised: after a delete or a reload the
  // chosen block may be gone, and falling back to the first one needs no effect.
  const selected =
    questions.find((question) => question.id === chosenId) ?? questions[0] ?? null;
  const selectedId = selected?.id ?? null;
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
      setChosenId(created.id);
    });

  const removeSelected = () =>
    run(async () => {
      if (!selected) return;
      await builder.deleteQuestion(selected.id);
      toast.show("Block deleted. Existing answers to it are kept.");
    });

  const reorder = (ids: number[]) => run(() => builder.reorder(ids));

  return (
    <FormShell formId={formId} headerSlot={<SaveIndicator state={builder.saveState} />}>
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
            selectedId={selectedId}
            onSelect={setChosenId}
            onReorder={(ids) => void reorder(ids)}
            onAddContent={() => setAddOpen(true)}
            onAddEnding={() => void addBlock("ending")}
          />

          <PreviewPane
            question={selected}
            index={badgeIndex}
            onPatch={(patch) => selected && builder.patchQuestion(selected.id, patch)}
          />

          <SettingsPanel
            question={selected}
            onPatch={(patch) => selected && builder.patchQuestion(selected.id, patch)}
            onDelete={() => void removeSelected()}
          />

          <AddElementModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onPick={(type) => void addBlock(type)}
          />
        </>
      )}
    </FormShell>
  );
}
