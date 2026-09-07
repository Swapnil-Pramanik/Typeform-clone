"use client";

import type { ReactNode } from "react";

/** A top-bar action that exists in the real product but not in this build. */
export function ComingSoonButton({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title="Coming soon"
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[14px] text-ink-muted hover:bg-muted hover:text-ink"
    >
      {icon}
      <span className="hidden lg:inline">{children}</span>
    </button>
  );
}
