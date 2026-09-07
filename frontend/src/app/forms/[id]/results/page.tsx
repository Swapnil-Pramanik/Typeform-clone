"use client";

/** Responses and per-question summary for one form. */

import { use, useState } from "react";

import { FormShell } from "@/components/builder/FormShell";
import { ResponseDetail } from "@/components/results/ResponseDetail";
import { ResponsesTable } from "@/components/results/ResponsesTable";
import { SummaryPanel } from "@/components/results/SummaryPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Download } from "@/components/ui/icons";
import { LoadingPane } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import { useFormQuery, useResponses, useSummary } from "@/lib/queries";
import type { FormResponse } from "@/types";

const VIEWS = ["Responses", "Summary"] as const;

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const formId = Number(use(params).id);
  const [view, setView] = useState<(typeof VIEWS)[number]>("Responses");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<FormResponse | null>(null);

  const form = useFormQuery(formId);
  const responses = useResponses(formId, page);
  const summary = useSummary(formId);

  const loading = form.isLoading || responses.isLoading || summary.isLoading;
  const total = responses.data?.total ?? 0;
  const pageSize = responses.data?.page_size ?? 25;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <FormShell formId={formId}>
      <div className="tf-scrollbar flex-1 overflow-y-auto bg-canvas p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg bg-choice p-0.5">
              {VIEWS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setView(name)}
                  className={cn(
                    "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    view === name ? "bg-bg text-ink shadow-sm" : "text-ink-muted",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>

            <a href={api.csvUrl(formId)} download>
              <Button variant="secondary" size="sm" disabled={total === 0}>
                <Download width={15} height={15} />
                Export CSV
              </Button>
            </a>
          </header>

          {loading ? (
            <LoadingPane label="Loading responses" />
          ) : total === 0 ? (
            <EmptyState
              title="No responses yet"
              description="Publish the form and share its link. Submissions appear here as they arrive, including partial ones."
            />
          ) : view === "Responses" ? (
            <>
              <ResponsesTable
                responses={responses.data?.items ?? []}
                questions={form.data?.questions ?? []}
                onOpen={setOpen}
              />
              {pageCount > 1 && (
                <nav className="flex items-center justify-between text-[13px] text-ink-muted">
                  <span>
                    Page {page} of {pageCount} · {total} responses
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page === 1}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= pageCount}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              )}
            </>
          ) : (
            summary.data && <SummaryPanel summary={summary.data} />
          )}
        </div>
      </div>

      <ResponseDetail response={open} onClose={() => setOpen(null)} />
    </FormShell>
  );
}
