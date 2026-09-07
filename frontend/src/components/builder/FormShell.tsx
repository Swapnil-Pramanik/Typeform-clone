"use client";

/**
 * The chrome shared by every form-scoped screen.
 *
 * The real product's top nav reads Content · Workflow · Connect. This build uses
 * Content · Connect · Share · Results — the same shape, with Results given a
 * home because the assignment asks for a responses view.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { ChevronLeft, Eye } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/format";
import { useFormActions, useFormQuery } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";

const TABS = [
  { slug: "create", label: "Content" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
] as const;

interface FormShellProps {
  formId: number;
  /** The builder puts its "Saving… / Saved" indicator here. */
  headerSlot?: ReactNode;
  children: ReactNode;
}

export function FormShell({ formId, headerSlot, children }: FormShellProps) {
  const pathname = usePathname();
  const { data: form } = useFormQuery(formId);
  const { publish, unpublish } = useFormActions();
  const toast = useToast();

  const published = form?.status === "published";

  const onPublishToggle = async () => {
    try {
      if (published) {
        await unpublish.mutateAsync(formId);
        toast.show("Form unpublished. The link stops working until you republish.");
      } else {
        const updated = await publish.mutateAsync(formId);
        toast.show(`Published to /f/${updated.slug}`, "success");
      }
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not publish.", "error");
    }
  };

  return (
    /*
     * Same frame as the dashboard: the bar sits on the page and the working area
     * below it is an inset rounded shell. The two screens are one product, so
     * they cannot disagree about their own chrome.
     */
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-muted hover:text-ink"
        >
          <ChevronLeft width={15} height={15} />
          <span className="hidden sm:inline">My workspace</span>
        </Link>

        <span className="max-w-[220px] truncate text-[13px] font-medium text-ink">
          {form?.title ?? "…"}
        </span>

        <nav className="mx-auto flex items-center gap-0.5">
          {TABS.map((tab) => {
            const href = `/forms/${formId}/${tab.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.slug}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "bg-muted-strong text-ink-strong" : "text-ink-muted hover:bg-muted",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {headerSlot}
          {published && form?.slug && (
            <Link
              href={`/f/${form.slug}`}
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-muted hover:text-ink sm:flex"
            >
              <Eye width={15} height={15} />
              Preview
            </Link>
          )}
          <ThemeToggle />
          <Button
            size="sm"
            variant={published ? "secondary" : "primary"}
            onClick={onPublishToggle}
            disabled={publish.isPending || unpublish.isPending}
          >
            {published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="mx-4 mb-4 flex min-h-0 flex-1 overflow-hidden rounded-[14px] bg-canvas">
        {children}
      </div>
    </div>
  );
}
