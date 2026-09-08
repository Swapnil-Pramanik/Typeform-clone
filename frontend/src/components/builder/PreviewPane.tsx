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
import { cn } from "@/lib/format";
import { formSurface } from "@/lib/formTheme";
import { isChoiceType } from "@/lib/questionTypes";
import { PHONE } from "@/lib/device";
import type {
  FormTheme,
  Question,
  ViewDevice,
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
  /** Which frame to draw the card in. */
  device?: ViewDevice;
}

function Canvas({
  children,
  theme,
  device = "desktop",
}: {
  children: ReactNode;
  theme?: FormTheme | null;
  device?: ViewDevice;
}) {
  const mobile = device === "mobile";

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

          `@container` makes the shared renderer's breakpoints measure this card
          rather than the window behind it. The padding sits on the child, not
          here: a container measures its *content* box, so padding here would
          shrink what the card reports its width to be — and the card would
          claim to be narrower than the phone it is drawing.
        */
        className={cn(
          "@container w-full bg-bg font-[family-name:var(--font-form)] text-ink",
          mobile
            ? // A phone frame, not a narrow card: the bezel is what makes the
              // width read as a device rather than as a layout accident.
              "tf-scrollbar shrink-0 overflow-y-auto rounded-[2rem] border-[10px] border-ink-strong shadow-2xl"
            : "max-w-2xl rounded-xl border border-line shadow-sm",
        )}
        style={{
          ...formSurface(theme),
          ...(mobile ? { width: PHONE.width, height: PHONE.height } : {}),
        }}
      >
        <div className={mobile ? "px-6 py-10" : "px-10 py-14"}>{children}</div>
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
  device = "desktop",
}: PreviewPaneProps) {
  if (welcome && onWelcomePatch) {
    return (
      <Canvas theme={theme} device={device}>
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
      <Canvas theme={theme} device={device}>
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
    <Canvas theme={theme} device={device}>
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
