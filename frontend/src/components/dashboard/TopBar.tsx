"use client";

/**
 * The account bar that spans the top of every workspace screen.
 *
 * Integrations, Brand kit and View plans are chrome from the real product with
 * nothing behind them in this build, so they carry the shared Coming Soon
 * treatment rather than being dropped from the layout.
 */

import { ComingSoonButton } from "@/components/dashboard/ComingSoonButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BrandKit, ChevronDown, Help, Integrations } from "@/components/ui/icons";
import { CREATOR } from "@/lib/creator";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <button
        type="button"
        title="Coming soon"
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-[15px] text-ink hover:bg-muted"
      >
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-avatar-green text-[13px] font-semibold text-white">
          {CREATOR.workspaceInitial}
        </span>
        {CREATOR.handle}
        <ChevronDown width={16} height={16} className="text-ink-muted" />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <ComingSoonButton icon={<Integrations width={17} height={17} />}>
          Integrations
        </ComingSoonButton>
        <ComingSoonButton icon={<BrandKit width={17} height={17} />}>
          Brand kit
        </ComingSoonButton>

        <button
          type="button"
          title="Coming soon"
          className="ml-1 rounded-lg bg-brand px-3.5 py-2 text-[14px] font-medium text-brand-ink transition-opacity hover:opacity-90"
        >
          View plans
        </button>

        <ThemeToggle />

        <button
          type="button"
          title="Coming soon"
          aria-label="Help"
          className="rounded-lg p-1.5 text-ink-muted hover:bg-muted hover:text-ink"
        >
          <Help width={18} height={18} />
        </button>

        <span
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-avatar-tan text-[12px] font-semibold text-ink-strong"
          title={CREATOR.handle}
        >
          {CREATOR.initials}
        </span>
      </div>
    </header>
  );
}
