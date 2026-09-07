"use client";

/**
 * The dashboard: workspace sidebar beside the form list.
 *
 * Built last on purpose — it is the lowest-weighted screen in the brief, and the
 * hours it would have taken first went into the respondent flow instead.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormTable } from "@/components/dashboard/FormTable";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Grid, List, Plus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { LoadingPane } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/format";
import { useFormActions, useForms } from "@/lib/queries";
import type { FormSummary } from "@/types";

const WORKSPACE_TABS = ["Forms", "Contacts", "Automations", "Insights"] as const;
type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

type SortKey = "updated" | "name" | "responses";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<WorkspaceTab>("Forms");
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<SortKey>("updated");
  const [pendingDelete, setPendingDelete] = useState<FormSummary | null>(null);

  const { data: forms, isLoading } = useForms(search || undefined);
  const actions = useFormActions();

  const sorted = useMemo(() => {
    const list = [...(forms ?? [])];
    if (sort === "name") return list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "responses")
      return list.sort((a, b) => b.response_count - a.response_count);
    return list;
  }, [forms, sort]);

  const responsesCollected =
    forms?.reduce((total, form) => total + form.response_count, 0) ?? 0;

  const create = async () => {
    const form = await actions.create.mutateAsync("Untitled form");
    router.push(`/forms/${form.id}/create`);
  };

  const copyLink = async (form: FormSummary) => {
    if (!form.slug) {
      toast.show("Publish the form first to get a link.", "error");
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
    toast.show("Link copied", "success");
  };

  const rename = async (form: FormSummary) => {
    const title = window.prompt("Rename form", form.title);
    if (!title || title === form.title) return;
    await actions.rename.mutateAsync({ id: form.id, title });
    toast.show("Renamed", "success");
  };

  const duplicate = async (form: FormSummary) => {
    const copy = await actions.duplicate.mutateAsync(form.id);
    toast.show(`Duplicated as “${copy.title}”`, "success");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await actions.remove.mutateAsync(pendingDelete.id);
    toast.show("Form deleted", "success");
    setPendingDelete(null);
  };

  return (
    <div className="flex h-dvh bg-bg">
      <Sidebar
        search={search}
        onSearch={setSearch}
        onCreate={() => void create()}
        creating={actions.create.isPending}
        responsesCollected={responsesCollected}
        formCount={forms?.length ?? 0}
      />

      <main className="tf-scrollbar flex-1 overflow-y-auto">
        <nav className="flex gap-1 border-b border-line px-6">
          {WORKSPACE_TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={cn(
                "-mb-px border-b-2 px-3 py-3 text-[13px] font-medium transition-colors",
                tab === name
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {name}
            </button>
          ))}
        </nav>

        {tab !== "Forms" ? (
          <div className="p-10">
            <ComingSoon
              title={tab}
              description={`${tab} is part of the real product's workspace nav. It is a placement in this build, not a feature.`}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-lg font-medium text-ink">My workspace</h1>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Sort forms"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[13px] text-ink"
                >
                  <option value="updated">Last updated</option>
                  <option value="name">Name</option>
                  <option value="responses">Responses</option>
                </select>

                <div className="flex rounded-lg bg-choice p-0.5">
                  {(
                    [
                      ["list", List],
                      ["grid", Grid],
                    ] as const
                  ).map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setLayout(name)}
                      aria-label={`${name} view`}
                      aria-pressed={layout === name}
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        layout === name ? "bg-bg text-ink shadow-sm" : "text-ink-muted",
                      )}
                    >
                      <Icon width={15} height={15} />
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {isLoading ? (
              <LoadingPane label="Loading your forms" />
            ) : sorted.length === 0 ? (
              <EmptyState
                title={search ? "No forms match that search" : "No forms yet"}
                description={
                  search
                    ? "Try a different name."
                    : "Create your first form and publish it to a shareable link."
                }
                action={
                  !search && (
                    <Button onClick={() => void create()}>
                      <Plus width={16} height={16} />
                      Create form
                    </Button>
                  )
                }
              />
            ) : (
              <FormTable
                forms={sorted}
                layout={layout}
                onCopyLink={(form) => void copyLink(form)}
                onRename={(form) => void rename(form)}
                onDuplicate={(form) => void duplicate(form)}
                onDelete={setPendingDelete}
              />
            )}
          </div>
        )}
      </main>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete form"
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-ink-muted">
            “{pendingDelete?.title}” and its {pendingDelete?.response_count ?? 0}{" "}
            response{pendingDelete?.response_count === 1 ? "" : "s"} will be deleted.
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              disabled={actions.remove.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
