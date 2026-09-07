"use client";

/**
 * Per-question aggregates.
 *
 * Every number here is computed by the database — choice counts by GROUP BY,
 * ratings by AVG/MIN/MAX over the typed `number_value` column. The client only
 * draws bars.
 */

import { percent } from "@/lib/format";
import type { FormSummaryStats, QuestionStats } from "@/types";

export function SummaryPanel({ summary }: { summary: FormSummaryStats }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Responses" value={String(summary.total_responses)} />
        <Stat label="Completed" value={String(summary.completed_responses)} />
        <Stat
          label="Completion rate"
          value={percent(summary.completion_rate)}
          hint="Partial responses are recorded when someone leaves midway."
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {summary.questions.map((question) => (
          <QuestionCard key={question.question_id} question={question} />
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-1 text-2xl font-medium text-ink">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionStats }) {
  const total = question.choices?.reduce((sum, choice) => sum + choice.count, 0) ?? 0;

  return (
    <article className="rounded-xl border border-line bg-panel p-4">
      <header className="mb-3">
        <h3 className="text-sm font-medium text-ink">{question.title}</h3>
        <p className="text-[11px] text-ink-faint">
          {question.answered} answer{question.answered === 1 ? "" : "s"}
        </p>
      </header>

      {question.choices && (
        <ul className="flex flex-col gap-2">
          {question.choices.map((choice) => {
            const share = total ? choice.count / total : 0;
            return (
              <li key={choice.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="truncate text-ink">{choice.label}</span>
                  <span className="shrink-0 tabular-nums text-ink-muted">
                    {choice.count} · {percent(share)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(share * 100, choice.count ? 2 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {question.average !== null && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Average" value={question.average.toFixed(2)} />
          <Metric label="Lowest" value={formatBound(question.minimum)} />
          <Metric label="Highest" value={formatBound(question.maximum)} />
        </dl>
      )}

      {question.samples && (
        <ul className="flex flex-col gap-2">
          {question.samples.length === 0 && (
            <li className="text-[12px] text-ink-faint">No answers yet.</li>
          )}
          {question.samples.map((sample, index) => (
            <li
              key={`${index}-${sample.slice(0, 12)}`}
              className="rounded-lg bg-muted px-3 py-2 text-[12px] text-ink"
            >
              “{sample}”
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted py-2">
      <dt className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function formatBound(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
