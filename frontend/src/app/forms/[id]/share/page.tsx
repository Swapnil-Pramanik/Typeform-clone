"use client";

/** The public link, plus the embed placements the real product offers. */

import Link from "next/link";
import { use, useState } from "react";

import { FormShell } from "@/components/builder/FormShell";
import { Button } from "@/components/ui/Button";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Copy, Eye, Link as LinkIcon } from "@/components/ui/icons";
import { LoadingPane } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { useFormActions, useFormQuery } from "@/lib/queries";

export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const formId = Number(use(params).id);
  const { data: form, isLoading } = useFormQuery(formId);
  const toast = useToast();
  const { publish, unpublish } = useFormActions();
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  const url = form?.slug ? `${origin}/f/${form.slug}` : null;
  const live = form?.status === "published";

  const toggleLive = async () => {
    try {
      if (live) {
        await unpublish.mutateAsync(formId);
        toast.show("Form unpublished. The link stops working until you publish again.");
      } else {
        const updated = await publish.mutateAsync(formId);
        toast.show(`Published to /f/${updated.slug}`, "success");
      }
    } catch (error) {
      toast.show(
        error instanceof Error ? error.message : "Could not change this form.",
        "error",
      );
    }
  };

  const copy = async () => {
    if (!url) return;
    const copied = await copyText(url);
    toast.show(
      copied ? "Link copied" : "Could not copy the link.",
      copied ? "success" : "error",
    );
  };

  return (
    <FormShell formId={formId}>
      <div className="tf-scrollbar flex-1 overflow-y-auto bg-canvas p-8">
        {isLoading ? (
          <LoadingPane />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <section className="rounded-xl border border-line bg-panel p-6">
              <h2 className="text-base font-medium text-ink">Share your typeform</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {live
                  ? "Anyone with this link can fill your form. No account needed."
                  : "This form is a draft. Publish it to make the link live."}
              </p>

              {url ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center gap-2 truncate rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">
                    <LinkIcon width={15} height={15} className="shrink-0 text-ink-faint" />
                    <span className="truncate">{url}</span>
                  </div>
                  <Button variant="secondary" onClick={() => void copy()}>
                    <Copy width={15} height={15} />
                    Copy
                  </Button>
                  {live && (
                    <Link href={`/f/${form!.slug}`} target="_blank">
                      <Button>
                        <Eye width={15} height={15} />
                        Open
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
                  A link is generated the first time you publish. It is kept
                  afterwards, so unpublishing and republishing never breaks it.
                </p>
              )}

              {/*
                Unpublishing lives here rather than in the header. It used to be
                the second half of a toggle behind the Publish button, which
                meant a button reading "Publish edits" took the form offline.
                Taking a live form down is a deliberate act and belongs beside
                the sentence that says whether it is live.
              */}
              {url && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-[13px] text-ink-muted">
                    {live
                      ? "Stop accepting new visitors? The link keeps working once you publish again."
                      : "The link is dormant until you publish this form again."}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={publish.isPending || unpublish.isPending}
                    onClick={() => void toggleLive()}
                    className={live ? "text-danger" : undefined}
                  >
                    {live ? "Unpublish" : "Publish again"}
                  </Button>
                </div>
              )}
            </section>

            <ComingSoon
              title="Embed & distribute"
              description="Drop the form into a page, a popup or an email instead of sending a link."
              items={["Standard embed", "Popup", "Slider", "Side tab", "Email", "QR code"]}
            />
          </div>
        )}
      </div>
    </FormShell>
  );
}
