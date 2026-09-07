"use client";

/**
 * One submission in full.
 *
 * Reads the per-answer snapshots rather than the current questions, which is
 * what makes it correct for responses collected before the form was edited.
 */

import { Modal } from "@/components/ui/Modal";
import { absoluteTime } from "@/lib/format";
import type { FormResponse } from "@/types";

interface ResponseDetailProps {
  response: FormResponse | null;
  onClose: () => void;
}

export function ResponseDetail({ response, onClose }: ResponseDetailProps) {
  return (
    <Modal
      open={Boolean(response)}
      onClose={onClose}
      title={response ? `Response #${response.id}` : undefined}
    >
      {response && (
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-[12px] text-ink-muted">
            {response.is_complete
              ? `Submitted ${absoluteTime(response.submitted_at ?? response.started_at)}`
              : `Started ${absoluteTime(response.started_at)} — never submitted`}
          </p>

          <dl className="flex flex-col gap-3">
            {response.answers.map((answer) => (
              <div key={answer.question_id} className="border-b border-line pb-3 last:border-0">
                <dt className="text-[12px] text-ink-muted">{answer.question_title}</dt>
                <dd className="mt-0.5 text-sm text-ink">{answer.display_value}</dd>
              </div>
            ))}
            {response.answers.length === 0 && (
              <p className="text-sm text-ink-muted">No answers were recorded.</p>
            )}
          </dl>
        </div>
      )}
    </Modal>
  );
}
