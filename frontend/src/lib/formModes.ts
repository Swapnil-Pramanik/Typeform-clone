/**
 * The four form modes the real product offers.
 *
 * Named in one place because two controls show them — the toolbar's mode pill
 * and the Form settings dialog — and a list that disagreed with itself would be
 * worse than either. Only Universal is modelled here: the others describe
 * scoring and quiz behaviour this form engine does not have.
 */

export const UNIVERSAL = "universal";

export const FORM_MODES: { value: string; label: string; hint: string }[] = [
  { value: UNIVERSAL, label: "Universal", hint: "Create any type of form." },
  { value: "lead", label: "Lead qualification", hint: "Score and prioritise your leads." },
  { value: "quiz", label: "Knowledge quiz", hint: "Score answers and give feedback." },
  { value: "match", label: "Match quiz", hint: "Send people to different endings." },
];

export function modeLabel(value: string): string {
  return FORM_MODES.find((mode) => mode.value === value)?.label ?? "Universal";
}
