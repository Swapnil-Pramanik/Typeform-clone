"use client";

/**
 * The right-hand panel: what the selected block can be configured to do.
 *
 * Laid out the way the real product lays it out — a block-type dropdown at the
 * top, then a flat list of labelled rows, then the openable sections pinned to
 * the bottom. Which rows appear depends on the block, but the shapes come from
 * `PanelRow` so the three variants cannot drift apart.
 *
 * Required, Description, Multiple selection, the rating scale, the button label
 * and the estimated time are real and write through the autosave. Randomize,
 * "Other", "None" and Vertical alignment are present but inert — they are what
 * makes the panel read as the real product, and pressing one says so.
 */

import { AddRow, Divider, Field, PANEL_INPUT, Row } from "@/components/builder/PanelRow";
import { Toggle } from "@/components/builder/Toggle";
import { Dropdown } from "@/components/ui/Dropdown";
import { Gem, Trash } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { ANSWER_TYPES, BLOCKS, isChoiceType } from "@/lib/questionTypes";
import type {
  Question,
  QuestionType,
  WelcomeScreen as WelcomeScreenData,
} from "@/types";

const RATING_SCALES = [3, 4, 5, 7, 10];
/** The real panel caps its button label and shows the count beneath. */
const BUTTON_MAX = 24;

interface SettingsPanelProps {
  question: Question | null;
  onPatch: (patch: {
    type?: QuestionType;
    required?: boolean;
    settings?: Record<string, unknown>;
  }) => void;
  onDelete: () => void;
  welcome?: WelcomeScreenData | null;
  onWelcomePatch?: (patch: Partial<WelcomeScreenData>) => void;
  onWelcomeRemove?: () => void;
  /** Opens the Logic dialog on this block. Absent for blocks that cannot branch. */
  onOpenLogic?: () => void;
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="tf-scrollbar flex w-[300px] shrink-0 flex-col overflow-y-auto border-l-2 border-groove bg-panel">
      {children}
    </aside>
  );
}

/** The pinned pair every block shows, whatever else is above them. */
function PinnedSections({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mt-auto">
      <Divider />
      {children ?? <AddRow label="Logic" comingSoonLabel="Logic on this block" />}
      <Divider />
      <AddRow
        label="Comments"
        comingSoonLabel="Comments"
        trailing={
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand">
            <Gem width={11} height={11} strokeWidth={2} />
          </span>
        }
      />
    </div>
  );
}

export function SettingsPanel({
  question,
  onPatch,
  onDelete,
  welcome,
  onWelcomePatch,
  onWelcomeRemove,
  onOpenLogic,
}: SettingsPanelProps) {
  if (welcome && onWelcomePatch && onWelcomeRemove) {
    return (
      <WelcomeSettings
        welcome={welcome}
        onPatch={onWelcomePatch}
        onRemove={onWelcomeRemove}
      />
    );
  }

  if (!question) return <Shell />;

  if (question.type === "ending") {
    return <EndingSettings question={question} onPatch={onPatch} onDelete={onDelete} />;
  }

  const settings = question.settings ?? {};

  return (
    <Shell>
      <div className="p-3">
        <Dropdown
          label="Answer type"
          value={question.type}
          onChange={(type) => onPatch({ type })}
          options={ANSWER_TYPES.map((type) => {
            const Icon = BLOCKS[type].icon;
            return {
              value: type,
              label: BLOCKS[type].label,
              icon: <Icon width={15} height={15} />,
            };
          })}
          triggerClassName="w-full border-line-strong bg-bg py-2 text-ink"
        />
      </div>

      <Divider />

      <Row label="Required">
        <Toggle
          label="Required"
          checked={question.required}
          onChange={(required) => onPatch({ required })}
        />
      </Row>

      {isChoiceType(question.type) && (
        <>
          <Row label="Multiple selection">
            <Toggle
              label="Multiple selection"
              checked={Boolean(settings.multi_select)}
              onChange={(multi_select) => onPatch({ settings: { multi_select } })}
              disabled={question.type === "dropdown"}
              hint={
                question.type === "dropdown" ? "Dropdowns accept one answer" : undefined
              }
            />
          </Row>
          <Row label="Randomize">
            <Toggle label="Randomize" checked={false} onChange={() => {}} comingSoon />
          </Row>
          <Row label={'"Other" option'}>
            <Toggle label={'"Other" option'} checked={false} onChange={() => {}} comingSoon />
          </Row>
          <Row label={'"None" option'}>
            <Toggle label={'"None" option'} checked={false} onChange={() => {}} comingSoon />
          </Row>
          <Row label="Vertical alignment">
            <Toggle label="Vertical alignment" checked onChange={() => {}} comingSoon />
          </Row>
        </>
      )}

      {question.type === "rating" && (
        <Row label="Steps">
          <div className="flex gap-1">
            {RATING_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => onPatch({ settings: { max_rating: scale } })}
                className={cn(
                  "h-7 w-7 rounded-md text-[12px] font-medium transition-colors",
                  (settings.max_rating ?? 5) === scale
                    ? "bg-accent text-accent-ink"
                    : "bg-muted text-ink-muted hover:bg-muted-strong",
                )}
              >
                {scale}
              </button>
            ))}
          </div>
        </Row>
      )}

      <Divider />
      <AddRow label="Image or video" comingSoonLabel="Question images and video" />

      <PinnedSections>
        {onOpenLogic ? (
          <AddRow
            label="Logic"
            onAdd={onOpenLogic}
            trailing={
              question.rules.length > 0 ? (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-ink">
                  {question.rules.length}
                </span>
              ) : undefined
            }
          />
        ) : undefined}
      </PinnedSections>

      <div className="border-t border-line p-3">
        <DeleteButton onClick={onDelete} label="Delete block" />
      </div>
    </Shell>
  );
}

