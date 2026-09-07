"use client";

/** The workspace title row: name, actions, sort control and the List/Grid toggle. */

import {
  Calendar,
  ChevronDown,
  Dots,
  Gem,
  Grid,
  Invite,
  List,
} from "@/components/ui/icons";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/format";

export type SortKey = "updated" | "created" | "name" | "responses";
export type Layout = "list" | "grid";

const SORT_LABELS: Record<SortKey, string> = {
  updated: "Last updated",
  created: "Date created",
  name: "Name",
  responses: "Responses",
};

interface WorkspaceHeaderProps {
  title: string;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  layout: Layout;
  onLayout: (layout: Layout) => void;
}

export function WorkspaceHeader({
  title,
  sort,
  onSort,
  layout,
  onLayout,
}: WorkspaceHeaderProps) {
  const comingSoon = useComingSoon();

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
      <h1 className="text-[28px] font-normal text-ink-strong">{title}</h1>

      <button
        type="button"
        {...comingSoonProps(comingSoon, "Workspace actions")}
        className="rounded-lg p-1.5 text-ink-muted hover:bg-muted hover:text-ink"
      >
        <Dots width={17} height={17} />
      </button>

      <button
        type="button"
        {...comingSoonProps(comingSoon, "Inviting teammates")}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] text-ink-muted hover:bg-muted hover:text-ink"
      >
        <Invite width={17} height={17} />
        Invite
      </button>

      <button
        type="button"
        {...comingSoonProps(comingSoon, "Paid plan features")}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand"
      >
        <Gem width={14} height={14} strokeWidth={2} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Calendar
            width={15}
            height={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <select
            aria-label="Sort forms"
            value={sort}
            onChange={(event) => onSort(event.target.value as SortKey)}
            className="appearance-none rounded-lg border border-line bg-panel py-1.5 pl-8 pr-8 text-[14px] text-ink-muted"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <ChevronDown
            width={15}
            height={15}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        </div>

        <div className="flex overflow-hidden rounded-lg border border-line bg-panel">
          {(
            [
              ["list", List, "List"],
              ["grid", Grid, "Grid"],
            ] as const
          ).map(([name, Icon, label]) => (
            <button
              key={name}
              type="button"
              onClick={() => onLayout(name)}
              aria-pressed={layout === name}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[14px] transition-colors",
                layout === name
                  ? "bg-muted-strong text-ink-strong"
                  : "text-ink-muted hover:bg-muted",
              )}
            >
              <Icon width={16} height={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
