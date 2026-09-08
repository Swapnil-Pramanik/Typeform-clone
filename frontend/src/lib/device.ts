/**
 * The screens the builder previews in, in CSS pixels.
 *
 * Real device sizes, not "whatever fits the pane". The canvas renders at these
 * dimensions and scales the result down, so the shared renderer's breakpoints
 * see a genuine 1440px desktop — a card merely sized to the pane is around a
 * thousand pixels wide, and the layout rules written for a desktop viewport
 * then eat the whole frame.
 */

export const DESKTOP = { width: 1440, height: 900 } as const;
export const PHONE = { width: 390, height: 760 } as const;

export const FRAMES = { desktop: DESKTOP, mobile: PHONE } as const;
