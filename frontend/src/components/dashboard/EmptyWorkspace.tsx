"use client";

/** What the workspace shows before the first form exists. */

import { NavForms, Plus } from "@/components/ui/icons";

export function EmptyWorkspace({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-info text-info-ink">
        <NavForms width={24} height={24} />
      </span>

      <p className="text-[22px] text-ink-strong">Create a new form to get started</p>

      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        <Plus width={16} height={16} />
        Create form
      </button>
    </div>
  );
}
