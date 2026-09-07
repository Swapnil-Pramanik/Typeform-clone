"use client";

/** The workspace title row: name, actions, sort control and the List/Grid toggle. */

import { Dropdown } from "@/components/ui/Dropdown";
import {
  Calendar,
  Dots,
  Gem,
  Grid,
  Invite,
  List,
  Pencil,
  SortAlpha,
} from "@/components/ui/icons";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { cn } from "@/lib/format";

export type SortKey = "created" | "updated" | "alphabetical";
export type Layout = "list" | "grid";

const SORTS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: "created", label: "Date created", icon: <Calendar width={16} height={16} /> },
  { value: "updated", label: "Last updated", icon: <Pencil width={16} height={16} /> },
  { value: "alphabetical", label: "Alphabetical", icon: <SortAlpha width={16} height={16} /> },
];

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
        <Dropdown
          label="Sort forms"
          value={sort}
          onChange={onSort}
          options={SORTS}
          leadingIcon={
            SORTS.find((option) => option.value === sort)?.icon ?? (
              <Calendar width={16} height={16} />
            )
          }
        />

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
