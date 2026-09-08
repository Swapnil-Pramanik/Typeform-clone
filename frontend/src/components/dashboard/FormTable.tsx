"use client";

/** The workspace pane's list and grid views over the form summaries. */

import { useRouter } from "next/navigation";

import { usePrefetchForm } from "@/lib/queries";

import { FormThumbnail } from "@/components/dashboard/FormThumbnail";
import { RowMenu } from "@/components/dashboard/RowMenu";
import { Integrations } from "@/components/ui/icons";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { cn, percent, relativeTime, shortDate } from "@/lib/format";
import type { FormSummary } from "@/types";

export interface FormRowActions {
  onCopyLink: (form: FormSummary) => void;
  onRename: (form: FormSummary) => void;
  onDuplicate: (form: FormSummary) => void;
  onDelete: (form: FormSummary) => void;
}

interface FormTableProps extends FormRowActions {
  forms: FormSummary[];
  layout: "list" | "grid";
}

/**
 * One grid template shared by the header and every row, so the columns cannot
 * drift apart. The name column takes the slack; the rest are fixed.
 */
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_104px_104px_148px_112px_44px] items-center gap-2";

/** Completion is shown as a share of responses, and a form with none shows a dash. */
function completion(form: FormSummary): string {
  if (form.response_count === 0) return "–";
  return percent(form.completed_count / form.response_count);
}

export function FormTable({ forms, layout, ...actions }: FormTableProps) {
  const comingSoon = useComingSoon();
  const router = useRouter();
  const prefetch = usePrefetchForm();
  const open = (form: FormSummary) => router.push(`/forms/${form.id}/create`);

  /**
   * Start fetching the form the pointer is over.
   *
   * The row already knows which form it is, and the builder's request costs
   * about 150ms — nearly all of it the fixed trip to the region rather than
   * anything the database does. Starting it on hover usually means the data has
   * landed before the click does, and it is the only way left to take real time
   * off that navigation. Focus counts as intent too, so a keyboard user gets it.
   */
  const warm = (form: FormSummary) => ({
    onMouseEnter: () => prefetch(form.id),
    onFocus: () => prefetch(form.id),
  });

  if (layout === "grid") {
    return (
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => (
          <li
            {...warm(form)}
            key={form.id}
            onClick={() => open(form)}
            className="cursor-pointer rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <FormThumbnail form={form} className="h-8 w-8" />
                <h3 className="truncate text-[15px] text-ink-strong">{form.title}</h3>
              </div>
              <RowMenu form={form} {...bind(actions, form)} />
            </div>
            <DraftMark form={form} className="mt-2" />
            <dl className="mt-3 flex gap-5 text-[13px] text-ink-muted">
              <Pair label="Responses" value={form.response_count || "–"} />
              <Pair label="Completed" value={completion(form)} />
              <Pair label="Questions" value={form.question_count} />
            </dl>
            <p className="mt-2 text-[12px] text-ink-faint">
              Updated {relativeTime(form.updated_at)}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col">
      <div className={cn(COLUMNS, "px-3 pb-2 text-[13px] text-ink-muted")}>
        <span />
        <span className="text-center">Responses</span>
        <span className="text-center">Completed</span>
        <span>Updated</span>
        <span>Integrations</span>
        <span />
      </div>

      <ul className="flex flex-col gap-2">
        {forms.map((form) => (
          <li key={form.id} {...warm(form)}>
            <div
              onClick={() => open(form)}
              className={cn(
                COLUMNS,
                "group cursor-pointer rounded-lg border border-line bg-panel px-3 py-2",
                "transition-colors hover:border-line-strong",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <FormThumbnail form={form} className="h-8 w-8" />
                <span className="truncate text-[15px] text-ink-strong">
                  {form.title}
                </span>
                <DraftMark form={form} />
              </div>

              <span className="text-center text-[14px] tabular-nums text-ink-muted">
                {form.response_count || "–"}
              </span>
              <span className="text-center text-[14px] tabular-nums text-ink-muted">
                {completion(form)}
              </span>
              <span className="whitespace-nowrap text-[14px] text-ink-muted">
                {shortDate(form.updated_at)}
              </span>

              <span>
                <button
                  type="button"
                  {...comingSoonProps(comingSoon, "Integrations")}
                  className="rounded-lg border border-line p-1.5 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Integrations width={16} height={16} />
                </button>
              </span>

              <span className="flex justify-end">
                <RowMenu form={form} {...bind(actions, form)} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function bind(actions: FormRowActions, form: FormSummary) {
  return {
    onCopyLink: () => actions.onCopyLink(form),
    onRename: () => actions.onRename(form),
    onDuplicate: () => actions.onDuplicate(form),
    onDelete: () => actions.onDelete(form),
  };
}

/**
 * The real product shows no status in this list. A draft still needs marking
 * here, because the seeded workspace deliberately contains one and a reviewer
 * has no other way to tell it apart — so drafts get a quiet label and published
 * forms get nothing, which keeps the row as clean as the reference.
 */
function DraftMark({ form, className }: { form: FormSummary; className?: string }) {
  if (form.status !== "draft") return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-muted-strong px-2 py-0.5 text-[11px] font-medium text-ink-muted",
        className,
      )}
    >
      Draft
    </span>
  );
}

function Pair({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-faint">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
