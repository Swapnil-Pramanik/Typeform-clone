"use client";

/**
 * The right-hand block settings panel.
 *
 * Required, Description, Multiple selection and the rating scale are real and
 * write straight through the autosave. Randomize, "Other", "None" and Vertical
 * alignment are present but inert — they are what makes the panel read as the
 * real product, and they are labelled as out of scope in the README rather than
 * hidden.
 */

import { useState } from "react";

import { Toggle } from "@/components/builder/Toggle";
import { ChevronDown, Lock, Sparkle, Trash } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { ANSWER_TYPES, BLOCKS, isChoiceType } from "@/lib/questionTypes";
import type {
  Question,
  QuestionType,
  WelcomeScreen as WelcomeScreenData,
} from "@/types";

interface SettingsPanelProps {
  question: Question | null;
  /** Set when the welcome screen is selected rather than a question. */
  welcome?: WelcomeScreenData | null;
  onWelcomePatch?: (patch: Partial<WelcomeScreenData>) => void;
  onWelcomeRemove?: () => void;
  onPatch: (patch: {
    type?: QuestionType;
    required?: boolean;
    settings?: Record<string, unknown>;
  }) => void;
  onDelete: () => void;
}

const RATING_SCALES = [3, 4, 5, 7, 10];

export function SettingsPanel({
  question,
  onPatch,
  onDelete,
  welcome,
  onWelcomePatch,
  onWelcomeRemove,
}: SettingsPanelProps) {
  if (welcome && onWelcomePatch && onWelcomeRemove) {
    return <WelcomeSettings welcome={welcome} onPatch={onWelcomePatch} onRemove={onWelcomeRemove} />;
  }

  if (!question) {
    return <aside className="w-[300px] shrink-0 border-l-2 border-groove bg-panel" />;
  }

  const isEnding = question.type === "ending";

  return (
    <aside className="tf-scrollbar flex w-[300px] shrink-0 flex-col overflow-y-auto border-l-2 border-groove bg-panel">
      <div className="flex-1">
        {!isEnding && (
          <>
            <Section title="Question">
              <SegmentedControl options={["Text", "Video"]} />
            </Section>

            <Section title="Answer">
              <label className="relative block">
                <select
                  value={question.type}
                  onChange={(event) =>
                    onPatch({ type: event.target.value as QuestionType })
                  }
                  aria-label="Answer type"
                  className="w-full appearance-none rounded-lg border border-line-strong bg-bg px-3 py-2 pr-8 text-[13px] text-ink"
                >
                  {ANSWER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {BLOCKS[type].label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  width={15}
                  height={15}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
              </label>
            </Section>

            <Section>
              <Toggle
                label="Required"
                checked={question.required}
                onChange={(required) => onPatch({ required })}
              />

              {isChoiceType(question.type) && (
                <Toggle
                  label="Multiple selection"
                  checked={Boolean(question.settings?.multi_select)}
                  onChange={(multi_select) => onPatch({ settings: { multi_select } })}
                  disabled={question.type === "dropdown"}
                  hint={
                    question.type === "dropdown"
                      ? "Dropdowns accept one answer"
                      : undefined
                  }
                />
              )}

              {isChoiceType(question.type) && (
                <>
                  <Toggle label="Randomize" checked={false} onChange={() => {}} comingSoon />
                  <Toggle label='"Other" option' checked={false} onChange={() => {}} comingSoon />
                  <Toggle label='"None" option' checked={false} onChange={() => {}} comingSoon />
                  <Toggle
                    label="Vertical alignment"
                    checked
                    onChange={() => {}}
                    comingSoon
                  />
                </>
              )}

              {question.type === "rating" && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-ink">Steps</span>
                  <div className="flex gap-1">
                    {RATING_SCALES.map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => onPatch({ settings: { max_rating: scale } })}
                        className={cn(
                          "h-7 w-7 rounded text-[12px] font-medium transition-colors",
                          (question.settings?.max_rating ?? 5) === scale
                            ? "bg-accent text-accent-ink"
                            : "bg-muted text-ink-muted hover:bg-muted",
                        )}
                      >
                        {scale}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Image or video">
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-[12px] text-ink-faint">
                Drop an image here
              </div>
            </Section>
          </>
        )}

        {isEnding && (
          <Section title="Ending">
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Endings are ordinary blocks, so this screen is data rather than a
              hardcoded page. Edit its copy in the preview.
            </p>
          </Section>
        )}
      </div>

      <div className="border-t border-line">
        <PinnedSection title="Logic" icon={<Sparkle width={14} height={14} />} />
        <PinnedSection title="Comments" icon={<Lock width={14} height={14} />} />
        <div className="p-3">
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-[13px] font-medium text-danger hover:bg-danger/5"
          >
            <Trash width={14} height={14} />
            Delete block
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-4 py-3.5">
      {title && (
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

/** Logic and Comments are pinned to the bottom in the real panel. */
function PinnedSection({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="flex w-full items-center justify-between px-4 py-3 text-[13px] text-ink-faint"
    >
      <span className="flex items-center gap-2">
        {icon}
        {title}
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
        Soon
      </span>
    </button>
  );
}

function SegmentedControl({ options }: { options: string[] }) {
  const [active, setActive] = useState(options[0]);
  return (
    <div className="flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setActive(option)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            active === option ? "bg-bg text-ink shadow-sm" : "text-ink-muted",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}


/** The welcome screen's own options: button label and the "Takes X minutes" line. */
function WelcomeSettings({
  welcome,
  onPatch,
  onRemove,
}: {
  welcome: WelcomeScreenData;
  onPatch: (patch: Partial<WelcomeScreenData>) => void;
  onRemove: () => void;
}) {
  return (
    <aside className="tf-scrollbar flex w-[300px] shrink-0 flex-col overflow-y-auto border-l-2 border-groove bg-panel">
      <div className="flex-1">
        <Section title="Welcome screen">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Shown once, before the first question. Edit its copy in the preview.
          </p>
        </Section>

        <Section title="Button label">
          <input
            value={welcome.button_text ?? ""}
            onChange={(event) => onPatch({ button_text: event.target.value })}
            placeholder="Start"
            aria-label="Button label"
            className="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] text-ink"
          />
        </Section>

        <Section title="Estimated time">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={120}
              value={welcome.estimated_minutes ?? ""}
              onChange={(event) =>
                onPatch({
                  estimated_minutes: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              aria-label="Estimated minutes"
              className="w-20 rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] text-ink"
            />
            <span className="text-[13px] text-ink-muted">minutes</span>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Leave empty to hide the line.
          </p>
        </Section>
      </div>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={onRemove}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-[13px] font-medium text-danger hover:bg-danger/5"
        >
          <Trash width={14} height={14} />
          Remove welcome screen
        </button>
      </div>
    </aside>
  );
}
