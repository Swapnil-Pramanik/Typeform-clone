/**
 * A form's own colours, expressed as overrides of the app's design tokens.
 *
 * Because every component reads its colours from `--tf-*` variables and none
 * name a raw colour, a per-form theme is just those variables redeclared on a
 * wrapper element. The respondent flow and the builder's preview apply the same
 * object, so what a creator picks is exactly what a respondent sees.
 */

import type { CSSProperties } from "react";

import type { FormTheme } from "@/types";

export const ACCENT_COLORS = [
  "#26262b",
  "#0b3d2e",
  "#1d4ed8",
  "#b91c1c",
  "#7c3aed",
  "#b45309",
] as const;

export const BACKGROUNDS = [
  "#ffffff",
  "#f6f5f1",
  "#eef2ff",
  "#12161c",
] as const;

export const FONTS = [
  { id: "inter", label: "Sans", stack: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", label: "Serif", stack: "ui-serif, Georgia, Cambria, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", stack: "ui-monospace, SFMono-Regular, Menlo, monospace" },
] as const;

export const DEFAULT_THEME: FormTheme = {
  color: ACCENT_COLORS[0],
  background: BACKGROUNDS[0],
  font: FONTS[0].id,
};

/** Perceived lightness, 0–1. Used only to decide light-on-dark or dark-on-light. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const channel = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const isDark = (hex: string) => luminance(hex) < 0.45;

/**
 * Token overrides for one form.
 *
 * A dark background needs more than `--tf-bg` swapped: the text, hairlines and
 * choice cards all have to invert with it, or the form renders as black on
 * black. Deriving those from the background's luminance keeps the palette
 * coherent whatever colour a creator picks.
 */
export function themeStyle(theme: FormTheme | null | undefined): CSSProperties {
  if (!theme) return {};
  const style: Record<string, string> = {};

  const background = theme.background || DEFAULT_THEME.background!;
  const accent = theme.color || DEFAULT_THEME.color!;
  const font = FONTS.find((f) => f.id === theme.font) ?? FONTS[0];

  style["--tf-bg"] = background;
  style["--tf-accent"] = accent;
  style["--tf-accent-ink"] = isDark(accent) ? "#ffffff" : "#141416";
  style["--font-form"] = font.stack;

  if (isDark(background)) {
    style["--tf-ink"] = "#eceef2";
    style["--tf-ink-strong"] = "#ffffff";
    style["--tf-ink-muted"] = "#a2a8b4";
    style["--tf-ink-faint"] = "#6d7481";
    style["--tf-line"] = "#2a2f38";
    style["--tf-line-strong"] = "#3a414c";
    style["--tf-choice-bg"] = "#1c212a";
    style["--tf-choice-bg-hover"] = "#232935";
    style["--tf-choice-bg-selected"] = "#2c3340";
    style["--tf-choice-key-bg"] = "#12161c";
    style["--tf-panel"] = "#1c212a";
  }

  return style as CSSProperties;
}
