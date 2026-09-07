import { cn } from "@/lib/format";
import type { FormSummary } from "@/types";

/** Typeform's default form colour, used when a form has no theme of its own. */
const DEFAULT_COLOR = "#759675";

/**
 * The little square at the head of a dashboard row.
 *
 * The real product renders a miniature of the form's first screen here. A solid
 * block of the form's own theme colour is the honest reduction: it still tells
 * two forms apart at a glance without pretending to be a live preview.
 */
export function FormThumbnail({
  form,
  className,
}: {
  form: FormSummary;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 rounded-lg", className)}
      style={{ backgroundColor: form.theme?.color || DEFAULT_COLOR }}
    />
  );
}
