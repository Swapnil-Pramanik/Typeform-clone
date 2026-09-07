"use client";

/**
 * The Logic dialog: everything that decides where a respondent goes next.
 *
 * The real product groups this into four sections. One of them — Branching — is
 * built here; the other three are shown in place, disabled, because a section
 * missing entirely would read as an oversight rather than as scope. See the
 * Coming Soon note in the README.
 *
 * Edits are held as a draft until Save, which is why the dialog has a Cancel at
 * all: rules are the one part of the builder where a half-finished change can
 * strand a respondent, so autosaving each keystroke would be wrong here even
 * though it is right everywhere else.
 */

import { useState } from "react";

import {
  BranchingRules,
  targetLabel,
  type DraftRule,
} from "@/components/builder/BranchingRules";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import {
  Branch,
  Calculator,
  CaretDown,
  CaretUp,
  Eye,
  Info,
  Plus,
  Scissors,
  Trash,
} from "@/components/ui/icons";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/format";
import { BLOCKS } from "@/lib/questionTypes";
import type { Question } from "@/types";

export interface RuleChange {
  questionId: number;
  rules: DraftRule[];
}

interface LogicModalProps {
  open: boolean;
  onClose: () => void;
  /** Every live block, in position order — questions and endings alike. */
  questions: Question[];
  /** The block selected in the builder when the dialog was opened. */
  initialQuestionId: number | null;
  /** Resolves when every changed question has been written, or throws. */
  onSave: (changes: RuleChange[]) => Promise<void>;
}

/**
 * A rule may jump to any block after this one, plus any ending.
 *
 * Offering an earlier question would let an author build a loop the server
 * would then refuse; narrowing the choice means the dialog cannot offer a
 * target that closes one.
 */
export function targetsFor(questions: Question[], question: Question): Question[] {
  const position = questions.findIndex((q) => q.id === question.id);
  return questions.filter(
    (q, index) => q.id !== question.id && (index > position || q.type === "ending"),
  );
}

/** Rules as stored: the conditional ones in order, then the always rule last. */
function splitRules(rules: DraftRule[]) {
  return {
    conditional: rules.filter((rule) => rule.operator !== "always"),
    alwaysTarget:
      rules.find((rule) => rule.operator === "always")?.target_question_id ?? null,
  };
}

function joinRules(conditional: DraftRule[], alwaysTarget: number | null): DraftRule[] {
  if (alwaysTarget === null) return conditional;
  return [
    ...conditional,
    { operator: "always", value: null, target_question_id: alwaysTarget },
  ];
}

export function LogicModal(props: LogicModalProps) {
  // Mounted only while open, so the body's state can initialise from the
  // questions on every open — no effect has to copy them across.
  return (
    <Modal open={props.open} onClose={props.onClose} size="lg" label="Logic">
      <LogicBody {...props} />
    </Modal>
  );
}

