"use client";

/**
 * The submissions table.
 *
 * Columns come from the form's live questions, but every cell is the answer's
 * own `display_value` snapshot — so a response collected before a question was
 * renamed still shows what was actually answered.
 */

import { absoluteTime } from "@/lib/format";
import type { FormResponse, Question } from "@/types";

interface ResponsesTableProps {
  responses: FormResponse[];
  questions: Question[];
  onOpen: (response: FormResponse) => void;
}

export function ResponsesTable({ responses, questions, onOpen }: ResponsesTableProps) {
  const columns = questions.filter((question) => question.type !== "ending");

  return (
    <div className="tf-scrollbar overflow-x-auto rounded-xl border border-line bg-panel">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
            <th className="px-4 py-2.5 font-semibold">Submitted</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            {columns.map((question) => (
              <th
                key={question.id}
                className="max-w-[220px] truncate px-4 py-2.5 font-semibold"
                title={question.title}
              >
                {question.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {responses.map((response) => {
            const byQuestion = new Map(
              response.answers.map((answer) => [answer.question_id, answer.display_value]),
            );
            return (
              <tr
                key={response.id}
                onClick={() => onOpen(response)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-choice"
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                  {response.submitted_at
                    ? absoluteTime(response.submitted_at)
                    : absoluteTime(response.started_at)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      response.is_complete
                        ? "rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
                        : "rounded-full bg-choice px-2 py-0.5 text-[11px] font-medium text-ink-muted"
                    }
                  >
                    {response.is_complete ? "Complete" : "Partial"}
                  </span>
                </td>
                {columns.map((question) => (
                  <td
                    key={question.id}
                    className="max-w-[240px] truncate px-4 py-2.5 text-ink"
                  >
                    {byQuestion.get(question.id) ?? "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
