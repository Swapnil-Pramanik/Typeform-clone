"use client";

/**
 * The form's own colours and type.
 *
 * Everything the flow draws reads its colour from a `--tf-*` variable, so a
 * theme is nothing more than a handful of those redeclared — which is why this
 * panel can change the whole respondent experience without any component
 * knowing a theme exists.
 */

import {
  ACCENT_COLORS,
  BACKGROUNDS,
  DEFAULT_THEME,
  FONTS,
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
      <Section title="Question colour">
        <Swatches
          values={ACCENT_COLORS}
          selected={current.color}
          onSelect={(color) => onPatch({ color })}
          label="Question colour"
        />
      </Section>

      <Section title="Background">
        <Swatches
          values={BACKGROUNDS}
          selected={current.background}
          onSelect={(background) => onPatch({ background })}
          label="Background"
        />
      </Section>

      <Section title="Font">
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
      </Section>

      <Section title="Applies to">
        <p className="text-[12px] leading-relaxed text-ink-muted">
          The published form and this preview. A dark background inverts the text
          and answer cards with it, so the palette stays readable whichever
          colour you pick.
        </p>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3.5">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      {children}
    </section>
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
    </div>
  );
}