function LogicBody({
  onClose,
  questions,
  initialQuestionId,
  onSave,
}: LogicModalProps) {
  const editable = questions.filter((q) => q.type !== "ending");

  const [drafts, setDrafts] = useState<Record<number, DraftRule[]>>(() =>
    Object.fromEntries(
      editable.map((question) => [
        question.id,
        question.rules.map((rule) => ({
          operator: rule.operator,
          value: rule.value,
          target_question_id: rule.target_question_id,
        })),
      ]),
    ),
  );
  const [activeId, setActiveId] = useState<number | null>(
    editable.some((q) => q.id === initialQuestionId)
      ? initialQuestionId
      : (editable[0]?.id ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = editable.find((q) => q.id === activeId) ?? null;

  const changes: RuleChange[] = editable
    .filter(
      (question) =>
        JSON.stringify(drafts[question.id] ?? []) !==
        JSON.stringify(
          question.rules.map((rule) => ({
            operator: rule.operator,
            value: rule.value,
            target_question_id: rule.target_question_id,
          })),
        ),
    )
    .map((question) => ({ questionId: question.id, rules: drafts[question.id] ?? [] }));

  const setDraft = (questionId: number, rules: DraftRule[]) =>
    setDrafts((previous) => ({ ...previous, [questionId]: rules }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(changes);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="bg-canvas px-6 pb-4 pt-5">
        <h2 className="text-[26px] font-normal text-ink">Logic</h2>
        <p className="mt-1 text-[14px] text-ink-muted">
          Set rules to control how respondents view or progress through your form.
        </p>
      </header>

      {/* A fixed height, not a max: collapsing a section must not make the
          dialog jump around under the pointer that just collapsed it. */}
      <div className="flex h-[56vh] gap-4 bg-canvas px-6 pb-5">
        <nav className="tf-scrollbar w-[220px] shrink-0 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {editable.map((question, index) => (
              <li key={question.id}>
                <RailChip
                  question={question}
                  badge={index + 1}
                  selected={question.id === activeId}
                  ruleCount={(drafts[question.id] ?? []).length}
                  onSelect={() => setActiveId(question.id)}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="tf-scrollbar flex-1 overflow-y-auto rounded-xl bg-panel p-5">
          {active ? (
            <QuestionLogic
              question={active}
              questions={questions}
              rules={drafts[active.id] ?? []}
              onChange={(rules) => setDraft(active.id, rules)}
            />
          ) : (
            <p className="text-[14px] text-ink-muted">
              Add a question and you can set rules on it here.
            </p>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line bg-canvas px-6 py-3.5">
        <button
          type="button"
          onClick={() => setDrafts(Object.fromEntries(editable.map((q) => [q.id, []])))}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] font-medium text-danger hover:bg-danger/8"
        >
          <Trash width={15} height={15} />
          Delete all rules
        </button>

        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="max-w-[380px] text-right text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={changes.length === 0 || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </footer>
    </>
  );
}

function RailChip({
  question,
  badge,
  selected,
  ruleCount,
  onSelect,
}: {
  question: Question;
  badge: number;
  selected: boolean;
  ruleCount: number;
  onSelect: () => void;
}) {
  const meta = BLOCKS[question.type];
  const TypeIcon = meta.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors",
        selected ? "bg-muted-strong" : "hover:bg-muted",
      )}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
        style={{ backgroundColor: meta.tint }}
        aria-hidden="true"
      >
        {badge}
      </span>
      <TypeIcon width={14} height={14} className="shrink-0 text-ink-faint" />
      <span className="flex-1 truncate text-[13px] text-ink">
        {question.title || meta.label}
      </span>
      {ruleCount > 0 && (
        <span
          className="shrink-0 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-ink"
          aria-label={`${ruleCount} rules`}
        >
          {ruleCount}
        </span>
      )}
    </button>
  );
}

function QuestionLogic({
  question,
  questions,
  rules,
  onChange,
}: {
  question: Question;
  questions: Question[];
  rules: DraftRule[];
  onChange: (rules: DraftRule[]) => void;
}) {
  const targets = targetsFor(questions, question);
  const { conditional, alwaysTarget } = splitRules(rules);
  const meta = BLOCKS[question.type];
  const TypeIcon = meta.icon;
  const badge = questions.findIndex((q) => q.id === question.id) + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white"
          style={{ backgroundColor: meta.tint }}
          aria-hidden="true"
        >
          {badge}
        </span>
        <TypeIcon width={16} height={16} className="shrink-0 text-ink-faint" />
        <span className="text-[16px] font-medium text-ink">
          {question.title || meta.label}
        </span>
      </div>

      <Section icon={Scissors} title="Question display">
        <AllOtherCases label="Show question" />
        <DisabledAction label="Add hide question rule" feature="Hide question rules" />
      </Section>

      <Section icon={Scissors} title="Hide answer choices">
        <AllOtherCases label="Show all answers" />
        <DisabledAction label="Add hide answer rule" feature="Hide answer choices" />
      </Section>

      <Section icon={Branch} title="Branching">
        {targets.length === 0 ? (
          <p className="text-[13px] text-ink-muted">
            Add another block after this one and you can branch to it from here.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] text-ink">Always go to</span>
              <div className="min-w-[240px] flex-1">
                <Dropdown
                  label="Always go to"
                  value={alwaysTarget === null ? "" : String(alwaysTarget)}
                  onChange={(value) =>
                    onChange(joinRules(conditional, value === "" ? null : Number(value)))
                  }
                  options={[
                    { value: "", label: "Select a question or ending" },
                    ...targets.map((target) => ({
                      value: String(target.id),
                      label: targetLabel(target),
                    })),
                  ]}
                  triggerClassName="w-full rounded-lg border border-line-strong bg-panel px-3 py-2 text-[14px] text-ink"
                />
              </div>
            </div>

            <BranchingRules
              question={question}
              targets={targets}
              rules={conditional}
              onChange={(next) => onChange(joinRules(next, alwaysTarget))}
            />
          </>
        )}
      </Section>

      <Section icon={Calculator} title="Calculations">
        <DisabledAction label="Add calculation" feature="Calculations and scoring" />
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: (props: { width: number; height: number; className?: string }) => React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-xl border border-line p-4">
      {/* The whole header toggles, not just the caret: a 16px hit target for
          something this easy to aim at would be needlessly fiddly. */}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <Icon width={16} height={16} className="shrink-0 text-ink-muted" />
        <h3 className="text-[15px] font-medium text-ink">{title}</h3>
        <Info width={14} height={14} className="shrink-0 text-ink-faint" />
        <span className="ml-auto shrink-0 text-ink-faint">
          {open ? (
            <CaretUp width={14} height={14} />
          ) : (
            <CaretDown width={14} height={14} />
          )}
        </span>
      </button>
      {open && <div className="mt-3 flex flex-col gap-3">{children}</div>}
    </section>
  );
}

/** The line the real product shows above each section's rule list. */
function AllOtherCases({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-[14px] text-ink-muted">
      All other cases:
      <Eye width={15} height={15} className="text-ink-faint" />
      <span className="text-ink">{label}</span>
    </p>
  );
}

function DisabledAction({ label, feature }: { label: string; feature: string }) {
  const comingSoon = useComingSoon();
  return (
    <button
      type="button"
      {...comingSoonProps(comingSoon, feature)}
      className="flex w-fit items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[14px] text-ink-faint"
    >
      <Plus width={15} height={15} />
      {label}
    </button>
  );
}
