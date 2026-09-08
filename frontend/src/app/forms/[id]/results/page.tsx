"use client";

/**
 * Results: the four tabs the real product shows above a form's submissions.
 *
 * Two are built — Response summary and Responses — and two are the shape of
 * the product with nothing behind them, marked as such. The page itself only
 * holds the table's state; the querying lives in `lib/queries.ts`.
 */

import { use, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { FormShell } from "@/components/builder/FormShell";
import { ResponseDetail } from "@/components/results/ResponseDetail";
import { ResponsesTable } from "@/components/results/ResponsesTable";
import { ResultsToolbar } from "@/components/results/ResultsToolbar";
import { SummaryPanel } from "@/components/results/SummaryPanel";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Gem } from "@/components/ui/icons";
import { LoadingPane } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/format";
import { useDebouncedCallback } from "@/lib/hooks";
import { useFormQuery, useResponses, useSummary } from "@/lib/queries";
import type { FormResponse, ResponseSort } from "@/types";

type Tab = "insights" | "performance" | "summary" | "responses";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const formId = Number(use(params).id);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("responses");
  const [page, setPage] = useState(1);
  // Two values on purpose: `search` is what the box shows, `query` is what the
  // server is asked for. Without the debounce every keystroke was its own
  // request — seven letters fired fourteen, and they could land out of order.
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const runSearch = useDebouncedCallback<string>((value) => {
    setQuery(value);
    setPage(1);
  }, 300);
  const [sort, setSort] = useState<ResponseSort>("newest");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState<FormResponse | null>(null);

  const form = useFormQuery(formId);
  const responses = useResponses(formId, page, query, sort);
  const summary = useSummary(formId);

  const total = responses.data?.total ?? 0;
  const pageSize = responses.data?.page_size ?? 25;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const searching = query.trim().length > 0;

  const TABS: { id: Tab; label: string; gem?: boolean }[] = [
    { id: "insights", label: "Smart Insights", gem: true },
    { id: "performance", label: "Form performance" },
    { id: "summary", label: "Response summary" },
    { id: "responses", label: `Responses [${total}]` },
  ];

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      const { deleted } = await api.deleteResponses(formId, [...selected]);
      setSelected(new Set());
      // The summary counts the same rows, so it is stale too.
      await queryClient.invalidateQueries({ queryKey: ["responses", formId] });
      await queryClient.invalidateQueries({ queryKey: ["summary", formId] });
      toast.show(
        `${deleted} ${deleted === 1 ? "response" : "responses"} deleted`,
        "success",
      );
    } catch (failure) {
      toast.show(errorMessage(failure), "error");
    } finally {
      setDeleting(false);
    }
  };

  const loading = form.isLoading || responses.isLoading || summary.isLoading;

  return (
    <FormShell formId={formId}>
      {/* `min-w-0` so the pane can be narrower than the table it holds. A flex
          item defaults to `min-width: auto` and refuses to shrink below its
          content, which made the whole page scroll sideways and carried the
          toolbar's right-hand controls off the screen with it. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <nav className="flex shrink-0 items-center gap-6 border-b border-line bg-canvas px-6">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 py-3.5 text-[14px] transition-colors",
                tab === entry.id
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {entry.label}
              {entry.gem && (
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand">
                  <Gem width={11} height={11} strokeWidth={2} />
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="tf-scrollbar flex-1 overflow-y-auto bg-canvas p-6">
          {tab === "insights" && (
            <ComingSoon
              title="Smart Insights"
              description="AI summaries of what respondents are telling you, drawn from the open-text answers."
            />
          )}

          {tab === "performance" && (
            <ComingSoon
              title="Form performance"
              description="Views, starts, drop-off per question and time to complete. The completion rate this needs is already on the Response summary tab."
            />
          )}

          {tab === "summary" &&
            (loading ? (
              <LoadingPane label="Loading summary" />
            ) : summary.data ? (
              <SummaryPanel summary={summary.data} />
            ) : null)}

          {tab === "responses" && (
            <div className="flex flex-col gap-4">
              <ResultsToolbar
                search={search}
                onSearch={(value) => {
                  setSearch(value);
                  runSearch(value);
                }}
                csvUrl={api.csvUrl(formId)}
                canExport={total > 0}
                selectedCount={selected.size}
                onDeleteSelected={() => void deleteSelected()}
                deleting={deleting}
              />

              {loading ? (
                <LoadingPane label="Loading responses" />
              ) : total === 0 ? (
                <EmptyState
                  title={searching ? "No matching responses" : "No responses yet"}
                  description={
                    searching
                      ? "Nothing answered here contains that text. Try a shorter search."
                      : "Publish the form and share its link. Submissions appear here as they arrive, including partial ones."
                  }
                />
              ) : (
                <>
                  <ResponsesTable
                    responses={responses.data?.items ?? []}
                    questions={form.data?.questions ?? []}
                    selected={selected}
                    onSelect={setSelected}
                    sort={sort}
                    onSort={(next) => {
                      setSort(next);
                      setPage(1);
                    }}
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
              )}
            </div>
          )}
        </div>
      </div>

      <ResponseDetail response={open} onClose={() => setOpen(null)} />
    </FormShell>
  );
}
