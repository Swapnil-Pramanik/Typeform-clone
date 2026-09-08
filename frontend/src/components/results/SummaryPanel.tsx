"use client";

/**
 * Per-question aggregates, drawn.
 *
 * Every number here is computed by the database — choice counts by `GROUP BY`,
 * ratings by `AVG`/`MIN`/`MAX` and a second `GROUP BY` for the spread. Nothing
 * on this page is derived in the browser except percentages of numbers the
 * server already sent, which is what keeps it correct on page two and beyond.
 *
 * Each question is drawn the way its own type reads best: a scale as a
 * histogram, a yes/no as a donut, a choice list as ranked bars, open text as
 * the verbatims themselves. Colour comes from the block palette, so a card
 * matches the icon that question carries everywhere else in the app.
 */

import { Donut, Histogram, RankedBars, Ring } from "@/components/results/charts";
import { Star } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { BLOCKS } from "@/lib/questionTypes";
import type { FormSummaryStats, QuestionStats } from "@/types";

export function SummaryPanel({ summary }: { summary: FormSummaryStats }) {
  const partial = summary.total_responses - summary.completed_responses;

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat
          label="Responses"
          value={summary.total_responses}
          foot={
            summary.total_responses > 0 && (
              <SplitBar
                completed={summary.completed_responses}
                partial={partial}
              />
            )
          }
        />
        <BigStat
          label="Completed"
          value={summary.completed_responses}
          foot={
            <span className="text-[12px] text-ink-muted">
              finished every question they were asked
            </span>
          }
        />
        <BigStat
          label="Partial"
          value={partial}
          foot={
            <span className="text-[12px] text-ink-muted">
              left midway — still recorded
            </span>
          }
        />

        <div className="flex items-center gap-4 rounded-xl border border-line bg-panel px-5 py-4">
          <Ring value={summary.completion_rate} label="complete" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Completion rate
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">
              {summary.completed_responses} of {summary.total_responses} reached
              an ending.
            </p>
          </div>
        </div>
      </section>

      {/* Columns, not a grid: the cards are wildly different heights, and a grid
          leaves a tall card's neighbour trailing empty space beside it. */}
      <div className="gap-4 [column-fill:_balance] lg:columns-2 2xl:columns-3">
        {summary.questions.map((question) => (
          <QuestionCard key={question.question_id} question={question} />
        ))}
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  foot,
}: {
  label: string;
  value: number;
  foot?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-5 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-0.5 text-[34px] font-semibold leading-tight tabular-nums text-ink">
        {value}
      </p>
      {foot}
    </div>
  );
}

function SplitBar({ completed, partial }: { completed: number; partial: number }) {
  const total = completed + partial || 1;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted-strong">
        <div
          className="bg-brand"
          style={{ width: `${(completed / total) * 100}%` }}
        />
        <div
          className="bg-ink-faint/40"
          style={{ width: `${(partial / total) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-muted">
        {completed} completed · {partial} partial
      </p>
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionStats }) {
  const meta = BLOCKS[question.type];
  const Icon = meta.icon;

  return (
    <article className="mb-4 break-inside-avoid rounded-xl border border-line bg-panel p-5">
      <header className="mb-4 flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: meta.tint }}
          aria-hidden="true"
        >
          <Icon width={16} height={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium leading-snug text-ink">
            {question.title || meta.label}
          </h3>
          <p className="text-[12px] text-ink-faint">
            {question.answered} answer{question.answered === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <Body question={question} tint={meta.tint} />
    </article>
  );
}

function Body({ question, tint }: { question: QuestionStats; tint: string }) {
  if (question.answered === 0) {
    return <p className="text-[13px] text-ink-faint">No answers yet.</p>;
  }

  if (question.type === "yes_no" && question.choices) {
    return (
      <Donut
        slices={[
          { label: "Yes", count: question.choices[0]?.count ?? 0, color: tint },
          {
            label: "No",
            count: question.choices[1]?.count ?? 0,
            color: "var(--tf-ink-faint)",
          },
        ]}
      />
    );
  }

  if (question.choices) {
    return <RankedBars rows={question.choices} color={tint} />;
  }

  if (question.average !== null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <span className="text-[38px] font-semibold leading-none tabular-nums text-ink">
            {question.average.toFixed(1)}
          </span>
          {question.type === "rating" ? (
            <Stars value={question.average} tint={tint} />
          ) : (
            <span className="pb-1 text-[13px] text-ink-muted">average</span>
          )}
          <span className="ml-auto pb-1 text-[12px] text-ink-muted">
            {bound(question.minimum)}–{bound(question.maximum)}
          </span>
        </div>
        {question.distribution && question.distribution.length > 0 && (
          <Histogram buckets={question.distribution} color={tint} />
        )}
      </div>
    );
  }

  if (question.samples) {
    return (
      <ul className="flex flex-col gap-2">
        {question.samples.map((sample, index) => (
          <li
            key={`${index}-${sample.slice(0, 12)}`}
            className="rounded-lg border-l-2 bg-muted px-3 py-2 text-[13px] leading-snug text-ink"
            style={{ borderLeftColor: tint }}
          >
            {sample}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

/** The average, shown as the scale a respondent actually saw. */
function Stars({ value, tint }: { value: number; tint: string }) {
  return (
    <span className="flex items-center gap-0.5 pb-1.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          width={15}
          height={15}
          filled={step <= Math.round(value)}
          className={cn(step <= Math.round(value) ? "" : "text-line-strong")}
          style={step <= Math.round(value) ? { color: tint } : undefined}
        />
      ))}
    </span>
  );
}

function bound(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
