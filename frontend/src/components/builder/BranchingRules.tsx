"use client";

/**
 * The conditional half of the Logic dialog: *if the answer matches, go there.*
 *
 * Rules are evaluated top to bottom and the first match wins, so the list order
 * is the precedence — no operator precedence to learn, and the reading order is
 * the execution order. The "Always go to" fallback is not in this list; it is
 * stored after it, and `LogicModal` owns it.
 */

import { Dropdown } from "@/components/ui/Dropdown";
import { Plus, Trash } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import type { Question, RuleOperator } from "@/types";

export interface DraftRule {
  operator: RuleOperator;
  value: unknown;
  target_question_id: number;
}

/** Which comparisons make sense for which answers. */
export function operatorsFor(question: Question): { id: RuleOperator; label: string }[] {
  const always: { id: RuleOperator; label: string }[] = [
    { id: "answered", label: "is answered" },
    { id: "not_answered", label: "is not answered" },
  ];
  if (question.type === "number" || question.type === "rating") {
    return [
      { id: "is", label: "is" },
      { id: "is_not", label: "is not" },
      { id: "greater_than", label: "is more than" },
      { id: "less_than", label: "is less than" },
      ...always,
    ];
  }
  return [{ id: "is", label: "is" }, { id: "is_not", label: "is not" }, ...always];
}

export const NEEDS_NO_VALUE = new Set<RuleOperator>([
  "answered",
  "not_answered",
  "always",
]);

export function defaultValue(question: Question): unknown {
  if (question.type === "yes_no") return true;
  if (question.type === "rating" || question.type === "number") return 1;
  if (question.options.length > 0) return question.options[0].id;
  return "";
}

export function targetLabel(target: Question): string {
  if (target.title) return target.title;
  return target.type === "ending" ? "Ending" : "Untitled question";
}

interface BranchingRulesProps {
  question: Question;
  /** Every block this rule could jump to — later questions and the endings. */
  targets: Question[];
  rules: DraftRule[];
  onChange: (rules: DraftRule[]) => void;
}

export function BranchingRules({
  question,
  targets,
  rules,
  onChange,
}: BranchingRulesProps) {
  const operators = operatorsFor(question);

  const update = (index: number, patch: Partial<DraftRule>) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  const add = () =>
    onChange([
      ...rules,
      {
        operator: operators[0].id,
        value: defaultValue(question),
        target_question_id: targets[0].id,
      },
    ]);

  return (
    <div className="flex flex-col gap-2.5">
      {rules.map((rule, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2.5"
        >
          <span className="w-12 shrink-0 text-[13px] text-ink-muted">
            {index === 0 ? "If" : "Else if"}
          </span>

          <Select
            label={`Rule ${index + 1} condition`}
            value={rule.operator}
            onChange={(next) =>
              update(index, {
                operator: next as RuleOperator,
                value: NEEDS_NO_VALUE.has(next as RuleOperator)
                  ? null
                  : (rule.value ?? defaultValue(question)),
              })
            }
            options={operators.map((o) => ({ value: o.id, label: o.label }))}
            className="min-w-[130px] flex-1"
          />

          {!NEEDS_NO_VALUE.has(rule.operator) && (
            <ValueField
              question={question}
              value={rule.value}
              onChange={(value) => update(index, { value })}
              label={`Rule ${index + 1} value`}
            />
          )}

          {/* Kept together so the phrase wraps as one, not with "then go to"
              orphaned at the end of the line above its own dropdown. */}
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <span className="shrink-0 text-[13px] text-ink-muted">then go to</span>
            <Select
              label={`Rule ${index + 1} target`}
              value={String(rule.target_question_id)}
              onChange={(id) => update(index, { target_question_id: Number(id) })}
              options={targets.map((target) => ({
                value: String(target.id),
                label: targetLabel(target),
              }))}
              className="min-w-0 flex-1"
            />
          </div>

          <button
            type="button"
            onClick={() => onChange(rules.filter((_, i) => i !== index))}
            aria-label={`Delete rule ${index + 1}`}
            className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-muted hover:text-danger"
          >
            <Trash width={15} height={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className={cn(
          "flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-2",
          "text-[14px] text-ink transition-colors hover:bg-muted",
        )}
      >
        <Plus width={15} height={15} />
        Add branching rule
      </button>
    </div>
  );
}

const FIELD =
  "w-full rounded-lg border border-line-strong bg-panel px-2.5 py-1.5 text-[13px] text-ink";

function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Dropdown
        label={label}
        value={value}
        onChange={onChange}
        options={options}
        triggerClassName={FIELD}
      />
    </div>
  );
}

/** The comparison value, shaped by what the question can actually answer. */
function ValueField({
  question,
  value,
  onChange,
  label,
}: {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
}) {
  if (question.type === "yes_no") {
    return (
      <Select
        label={label}
        value={String(Boolean(value))}
        onChange={(next) => onChange(next === "true")}
        options={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        className="min-w-[110px] flex-1"
      />
    );
  }

  if (question.options.length > 0) {
    return (
      <Select
        label={label}
        value={String(value ?? question.options[0].id)}
        onChange={(next) => onChange(Number(next))}
        options={question.options.map((option) => ({
          value: String(option.id),
          label: option.label,
        }))}
        className="min-w-[130px] flex-1"
      />
    );
  }

  if (question.type === "number" || question.type === "rating") {
    return (
      <input
        type="number"
        aria-label={label}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(FIELD, "min-w-[90px] flex-1")}
      />
    );
  }

  return (
    <input
      aria-label={label}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder="exact text"
      className={cn(FIELD, "min-w-[130px] flex-1")}
    />
  );
}
