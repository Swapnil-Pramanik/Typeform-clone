"use client";

/**
 * The workspace sidebar.
 *
 * Laid out to match the real product: the Create form button, a borderless
 * search row, the Workspaces tree under a collapsible Private group, and — held
 * to the bottom — the response meter and the AI composer.
 */

import { useState } from "react";

import { CaretUp, Mic, Plus, Search, Send, Workspaces } from "@/components/ui/icons";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/format";
import { RESPONSE_LIMIT } from "@/lib/creator";

interface SidebarProps {
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  creating: boolean;
  responsesCollected: number;
  formCount: number;
}

export function Sidebar({
  search,
  onSearch,
  onCreate,
  creating,
  responsesCollected,
  formCount,
}: SidebarProps) {
  const comingSoon = useComingSoon();
  const [privateOpen, setPrivateOpen] = useState(true);
  const used = Math.min(responsesCollected / RESPONSE_LIMIT, 1);

  return (
    <aside className="tf-scrollbar flex w-[256px] shrink-0 flex-col overflow-y-auto border-r-2 border-groove bg-rail">
      <div className="p-3">
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[15px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus width={16} height={16} />
          {creating ? "Creating…" : "Create form"}
        </button>
      </div>

      <div className="border-y-2 border-groove px-4 py-3.5">
        <label className="flex items-center gap-2.5">
          <Search width={18} height={18} className="shrink-0 text-ink-muted" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search forms"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pt-5">
        <div className="flex items-center justify-between pb-1">
          <span className="flex items-center gap-2.5 text-[15px] text-ink">
            <Workspaces width={18} height={18} className="text-ink-muted" />
            Workspaces
          </span>
          <button
            type="button"
            {...comingSoonProps(comingSoon, "Multiple workspaces")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-ink-muted hover:text-ink"
          >
            <Plus width={15} height={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPrivateOpen((open) => !open)}
          aria-expanded={privateOpen}
          className="mt-1 flex items-center justify-between rounded-lg px-1 py-2 text-[15px] text-ink-muted hover:text-ink"
        >
          Private
          <CaretUp
            width={14}
            height={14}
            className={cn("transition-transform", !privateOpen && "rotate-180")}
          />
        </button>

        {privateOpen && (
          <button
            type="button"
            aria-current="page"
            className="flex items-center justify-between rounded-lg bg-muted-strong px-3 py-2.5 text-left text-[15px] text-ink-strong"
          >
            My workspace
            <span className="text-[14px] text-ink-muted">{formCount}</span>
          </button>
        )}
      </div>

      <div className="mt-auto">
        <div className="border-t-2 border-groove px-4 py-4">
          <p className="text-[15px] text-ink">Responses collected</p>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-line-strong">
            <div
              className="h-full rounded-full bg-ink-strong"
              style={{ width: `${used * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] text-ink-muted">
            <span className="text-[17px] font-medium text-ink-strong">
              {responsesCollected}
            </span>{" "}
            / {RESPONSE_LIMIT}
          </p>
          <button
            type="button"
            {...comingSoonProps(comingSoon, "Raising the response limit")}
            className="mt-3 rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px] text-ink-muted hover:text-ink"
          >
            Increase response limit
          </button>
        </div>

        <div className="border-t-2 border-groove p-3">
          <div className="rounded-xl p-[3px] ring-1 ring-ai-ring-soft">
            <div className="flex items-center gap-2 rounded-lg border border-ai-ring bg-panel px-3 py-2">
              <Mic width={17} height={17} className="shrink-0 text-ink-muted" />
              <span aria-hidden="true" className="h-4 w-px bg-line" />
              <button
                type="button"
                {...comingSoonProps(comingSoon, "Typeform AI")}
                className="flex-1 bg-transparent text-left text-[15px] text-ink-muted"
              >
                Ask Typeform AI
              </button>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-ink-faint">
                <Send width={15} height={15} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
