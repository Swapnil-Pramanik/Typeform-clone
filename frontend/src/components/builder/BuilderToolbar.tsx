"use client";

import { Fragment } from "react";

/**
 * The strip above the canvas: what you can add, and how you can look at it.
 *
 * Two containers, as the real product has them — the mode pill sits over the
 * block list and the tools over the canvas, so the strip lines up with the
 * columns beneath it rather than running as one bar across both.
 *
 * Add content, Design and Form settings do something. The rest are the real
 * product's inspection tools — device preview, preview, accessibility check,
 * undo, translation — kept in place so the toolbar reads as itself, and each
 * says so when pressed.
 */

import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  Accessibility,
  Device,
  Palette,
  Play,
  Plus,
  Layers,
  Settings,
  Translate,
  Undo,
} from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { FORM_MODES, UNIVERSAL, modeLabel } from "@/lib/formModes";

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

  // The divider after Play is the real toolbar's own grouping: how the form is
  // *viewed* on the left of it, what is *checked* on the right.
  const TOOLS: { icon: typeof Device; label: string; dividerBefore?: boolean }[] = [
    { icon: Device, label: "Mobile preview" },
    { icon: Play, label: "Preview the form" },
    { icon: Accessibility, label: "Accessibility check", dividerBefore: true },
    { icon: Undo, label: "Undo and redo" },
    { icon: Translate, label: "Translations" },
  ];

  return (
    <div className="flex items-center py-2.5 pr-3">
      {/* The block list's exact box — width, padding and border alike — so the
          pill lines up with the cards below it and the tools begin where the
          canvas does. */}
      <div className="w-[268px] shrink-0 border-r-2 border-transparent px-3">
        <Dropdown
          label="Form mode"
          value={UNIVERSAL}
          onChange={(mode) => {
            if (mode !== UNIVERSAL) comingSoon(modeLabel(mode));
          }}
          options={FORM_MODES.map((mode) => ({
            value: mode.value,
            label: `${mode.label} mode`,
            icon: <Layers width={15} height={15} />,
          }))}
          triggerClassName="w-full rounded-xl border-transparent bg-panel px-3 py-2 text-[14px] text-ink"
        />
      </div>

      <div className="flex flex-1 items-center gap-1.5 rounded-xl bg-panel px-2.5 py-1.5">
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

      {TOOLS.map(({ icon: Icon, label, dividerBefore }) => (
        <Fragment key={label}>
          {dividerBefore && (
            <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-line-strong" />
          )}
          <button
            type="button"
            {...comingSoonProps(comingSoon, label)}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
          >
            <Icon width={17} height={17} />
          </button>
        </Fragment>
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
    </div>
  );
}
