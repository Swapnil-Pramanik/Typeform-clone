"use client";

/**
 * The builder's centre pane: the selected block on a near-white canvas,
 * editable in place.
 *
 * It mounts the same components the public fill page mounts — `QuestionRenderer`
 * for questions, `WelcomeScreen` and `EndingScreen` for the two screens — with
 * `interactive={false}` and the inline-editing callbacks supplied. That is why
 * the preview cannot drift from what a respondent will actually see.
 */

import type { ReactNode } from "react";

import { EditableChoiceList } from "@/components/builder/EditableChoiceList";
import { EndingScreen } from "@/components/flow/EndingScreen";
import { WelcomeScreen } from "@/components/flow/WelcomeScreen";
import { QuestionRenderer } from "@/components/render/QuestionRenderer";
import { formSurface } from "@/lib/formTheme";
import { isChoiceType } from "@/lib/questionTypes";
import type {
  FormTheme,
  Question,
  WelcomeScreen as WelcomeScreenData,
} from "@/types";

interface PreviewPaneProps {
  question: Question | null;
  /** 1-based number shown in the badge; `null` for endings. */
  index: number | null;
  onPatch: (patch: {
    title?: string;
    description?: string | null;
    options?: { label: string }[];
  }) => void;
  /** Set when the welcome screen is selected — it is form data, not a question. */
  welcome?: WelcomeScreenData | null;
  onWelcomePatch?: (patch: Partial<WelcomeScreenData>) => void;
  formTitle?: string;
  /** The form's own colours, so the preview matches what respondents get. */
  theme?: FormTheme | null;
}

function Canvas({
  children,
  theme,
}: {
  children: ReactNode;
  theme?: FormTheme | null;
}) {
  return (
    <div className="tf-scrollbar flex flex-1 items-center justify-center overflow-y-auto bg-canvas p-8">
      <div
        /*
          `text-ink` matters as much as the variables. Redefining `--tf-ink` here
          only reaches elements that name the token; anything that simply
          inherits its colour would still take `body`'s already-resolved value —
          which in dark mode ghosted the choice labels against the form's own
          light card. Setting the colour on the surface makes inheritance land
          on the right value too.
        */
        className="w-full max-w-2xl rounded-xl border border-line bg-bg px-10 py-14 font-[family-name:var(--font-form)] text-ink shadow-sm"
        style={formSurface(theme)}
      >
        {children}
      </div>
    </div>
  );
}

export function PreviewPane({
  question,
  index,
  onPatch,
  welcome,
  onWelcomePatch,
  formTitle = "",
  theme,
}: PreviewPaneProps) {
  if (welcome && onWelcomePatch) {
    return (
      <Canvas theme={theme}>
        <WelcomeScreen
          data={welcome}
          formTitle={formTitle}
          onStart={() => {}}
          interactive={false}
          onTitleChange={(title) => onWelcomePatch({ title })}
          onDescriptionChange={(description) => onWelcomePatch({ description })}
        />
      </Canvas>
    );
  }

  if (!question) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas text-sm text-ink-muted">
        Select a block to edit it.
      </div>
    );
  }

  if (question.type === "ending") {
    return (
      <Canvas theme={theme}>
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
      </Canvas>
    );
  }

  return (
    <Canvas theme={theme}>
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
    </Canvas>
  );
}
