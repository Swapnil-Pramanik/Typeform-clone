"use client";

/** The workspace sidebar: create button, search, workspace tree, responses meter. */

import { Button } from "@/components/ui/Button";
import { ChevronRight, Plus, Search } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { percent } from "@/lib/format";

const FREE_TIER_RESPONSE_LIMIT = 100;

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
  const used = Math.min(responsesCollected / FREE_TIER_RESPONSE_LIMIT, 1);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-4 border-r border-line bg-rail p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Typeform</span>
        <ThemeToggle />
      </div>

      <Button onClick={onCreate} disabled={creating} className="w-full">
        <Plus width={16} height={16} />
        {creating ? "Creating…" : "Create form"}
      </Button>

      <label className="flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5">
        <Search width={15} height={15} className="text-ink-faint" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search forms"
          aria-label="Search forms"
          className="w-full bg-transparent text-[13px] focus:outline-none"
        />
      </label>

      <nav className="flex flex-col gap-0.5">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          Workspaces
        </p>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-choice-selected px-2.5 py-2 text-left text-[13px] font-medium text-ink"
        >
          <ChevronRight width={14} height={14} className="text-ink-faint" />
          My workspace
          <span className="ml-auto text-[11px] text-ink-faint">{formCount}</span>
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-faint"
        >
          <Plus width={14} height={14} />
          New workspace
        </button>
      </nav>

      <div className="mt-auto rounded-xl border border-line bg-panel p-3">
        <p className="text-[11px] font-medium text-ink-muted">
          Responses collected
        </p>
        <p className="mt-0.5 text-[13px] font-medium text-ink">
          {responsesCollected} <span className="text-ink-faint">/ {FREE_TIER_RESPONSE_LIMIT}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-choice">
          <div className="h-full rounded-full bg-accent" style={{ width: percent(used) }} />
        </div>
      </div>
    </aside>
  );
}
