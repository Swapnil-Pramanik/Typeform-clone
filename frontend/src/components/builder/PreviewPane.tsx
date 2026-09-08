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

import { useEffect, useRef, useState, type ReactNode } from "react";

import { EditableChoiceList } from "@/components/builder/EditableChoiceList";
import { EndingScreen } from "@/components/flow/EndingScreen";
import {
  FormStage,
  STAGE_CENTRED,
  STAGE_OFFSET,
} from "@/components/flow/FormStage";
import { WelcomeScreen } from "@/components/flow/WelcomeScreen";
import { QuestionRenderer } from "@/components/render/QuestionRenderer";
import { FRAMES } from "@/lib/device";
import { cn } from "@/lib/format";
import { formSurface } from "@/lib/formTheme";
import { isChoiceType } from "@/lib/questionTypes";
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

/**
 * How much of the frame fits in the pane, never magnified past life size.
 *
 * Measured with a ResizeObserver rather than the window, because the pane
 * changes width on its own — the settings panel and the block list are both
 * beside it.
 */
function useFitScale(frame: { width: number; height: number }) {
  const area = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = area.current;
    if (!node) return;
    // ResizeObserver fires once on observe, so there is no separate first
    // measurement to make — and none to make synchronously during the effect.
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / frame.width, height / frame.height, 1));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [frame.width, frame.height]);

  return { area, scale };
}

function Canvas({
  children,
  theme,
  device = "desktop",
  /** Questions sit in an offset column; screens are centred. See `FormStage`. */
  placement = "offset",
}: {
  children: ReactNode;
  theme?: FormTheme | null;
  device?: ViewDevice;
  placement?: "offset" | "centred";
}) {
  const frame = FRAMES[device];
  const { area, scale } = useFitScale(frame);

  return (
    <div
      ref={area}
      className="flex flex-1 items-center justify-center overflow-hidden bg-canvas p-6"
    >
      {/* Holds the space the scaled frame occupies: a transform does not change
          layout size, so without this the pane would centre the full 1440px. */}
      <div
        className="shrink-0"
        style={{ width: frame.width * scale, height: frame.height * scale }}
      >
        <div
          /*
            Rendered at real device size and scaled down, so this is a model of
            a 1440px desktop rather than a narrow browser. A card merely sized
            to the pane is about a thousand pixels wide, and the column offset
            written for a desktop viewport then takes up the whole frame.

            `text-ink` matters as much as the variables. Redefining `--tf-ink`
            here only reaches elements that name the token; anything that simply
            inherits its colour would still take `body`'s already-resolved value
            — which in dark mode ghosted the choice labels against the form's
            own light card. Setting the colour on the surface makes inheritance
            land on the right value too.

            `@container` makes the shared renderer's breakpoints measure this
            frame. No padding here: a container measures its *content* box, so
            padding would shrink what the frame reports its width to be.
          */
          className={cn(
            "@container relative overflow-hidden rounded-xl border border-line",
            "bg-bg font-[family-name:var(--font-form)] text-ink shadow-sm",
          )}
          style={{
            ...formSurface(theme),
            width: frame.width,
            height: frame.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="tf-scrollbar absolute inset-0 overflow-y-auto">
            <FormStage fill>
              <div className={placement === "centred" ? STAGE_CENTRED : STAGE_OFFSET}>
                <div className={placement === "centred" ? undefined : "max-w-2xl"}>
                  {children}
                </div>
              </div>
            </FormStage>
          </div>
        </div>
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
      <Canvas theme={theme} device={device} placement="centred">
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
      <Canvas theme={theme} device={device} placement="centred">
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
