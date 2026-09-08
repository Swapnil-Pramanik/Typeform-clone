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

// Five presets each, so a row is five swatches plus the spectrum picker and
// still fits the panel's width on one line.
export const ACCENT_COLORS = [
  "#26262b",
  "#0b3d2e",
  "#1d4ed8",
  "#b91c1c",
  "#7c3aed",
] as const;

// The first and last are what `derivedTextColor` returns for a light and a dark
// background, so an untouched form shows a preset selected rather than reading
// as a custom colour nobody chose.
export const TEXT_COLORS = [
  "#4b424d",
  "#12161c",
  "#5b6472",
  "#0b3d2e",
  "#eceef2",
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
 * The complete light palette a form is drawn on, before its own theme applies.
 *
 * A form belongs to the person filling it in, not to the person who built it.
 * The creator's light/dark preference is a preference about *the app*, so the
 * respondent flow and the builder's preview declare a full surface of their own
 * rather than inheriting `data-theme` — otherwise switching the app to dark
 * would paint the creator's dark text onto the form's white background, and the
 * preview would stop showing what a respondent gets.
 */
const FORM_SURFACE: Record<string, string> = {
  "--tf-bg": "#ffffff",
  "--tf-panel": "#ffffff",
  "--tf-ink": "#4b424d",
  "--tf-ink-strong": "#3b333d",
  "--tf-ink-muted": "#645d67",
  "--tf-ink-faint": "#8c868e",
  "--tf-line": "#e9e8ea",
  "--tf-line-strong": "#dedcde",
  "--tf-muted": "#f0eff1",
  "--tf-muted-strong": "#eeedef",
  "--tf-accent": "#3b333d",
  "--tf-accent-ink": "#ffffff",
  "--tf-danger": "#d92d20",
  "--tf-focus": "#3d5afe",
  "--tf-choice-bg": "#f2f2ef",
  "--tf-choice-bg-hover": "#ebebe7",
  "--tf-choice-bg-selected": "#e2e2dc",
  "--tf-choice-key-bg": "#ffffff",
  "--font-form": FONTS[0].stack,
};

/**
 * The surface a form is drawn on: the base palette above, with the form's own
 * theme applied over it.
 *
 * A dark *form* background needs more than `--tf-bg` swapped — the text,
 * hairlines and answer cards all have to invert with it, or the form renders
 * black on black. Deriving those from the background's luminance keeps the
 * palette coherent whatever colour a creator picks.
 */
/** What the text colour would be if the creator has not chosen one. */
export function derivedTextColor(background?: string): string {
  return isDark(background || DEFAULT_THEME.background!)
    ? TEXT_COLORS[4]
    : TEXT_COLORS[0];
}

export function formSurface(theme: FormTheme | null | undefined): CSSProperties {
  const style: Record<string, string> = { ...FORM_SURFACE };
  if (!theme) return style as CSSProperties;

  const background = theme.background || DEFAULT_THEME.background!;
  const accent = theme.color || DEFAULT_THEME.color!;
  const font = FONTS.find((f) => f.id === theme.font) ?? FONTS[0];

  style["--tf-bg"] = background;
  style["--tf-accent"] = accent;
  style["--tf-accent-ink"] = isDark(accent) ? "#ffffff" : "#141416";
  style["--font-form"] = font.stack;

  if (isDark(background)) {
    style["--tf-panel"] = "#1c212a";
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
    style["--tf-muted"] = "#1c212a";
    style["--tf-muted-strong"] = "#242b35";
  }

  // An explicit text colour wins over whatever the background implied, and the
  // muted and faint steps are mixed toward the background rather than picked
  // separately — one choice, three tokens, and they cannot drift out of tune
  // with each other or become unreadable against the surface behind them.
  if (theme.text) {
    style["--tf-ink"] = theme.text;
    style["--tf-ink-strong"] = theme.text;
    style["--tf-ink-muted"] = `color-mix(in srgb, ${theme.text} 72%, ${background})`;
    style["--tf-ink-faint"] = `color-mix(in srgb, ${theme.text} 48%, ${background})`;
  }

  return style as CSSProperties;
}
