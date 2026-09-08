"use client";

/**
 * The form's own colours and type.
 *
 * Everything the flow draws reads its colour from a `--tf-*` variable, so a
 * theme is nothing more than a handful of those redeclared — which is why this
 * panel can change the whole respondent experience without any component
 * knowing a theme exists.
 */

import { Divider, Field } from "@/components/builder/PanelRow";
import {
  ACCENT_COLORS,
  BACKGROUNDS,
  DEFAULT_THEME,
  FONTS,
  TEXT_COLORS,
  derivedTextColor,
} from "@/lib/formTheme";
import { cn } from "@/lib/format";
import type { FormTheme } from "@/types";

interface DesignSettingsProps {
  theme: FormTheme | null;
  onPatch: (patch: Partial<FormTheme>) => void;
}

export function DesignSettings({ theme, onPatch }: DesignSettingsProps) {
  const current = { ...DEFAULT_THEME, ...(theme ?? {}) };

  return (
    <aside className="tf-scrollbar flex w-[300px] shrink-0 flex-col overflow-y-auto border-l-2 border-groove bg-panel">
      <Field label="Question colour">
        <Swatches
          values={ACCENT_COLORS}
          selected={current.color}
          onSelect={(color) => onPatch({ color })}
          label="Question colour"
        />
      </Field>

      <Field label="Background">
        <Swatches
          values={BACKGROUNDS}
          selected={current.background}
          onSelect={(background) => onPatch({ background })}
          label="Background"
        />
      </Field>

      <Field label="Text colour">
        <Swatches
          values={TEXT_COLORS}
          // Unset means "derived from the background", so show what that
          // derivation produced rather than an empty row with nothing selected.
          selected={current.text ?? derivedTextColor(current.background)}
          onSelect={(text) => onPatch({ text })}
          label="Text colour"
        />
      </Field>

      <Field label="Font">
        <div className="flex rounded-lg bg-muted p-0.5">
          {FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => onPatch({ font: font.id })}
              style={{ fontFamily: font.stack }}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                current.font === font.id
                  ? "bg-bg text-ink shadow-sm"
                  : "text-ink-muted",
              )}
            >
              {font.label}
            </button>
          ))}
        </div>
      </Field>

      <Divider />

      <div className="px-4 py-3">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Applies to the published form and to this preview — which is why the
          preview keeps its own colours whether the app is in light or dark mode.
          A dark form background inverts its text and answer cards with it, so
          the palette stays readable whichever colour you pick.
        </p>
      </div>
    </aside>
  );
}

function Swatches({
  values,
  selected,
  onSelect,
  label,
}: {
  values: readonly string[];
  selected?: string;
  onSelect: (value: string) => void;
  label: string;
}) {
  const custom = Boolean(selected) && !values.includes(selected as string);

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={selected === value}
          aria-label={`${label} ${value}`}
          onClick={() => onSelect(value)}
          style={{ backgroundColor: value }}
          className={cn(
            "h-8 w-8 rounded-full border border-line transition-transform",
            selected === value
              ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--tf-panel)]"
              : "hover:scale-110",
          )}
        />
      ))}

      {/*
        The whole spectrum, behind the presets rather than instead of them. The
        native colour input is the eyedropper, the wheel and the hex field all
        at once, and it is the one control here that a browser draws better than
        we would. It shows the chosen colour when that colour is not a preset,
        and a spectrum otherwise, so the row always says which one is live.
      */}
      <label
        title={`${label} — pick any colour`}
        className={cn(
          "relative h-8 w-8 cursor-pointer rounded-full border border-line transition-transform",
          custom
            ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--tf-panel)]"
            : "hover:scale-110",
        )}
        style={
          custom
            ? { backgroundColor: selected }
            : {
                backgroundImage:
                  "conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)",
              }
        }
      >
        <input
          type="color"
          value={selected ?? "#000000"}
          onChange={(event) => onSelect(event.target.value)}
          aria-label={`${label} — pick any colour`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