/** Welcome screens carry a button label and an optional "takes X minutes" line. */
function WelcomeSettings({
  welcome,
  onPatch,
  onRemove,
}: {
  welcome: WelcomeScreenData;
  onPatch: (patch: Partial<WelcomeScreenData>) => void;
  onRemove: () => void;
}) {
  const label = welcome.button_text ?? "";
  const timed = welcome.estimated_minutes !== undefined;

  return (
    <Shell>
      <div className="p-3">
        <div className="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-bg px-3 py-2 text-[14px] text-ink">
          <BlockChip tint="#0891b2">★</BlockChip>
          Welcome Screen
        </div>
      </div>

      <Divider />

      <Row label="Time to complete" hint="Shows a 'Takes X minutes' line under the button">
        <Toggle
          label="Time to complete"
          checked={timed}
          onChange={(on) => onPatch({ estimated_minutes: on ? 1 : undefined })}
        />
      </Row>

      {timed && (
        <Field label="Minutes">
          <input
            type="number"
            min={1}
            max={120}
            value={welcome.estimated_minutes ?? 1}
            onChange={(event) =>
              onPatch({ estimated_minutes: Math.max(1, Number(event.target.value)) })
            }
            aria-label="Estimated minutes"
            className={PANEL_INPUT}
          />
        </Field>
      )}

      <Row label="Number of submissions" hint="Shows how many people have replied">
        <Toggle
          label="Number of submissions"
          checked={false}
          onChange={() => {}}
          comingSoon
        />
      </Row>

      <Field label="Button" counter={`${label.length}/${BUTTON_MAX}`}>
        <input
          value={label}
          maxLength={BUTTON_MAX}
          placeholder="Start"
          onChange={(event) => onPatch({ button_text: event.target.value })}
          aria-label="Button label"
          className={PANEL_INPUT}
        />
      </Field>

      <Divider />
      <AddRow label="Image or video" comingSoonLabel="Welcome images and video" />

      <PinnedSections />

      <div className="border-t border-line p-3">
        <DeleteButton onClick={onRemove} label="Remove welcome screen" />
      </div>
    </Shell>
  );
}

/** Endings are screens too: copy in the preview, a button label here. */
function EndingSettings({
  question,
  onPatch,
  onDelete,
}: {
  question: Question;
  onPatch: SettingsPanelProps["onPatch"];
  onDelete: () => void;
}) {
  const label = question.settings?.button_text ?? "";

  return (
    <Shell>
      <div className="p-3">
        <div className="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-bg px-3 py-2 text-[14px] text-ink">
          <BlockChip tint="#475569">A</BlockChip>
          Ending
        </div>
      </div>

      <Divider />

      <div className="px-4 py-2.5">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Endings are ordinary blocks, so this screen is data rather than a
          hardcoded page. Edit its copy in the preview.
        </p>
      </div>

      <Field label="Button" counter={`${label.length}/${BUTTON_MAX}`}>
        <input
          value={label}
          maxLength={BUTTON_MAX}
          placeholder="Create a typeform"
          onChange={(event) => onPatch({ settings: { button_text: event.target.value } })}
          aria-label="Button label"
          className={PANEL_INPUT}
        />
      </Field>

      <Divider />
      <AddRow label="Image or video" comingSoonLabel="Ending images and video" />

      <PinnedSections />

      <div className="border-t border-line p-3">
        <DeleteButton onClick={onDelete} label="Delete block" />
      </div>
    </Shell>
  );
}

function BlockChip({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
      style={{ backgroundColor: tint }}
    >
      {children}
    </span>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-[13px] font-medium text-danger hover:bg-danger/5"
    >
      <Trash width={14} height={14} />
      {label}
    </button>
  );
}
