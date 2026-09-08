"use client";

/**
 * Version history: what changed, when, and a way back to any of it.
 *
 * The server writes an entry per editing *session* rather than per autosave —
 * see `services/versions.py` — so this list is short enough to read. Each entry
 * carries a sentence describing what that session changed; restoring applies
 * the whole snapshot, and is itself recorded, so a rollback can be rolled
 * forward again.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { History } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { absoluteTime, cn, relativeTime } from "@/lib/format";
import type { FormVersion } from "@/types";

const KIND_LABEL: Record<FormVersion["kind"], string> = {
  edit: "Edited",
  publish: "Published",
  unpublish: "Unpublished",
  restore: "Restored",
};

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  formId: number;
  onRestored: () => void;
}

export function HistoryPanel(props: HistoryPanelProps) {
  // Mounted only while open, so the list is fetched fresh each time rather
  // than going stale behind a closed dialog.
  return (
    <Modal open={props.open} onClose={props.onClose} title="Version history">
      {props.open && <HistoryBody {...props} />}
    </Modal>
  );
}

function HistoryBody({ formId, onClose, onRestored }: HistoryPanelProps) {
  const queryClient = useQueryClient();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const versions = useQuery({
    queryKey: ["versions", formId],
    queryFn: () => api.listVersions(formId),
  });

  const restore = async (version: FormVersion) => {
    setRestoring(version.id);
    setError(null);
    try {
      await api.restoreVersion(formId, version.id);
      await queryClient.invalidateQueries({ queryKey: ["form", formId] });
      await versions.refetch();
      onRestored();
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setRestoring(null);
    }
  };

  if (versions.isPending) {
    return (
      <div className="flex h-[220px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (versions.isError) {
    return (
      <p role="alert" className="px-5 py-6 text-[14px] text-danger">
        {errorMessage(versions.error)}
      </p>
    );
  }

  if (versions.data.length === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 px-5 text-center">
        <History width={22} height={22} className="text-ink-faint" />
        <p className="text-[14px] text-ink">No history yet.</p>
        <p className="text-[13px] text-ink-muted">
          Edits to this form will show up here, with what each one changed.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="max-h-[54vh] overflow-y-auto px-2 py-2">
        {versions.data.map((version) => (
          <li key={version.id}>
            <div
              className={cn(
                "group flex items-start gap-3 rounded-lg px-3 py-2.5",
                version.is_current ? "bg-muted" : "hover:bg-muted",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] text-ink">
                  <span className="font-medium">{KIND_LABEL[version.kind]}</span>
                  <span className="text-ink-faint" title={absoluteTime(version.created_at)}>
                    {relativeTime(version.created_at)}
                  </span>
                  {version.is_current && (
                    <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-accent-ink">
                      Current
                    </span>
                  )}
                </p>
                {/* A publish's summary is the word "Published", which the line
                    above already says. Two of those reads like a bug. */}
                {version.summary !== KIND_LABEL[version.kind] && (
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                    {version.summary}
                  </p>
                )}
              </div>

              {!version.is_current && (
                <button
                  type="button"
                  onClick={() => void restore(version)}
                  disabled={restoring !== null}
                  className={cn(
                    "shrink-0 rounded-lg border border-line px-2.5 py-1 text-[13px] text-ink",
                    "opacity-0 transition-opacity hover:bg-panel focus-visible:opacity-100",
                    "group-hover:opacity-100 disabled:opacity-40",
                  )}
                >
                  {restoring === version.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <p className="text-[12px] text-ink-muted">
          {error ? (
            <span role="alert" className="text-danger">
              {error}
            </span>
          ) : (
            "Restoring is recorded too, so it can be undone."
          )}
        </p>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </footer>
    </>
  );
}
