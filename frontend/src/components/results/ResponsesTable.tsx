"use client";

/**
 * The submissions table, shaped like the real product's.
 *
 * Columns come from the form's live questions, but every cell reads the
 * answer's own `display_value` snapshot — so a response collected before a
 * question was renamed still shows what was actually answered, under whichever
 * title the column happens to carry now.
 *
 * The two columns that are not questions are derived, not stored: the response
 * type comes from `is_complete`, and the ending from the form's current rules.
 */

import { Check, Clock, Funnel, Tag, TypeEnding } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { BLOCKS } from "@/lib/questionTypes";
import type { FormResponse, Question, ResponseSort } from "@/types";

interface ResponsesTableProps {
  responses: FormResponse[];
  questions: Question[];
  selected: Set<number>;
  onSelect: (ids: Set<number>) => void;
  sort: ResponseSort;
  onSort: (sort: ResponseSort) => void;
  onOpen: (response: FormResponse) => void;
}

/** Two lines, as the real table shows them: the date, then the time beneath. */
function stamp(iso: string): { date: string; time: string } {
  const at = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  return {
    date: at.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: at.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

export function ResponsesTable({
  responses,
  questions,
  selected,
  onSelect,
  sort,
  onSort,
  onOpen,
}: ResponsesTableProps) {
  const columns = questions.filter((question) => question.type !== "ending");
  const allSelected =
    responses.length > 0 && responses.every((row) => selected.has(row.id));

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelect(next);
  };

  return (
    <div className="tf-scrollbar overflow-x-auto rounded-xl border border-line bg-panel">
      <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line">
            <Th className="w-[52px] pl-4">
              <Checkbox
                checked={allSelected}
                label="Select all responses on this page"
                onChange={() =>
                  onSelect(
                    allSelected ? new Set() : new Set(responses.map((r) => r.id)),
                  )
                }
              />
            </Th>

            <Th className="w-[190px]">
              {/* The clock header is the sort control, as in the real table. */}
              <button
                type="button"
                onClick={() => onSort(sort === "newest" ? "oldest" : "newest")}
                title={sort === "newest" ? "Newest first" : "Oldest first"}
                className="flex items-center gap-2 rounded-lg border border-line-strong bg-bg px-2.5 py-1.5 text-[13px] text-ink hover:bg-muted"
              >
                <Clock width={14} height={14} className="text-ink-muted" />
                Responses
                <span aria-hidden="true" className="text-ink-faint">
                  {sort === "newest" ? "↓" : "↑"}
                </span>
              </button>
            </Th>

            <Th className="w-[170px]">
              <HeaderLabel icon={<Funnel width={14} height={14} />}>
                Response type
              </HeaderLabel>
            </Th>

            {columns.map((question) => {
              const Icon = BLOCKS[question.type].icon;
              return (
                <Th key={question.id} className="min-w-[200px]">
                  <HeaderLabel
                    icon={<Icon width={14} height={14} />}
                    title={question.title}
                  >
                    {question.title || BLOCKS[question.type].label}
                  </HeaderLabel>
                </Th>
              );
            })}

            <Th className="min-w-[200px]">
              <HeaderLabel icon={<TypeEnding width={14} height={14} />}>
                Ending
              </HeaderLabel>
            </Th>
            <Th className="min-w-[140px]">
              <HeaderLabel icon={<Tag width={14} height={14} />}>Tags</HeaderLabel>
            </Th>
          </tr>
        </thead>

        <tbody>
          {responses.map((response) => {
            const byQuestion = new Map(
              response.answers.map((answer) => [
                answer.question_id,
                answer.display_value,
              ]),
            );
            const when = stamp(response.submitted_at ?? response.started_at);
            const isSelected = selected.has(response.id);

            return (
              <tr
                key={response.id}
                onClick={() => onOpen(response)}
                className={cn(
                  "cursor-pointer border-b border-line last:border-0",
                  isSelected ? "bg-muted" : "hover:bg-muted",
                )}
              >
                <td
                  className="pl-4 align-middle"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    label={`Select response from ${when.date}`}
                    onChange={() => toggle(response.id)}
                  />
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-ink">{when.date}</div>
                  <div className="text-ink-muted">{when.time}</div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-[12px] font-medium",
                      response.is_complete
                        ? "border-success/30 bg-success/8 text-success"
                        : "border-line-strong bg-muted text-ink-muted",
                    )}
                  >
                    {response.is_complete ? "Completed" : "Partial"}
                  </span>
                </td>

                {columns.map((question) => (
                  <td key={question.id} className="px-4 py-3">
                    <Cell value={byQuestion.get(question.id)} />
                  </td>
                ))}

                <td className="px-4 py-3">
                  <Cell value={response.ending_title ?? undefined} />
                </td>
                <td className="px-4 py-3" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-4 py-2.5 font-normal", className)}>{children}</th>;
}

function HeaderLabel({
  icon,
  children,
  title,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-ink" title={title}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-ink-muted">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
}

/** An answered cell is a bordered chip; an unanswered one is simply empty. */
function Cell({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span
      title={value}
      className="inline-block max-w-[220px] truncate rounded-md border border-line-strong bg-bg px-2 py-1 text-[12px] text-ink"
    >
      {value}
    </span>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "flex h-[18px] w-[18px] items-center justify-center rounded border transition-colors",
        checked
          ? "border-accent bg-accent text-accent-ink"
          : "border-line-strong bg-bg hover:border-ink-faint",
      )}
    >
      {checked && <Check width={12} height={12} strokeWidth={3} />}
    </button>
  );
}
