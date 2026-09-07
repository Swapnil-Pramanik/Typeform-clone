"use client";

/**
 * The rule editor: *if the answer to this question matches, go there instead.*
 *
 * Rules are evaluated top to bottom and the first match wins, so the list order
 * is the precedence — no operator precedence to learn, and the reading order is
 * the execution order.
 */

import { Dropdown } from "@/components/ui/Dropdown";
import { Plus, Trash } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import type { Question, QuestionRule, RuleOperator } from "@/types";

export interface DraftRule {
  operator: RuleOperator;
  value: unknown;
  target_question_id: number;
}

interface LogicPanelProps {
  question: Question;
  /** Every block this rule could jump to — later questions and the endings. */
  targets: Question[];
  onChange: (rules: DraftRule[]) => void;
  error: string | null;
}

/** Which comparisons make sense for which answers. */
function operatorsFor(question: Question): { id: RuleOperator; label: string }[] {
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

const NEEDS_NO_VALUE = new Set<RuleOperator>(["answered", "not_answered"]);

export function LogicPanel({ question, targets, onChange, error }: LogicPanelProps) {
  const rules: DraftRule[] = question.rules.map((rule: QuestionRule) => ({
    operator: rule.operator,
    value: rule.value,
    target_question_id: rule.target_question_id,
  }));
  const operators = operatorsFor(question);

  const update = (index: number, patch: Partial<DraftRule>) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  const add = () => {
    const target = targets[0];
    if (!target) return;
    onChange([
      ...rules,
      { operator: operators[0].id, value: defaultValue(question), target_question_id: target.id },
    ]);
  };

  if (targets.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-ink-muted">
        Add another block after this one and you can branch to it from here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rules.length === 0 && (
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Everyone goes to the next block. Add a rule to send some people
          somewhere else.
        </p>
      )}

      {rules.map((rule, index) => (
        <div key={index} className="rounded-lg border border-line bg-bg p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {index === 0 ? "If" : "Else if"}
            </span>
            <button
              type="button"
              onClick={() => onChange(rules.filter((_, i) => i !== index))}
              aria-label={`Delete rule ${index + 1}`}
              className="rounded p-1 text-ink-faint hover:text-danger"
            >
              <Trash width={14} height={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Select
              label={`Rule ${index + 1} condition`}
              value={rule.operator}
              onChange={(operator) =>
                update(index, {
                  operator: operator as RuleOperator,
                  value: NEEDS_NO_VALUE.has(operator as RuleOperator)
                    ? null
                    : (rule.value ?? defaultValue(question)),
                })
              }
              options={operators.map((o) => ({ value: o.id, label: o.label }))}
            />

            {!NEEDS_NO_VALUE.has(rule.operator) && (
              <ValueField
                question={question}
                value={rule.value}
                onChange={(value) => update(index, { value })}
                label={`Rule ${index + 1} value`}
              />
            )}

            <span className="px-1 text-[11px] text-ink-faint">then jump to</span>

            <Select
              label={`Rule ${index + 1} target`}
              value={String(rule.target_question_id)}
              onChange={(id) => update(index, { target_question_id: Number(id) })}
              options={targets.map((target) => ({
                value: String(target.id),
                label: target.title || (target.type === "ending" ? "Ending" : "Untitled"),
              }))}
            />
          </div>
        </div>
      ))}

      {error && (
        <p role="alert" className="text-[12px] font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-ink-muted hover:bg-muted hover:text-ink"
      >
        <Plus width={14} height={14} />
        Add rule
      </button>
    </div>
  );
}

function defaultValue(question: Question): unknown {
  if (question.type === "yes_no") return true;
  if (question.type === "rating" || question.type === "number") return 1;
  if (question.options.length > 0) return question.options[0].id;
  return "";
}

const FIELD =
  "w-full rounded-lg border border-line-strong bg-bg px-2.5 py-1.5 text-[13px] text-ink";

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Dropdown
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      triggerClassName={cn(FIELD, "text-[13px]")}
    />
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
        className={FIELD}
      />
    );
  }

  return (
    <input
      aria-label={label}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder="exact text"
      className={FIELD}
    />
  );
}
