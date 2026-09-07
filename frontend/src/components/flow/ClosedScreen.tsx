"use client";

/**
 * What a respondent sees when the creator has closed the form.
 *
 * The link still resolves and the form's own design still applies — closing is
 * not deleting, and a stranger arriving from an old link deserves an
 * explanation rather than a 404.
 */

import { Lock } from "@/components/ui/icons";

export function ClosedScreen({ title }: { title: string }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-choice text-ink-muted">
        <Lock width={22} height={22} />
      </span>
      <h1 className="text-[28px] leading-tight font-medium text-ink sm:text-[32px]">
        {title}
      </h1>
      <p className="text-[17px] text-ink-muted">
        This form is no longer accepting responses.
      </p>
    </div>
  );
}
