"use client";

/**
 * The strip above the canvas: what you can add, and how you can look at it.
 *
 * Only the first two do anything here. The rest are the real product's
 * inspection tools — device preview, accessibility check, undo, translation,
 * form settings — kept in place so the toolbar reads as itself, and each says
 * so when pressed.
 */

import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import {
  Accessibility,
  Device,
  Palette,
  Play,
  Plus,
  Settings,
  Translate,
  Undo,
} from "@/components/ui/icons";
import { cn } from "@/lib/format";

interface BuilderToolbarProps {
  onAddContent: () => void;
  onOpenDesign: () => void;
  onOpenSettings: () => void;
  designActive: boolean;
}

export function BuilderToolbar({
  onAddContent,
  onOpenDesign,
  onOpenSettings,
  designActive,
}: BuilderToolbarProps) {
  const comingSoon = useComingSoon();

  const TOOLS = [
    { icon: Device, label: "Mobile preview" },
    { icon: Play, label: "Preview the form" },
    { icon: Accessibility, label: "Accessibility check" },
    { icon: Undo, label: "Undo and redo" },
    { icon: Translate, label: "Translations" },
  ];

  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <button
        type="button"
        onClick={onAddContent}
        className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        <Plus width={16} height={16} />
        Add content
      </button>

      <button
        type="button"
        onClick={onOpenDesign}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] transition-colors",
          designActive ? "bg-muted-strong text-ink" : "text-ink-muted hover:bg-muted hover:text-ink",
        )}
      >
        <Palette width={17} height={17} />
        Design
      </button>

      <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-line-strong" />

      {TOOLS.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          {...comingSoonProps(comingSoon, label)}
          className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        >
          <Icon width={17} height={17} />
        </button>
      ))}

      <button
        type="button"
        onClick={onOpenSettings}
        title="Form settings"
        aria-label="Form settings"
        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
      >
        <Settings width={17} height={17} />
      </button>
    </div>
  );
}
