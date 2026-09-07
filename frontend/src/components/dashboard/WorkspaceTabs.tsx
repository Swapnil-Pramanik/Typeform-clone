"use client";

/**
 * The workspace nav: Forms · Contacts · Automations · Insights, then a rule and
 * the Research Flow demo entry.
 *
 * The active tab carries both a filled pill and a short underline sitting on the
 * row's bottom border, which is how the real product marks it.
 */

import { Gem, NavAutomations, NavContacts, NavForms, NavInsights, NavResearch } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export const WORKSPACE_TABS = [
  { name: "Forms", icon: NavForms, available: true },
  { name: "Contacts", icon: NavContacts, available: false },
  { name: "Automations", icon: NavAutomations, available: false },
  { name: "Insights", icon: NavInsights, available: false, gem: true },
] as const;

export type WorkspaceTabName = (typeof WORKSPACE_TABS)[number]["name"];

interface WorkspaceTabsProps {
  active: WorkspaceTabName;
  onSelect: (tab: WorkspaceTabName) => void;
}

export function WorkspaceTabs({ active, onSelect }: WorkspaceTabsProps) {
  return (
    <nav className="flex h-14 shrink-0 items-center gap-1 border-b-2 border-groove bg-canvas px-4">
      {WORKSPACE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.name === active;
        return (
          <div key={tab.name} className="relative flex h-full items-center">
            <button
              type="button"
              onClick={() => onSelect(tab.name)}
              title={tab.available ? undefined : "Coming soon"}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                isActive
                  ? "bg-muted-strong text-ink-strong"
                  : "text-ink-muted hover:bg-muted hover:text-ink",
              )}
            >
              <Icon width={18} height={18} />
              {tab.name}
            </button>

            {"gem" in tab && tab.gem && (
              <span
                title="Available on paid plans"
                className="ml-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand"
              >
                <Gem width={13} height={13} strokeWidth={2} />
              </span>
            )}

            {isActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-ink-strong"
              />
            )}
          </div>
        );
      })}

      <span aria-hidden="true" className="mx-3 h-6 w-px bg-line-strong" />

      <button
        type="button"
        title="Coming soon"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium text-ink-muted hover:bg-muted hover:text-ink"
      >
        <NavResearch width={18} height={18} />
        Research Flow
        <span className="rounded-full border border-info-line bg-panel px-2.5 py-0.5 text-[12px] font-medium text-info-ink">
          Demo
        </span>
      </button>
    </nav>
  );
}
