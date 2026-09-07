"use client";

/** The workspace pane's list and grid views over the form summaries. */

import Link from "next/link";
import { useRouter } from "next/navigation";

import { RowMenu } from "@/components/dashboard/RowMenu";
import { cn, relativeTime } from "@/lib/format";
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

export function FormTable({ forms, layout, ...actions }: FormTableProps) {
  const router = useRouter();
  const open = (form: FormSummary) => router.push(`/forms/${form.id}/create`);

  if (layout === "grid") {
    return (
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => (
          <li
            key={form.id}
            onClick={() => open(form)}
            className="cursor-pointer rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-medium text-ink">{form.title}</h3>
              <RowMenu form={form} {...bind(actions, form)} />
            </div>
            <StatusPill status={form.status} />
            <dl className="mt-3 flex gap-4 text-[12px] text-ink-muted">
              <Pair label="Responses" value={form.response_count} />
              <Pair label="Completed" value={form.completed_count} />
              <Pair label="Questions" value={form.question_count} />
            </dl>
            <p className="mt-2 text-[11px] text-ink-faint">
              Updated {relativeTime(form.updated_at)}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="tf-scrollbar overflow-x-auto rounded-xl border border-line bg-panel">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
            <th className="px-4 py-2.5 font-semibold">Name</th>
            <th className="px-4 py-2.5 font-semibold">Responses</th>
            <th className="px-4 py-2.5 font-semibold">Completed</th>
            <th className="px-4 py-2.5 font-semibold">Updated</th>
            <th className="px-4 py-2.5 font-semibold">Integrations</th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {forms.map((form) => (
            <tr
              key={form.id}
              onClick={() => open(form)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-muted"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/forms/${form.id}/create`}
                    onClick={(event) => event.stopPropagation()}
                    className="truncate font-medium text-ink hover:underline"
                  >
                    {form.title}
                  </Link>
                  <StatusPill status={form.status} />
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums text-ink-muted">
                {form.response_count}
              </td>
              <td className="px-4 py-3 tabular-nums text-ink-muted">
                {form.completed_count}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                {relativeTime(form.updated_at)}
              </td>
              <td className="px-4 py-3 text-ink-faint">—</td>
              <td className="px-4 py-3">
                <RowMenu form={form} {...bind(actions, form)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function StatusPill({ status }: { status: FormSummary["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        status === "published"
          ? "bg-success/10 text-success"
          : "bg-muted text-ink-muted",
      )}
    >
      {status}
    </span>
  );
}

function Pair({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
