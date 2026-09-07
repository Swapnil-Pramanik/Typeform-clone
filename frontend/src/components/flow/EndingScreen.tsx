"use client";

/**
 * The thank-you screen, rendered from data.
 *
 * Endings are rows in `questions` with `type = "ending"`, so a creator can edit
 * the copy and the button label without a code change — which is why the submit
 * endpoint returns the ending payload rather than the client hardcoding one.
 */

import { Check } from "@/components/ui/icons";
import type { EndingPayload } from "@/types";

interface EndingScreenProps {
  ending: EndingPayload | null;
  onRestart?: () => void;
}

export function EndingScreen({ ending, onRestart }: EndingScreenProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink">
        <Check width={22} height={22} />
      </span>

      <h1 className="text-[28px] leading-tight font-medium text-ink sm:text-[34px]">
        {ending?.title ?? "Thanks for completing this typeform!"}
      </h1>

      {ending?.description && (
        <p className="text-[17px] text-ink-muted">{ending.description}</p>
      )}

      {onRestart && (
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 rounded-lg border border-line-strong px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-choice"
        >
          {ending?.settings?.button_text ?? "Submit another response"}
        </button>
      )}
    </div>
  );
}
