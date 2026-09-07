"use client";

/**
 * The builder's centre pane: the selected block on a near-white canvas,
 * editable in place.
 *
 * It mounts the same `QuestionRenderer` the public fill page mounts, with
 * `interactive={false}` and the inline-editing callbacks supplied. That is why
 * the preview cannot drift from what a respondent will actually see.
 */

import { EditableChoiceList } from "@/components/builder/EditableChoiceList";
import { EndingScreen } from "@/components/flow/EndingScreen";
import { QuestionRenderer } from "@/components/render/QuestionRenderer";
import { isChoiceType } from "@/lib/questionTypes";
import type { Question } from "@/types";

interface PreviewPaneProps {
  question: Question | null;
  /** 1-based number shown in the badge; `null` for endings. */
  index: number | null;
  onPatch: (patch: {
    title?: string;
    description?: string | null;
    options?: { label: string }[];
  }) => void;
}

export function PreviewPane({ question, index, onPatch }: PreviewPaneProps) {
  if (!question) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas text-sm text-ink-muted">
        Select a block to edit it.
      </div>
    );
  }

  return (
    <div className="tf-scrollbar flex flex-1 items-center justify-center overflow-y-auto bg-canvas p-8">
      <div className="w-full max-w-2xl rounded-xl border border-line bg-bg px-10 py-14 shadow-sm">
        {question.type === "ending" ? (
          <EndingPreview question={question} onPatch={onPatch} />
        ) : (
          <QuestionRenderer
            question={question}
            index={index}
            value={null}
            onChange={() => {}}
            onAdvance={() => {}}
            interactive={false}
            showActions={false}
            onTitleChange={(title) => onPatch({ title })}
            onDescriptionChange={(description) => onPatch({ description })}
            bodySlot={
              isChoiceType(question.type) ? (
                <EditableChoiceList
                  question={question}
                  onChange={(labels) =>
                    onPatch({ options: labels.map((label) => ({ label })) })
                  }
                />
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

/** Endings have no input, so they are previewed as the screen respondents see. */
function EndingPreview({
  question,
  onPatch,
}: {
  question: Question;
  onPatch: PreviewPaneProps["onPatch"];
}) {
  return (
    <EndingScreen
      ending={{
        id: question.id,
        title: question.title,
        description: question.description,
        settings: question.settings ?? {},
      }}
      onTitleChange={(title) => onPatch({ title })}
      onDescriptionChange={(description) => onPatch({ description })}
    />
  );
}
