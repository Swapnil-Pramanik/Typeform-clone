"use client";

/**
 * The row above the responses table.
 *
 * Search, sort, the CSV download and the selection's Delete are real. The date
 * range, filters, spam, row height and column settings are the real product's
 * shape with nothing behind them here, so they say so when pressed rather than
 * sitting inert — see the Coming Soon note in the README.
 */

import { Button } from "@/components/ui/Button";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import {
  Calendar,
  Download,
  Funnel,
  Inbox,
  RowHeight,
  Search,
  Sliders,
  Trash,
  Warning,
} from "@/components/ui/icons";
import { cn } from "@/lib/format";

interface ResultsToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  csvUrl: string;
  canExport: boolean;
  selectedCount: number;
  onDeleteSelected: () => void;
  deleting: boolean;
}

export function ResultsToolbar({
  search,
  onSearch,
  csvUrl,
  canExport,
  selectedCount,
  onDeleteSelected,
  deleting,
}: ResultsToolbarProps) {
  const comingSoon = useComingSoon();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
        <span className="flex items-center gap-2 rounded-md bg-panel px-3 py-1.5 text-[13px] font-medium text-ink shadow-sm">
          <Inbox width={15} height={15} />
          Responses
        </span>
        <button
          type="button"
          {...comingSoonProps(comingSoon, "Spam filtering")}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-ink-muted"
        >
          <Warning width={15} height={15} />
          Spam [0]
        </button>
      </div>

      <label className="relative flex items-center">
        <Search
          width={15}
          height={15}
          className="pointer-events-none absolute left-3 text-ink-faint"
        />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search responses"
          aria-label="Search responses"
          className="w-[220px] rounded-lg border border-line-strong bg-bg py-1.5 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-faint"
        />
      </label>

      <ChipButton
        icon={<Calendar width={15} height={15} />}
        label="All time"
        {...comingSoonProps(comingSoon, "Filtering by date range")}
      />
      <ChipButton
        icon={<Funnel width={15} height={15} />}
        label="Filters"
        {...comingSoonProps(comingSoon, "Response filters")}
      />

      <div className="ml-auto flex items-center gap-1">
        {selectedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onDeleteSelected}
            disabled={deleting}
            className="mr-2 border-danger/30 text-danger hover:bg-danger/8"
          >
            <Trash width={14} height={14} />
            {deleting
              ? "Deleting…"
              : `Delete ${selectedCount} ${selectedCount === 1 ? "response" : "responses"}`}
          </Button>
        )}

        <IconButton
          icon={<RowHeight width={17} height={17} />}
          {...comingSoonProps(comingSoon, "Row height")}
        />
        <IconButton
          icon={<Sliders width={17} height={17} />}
          {...comingSoonProps(comingSoon, "Column settings")}
        />
        <a
          href={canExport ? csvUrl : undefined}
          download
          title="Download as CSV"
          aria-label="Download as CSV"
          aria-disabled={!canExport}
          className={cn(
            "rounded-lg p-2 text-ink-muted transition-colors",
            canExport
              ? "hover:bg-muted hover:text-ink"
              : "pointer-events-none opacity-40",
          )}
        >
          <Download width={17} height={17} />
        </a>

        <button
          type="button"
          {...comingSoonProps(comingSoon, "Generating a test response")}
          className="ml-1 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-muted"
        >
          Generate test response
        </button>
      </div>
    </div>
  );
}

function ChipButton({
  icon,
  label,
  ...props
}: {
  icon: React.ReactNode;
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex items-center gap-2 rounded-lg border border-line-strong bg-bg px-3 py-1.5 text-[13px] text-ink hover:bg-muted"
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  icon,
  ...props
}: { icon: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
    >
      {icon}
    </button>
  );
}
