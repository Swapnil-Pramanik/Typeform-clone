"use client";

/**
 * The dashboard.
 *
 * Chrome is laid out the way the real product lays it out: a full-width account
 * bar, a full-width workspace nav beneath it, then the sidebar and workspace
 * pane side by side below both. The page itself only wires those pieces to the
 * form list; each one owns its own presentation.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyWorkspace } from "@/components/dashboard/EmptyWorkspace";
import { FormTable } from "@/components/dashboard/FormTable";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  WorkspaceHeader,
  type Layout,
  type SortKey,
} from "@/components/dashboard/WorkspaceHeader";
import {
  WorkspaceTabs,
  type WorkspaceTabName,
} from "@/components/dashboard/WorkspaceTabs";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { LoadingPane } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { useFormActions, useForms } from "@/lib/queries";
import type { FormSummary } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<WorkspaceTabName>("Forms");
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<Layout>("list");
  const [sort, setSort] = useState<SortKey>("updated");
  const [pendingDelete, setPendingDelete] = useState<FormSummary | null>(null);

  const {
    data: forms,
    isLoading,
    error,
    refetch,
  } = useForms(search || undefined);
  const actions = useFormActions();

  /**
   * Every action here talks to the API, so every one of them can fail — most
   * often because the backend simply is not running. Routing them through one
   * wrapper means a failure is always visible, never silence.
   */
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (failure) {
      toast.show(errorMessage(failure), "error");
    }
  };

  const sorted = useMemo(() => {
    const list = [...(forms ?? [])];
    if (sort === "name")
      return list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "responses")
      return list.sort((a, b) => b.response_count - a.response_count);
    if (sort === "created")
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  }, [forms, sort]);

  const responsesCollected =
    forms?.reduce((total, form) => total + form.response_count, 0) ?? 0;

  const create = () =>
    run(async () => {
      const form = await actions.create.mutateAsync("Untitled form");
      router.push(`/forms/${form.id}/create`);
    });

  const copyLink = (form: FormSummary) =>
    run(async () => {
      if (!form.slug) {
        toast.show("Publish the form first to get a link.", "error");
        return;
      }
      await navigator.clipboard.writeText(
        `${window.location.origin}/f/${form.slug}`,
      );
      toast.show("Link copied", "success");
    });

  const rename = (form: FormSummary) =>
    run(async () => {
      const title = window.prompt("Rename form", form.title);
      if (!title || title === form.title) return;
      await actions.rename.mutateAsync({ id: form.id, title });
      toast.show("Renamed", "success");
    });

  const duplicate = (form: FormSummary) =>
    run(async () => {
      const copy = await actions.duplicate.mutateAsync(form.id);
      toast.show(`Duplicated as “${copy.title}”`, "success");
    });

  const confirmDelete = () =>
    run(async () => {
      if (!pendingDelete) return;
      await actions.remove.mutateAsync(pendingDelete.id);
      toast.show("Form deleted", "success");
      setPendingDelete(null);
    });

  return (
    /*
     * The account bar sits directly on the page; everything below it lives in a
     * rounded shell inset evenly from the window edges, which is how the real
     * product frames the workspace. The shell clips its own corners, so the
     * sidebar and the tabs row can run edge to edge inside it.
     *
     * The radius is deliberately larger than the controls it contains (14px vs
     * the 8px on pills and buttons): a container rounded *less* than the things
     * inside it reads as a square box with chipped corners.
     */
    <div className="flex h-dvh flex-col bg-bg">
      <TopBar />

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-canvas">
        <WorkspaceTabs active={tab} onSelect={setTab} />

        <div className="flex min-h-0 flex-1">
          <Sidebar
            search={search}
            onSearch={setSearch}
            onCreate={() => void create()}
            creating={actions.create.isPending}
            responsesCollected={responsesCollected}
            formCount={forms?.length ?? 0}
          />

          <main className="tf-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto">
            {tab !== "Forms" ? (
              <div className="p-10">
                <ComingSoon
                  title={tab}
                  description={`${tab} is part of the real product's workspace nav. It is a placement in this build, not a feature.`}
                />
              </div>
            ) : (
              <>
                <WorkspaceHeader
                  title="My workspace"
                  sort={sort}
                  onSort={setSort}
                  layout={layout}
                  onLayout={setLayout}
                />

                {isLoading ? (
                  <LoadingPane label="Loading your forms" />
                ) : error ? (
                  <div className="p-6">
                    <EmptyState
                      title="Couldn’t load your forms"
                      description={errorMessage(error)}
                      action={
                        <Button
                          variant="secondary"
                          onClick={() => void refetch()}
                        >
                          Try again
                        </Button>
                      }
                    />
                  </div>
                ) : sorted.length === 0 && search ? (
                  <div className="p-6">
                    <EmptyState
                      title="No forms match that search"
                      description="Try a different name."
                    />
                  </div>
                ) : sorted.length === 0 ? (
                  <EmptyWorkspace onCreate={() => void create()} />
                ) : (
                  <div className="p-6">
                    <FormTable
                      forms={sorted}
                      layout={layout}
                      onCopyLink={(form) => void copyLink(form)}
                      onRename={(form) => void rename(form)}
                      onDuplicate={(form) => void duplicate(form)}
                      onDelete={setPendingDelete}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete form"
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-ink-muted">
            “{pendingDelete?.title}” and its{" "}
            {pendingDelete?.response_count ?? 0} response
            {pendingDelete?.response_count === 1 ? "" : "s"} will be deleted.
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
