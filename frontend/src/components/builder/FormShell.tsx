"use client";

/**
 * The chrome shared by every form-scoped screen.
 *
 * Laid out like the real product's: a breadcrumb back to the workspace, the five
 * nav tabs centred, and the publish/link/plans/help cluster on the right. The
 * working area beneath is the same inset rounded shell the dashboard uses.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import {
  ChevronRight,
  Help,
  Link as LinkIcon,
  NavForms,
  Play,
} from "@/components/ui/icons";
import { CREATOR } from "@/lib/creator";
import { cn } from "@/lib/format";
import { useFormActions, useFormQuery } from "@/lib/queries";

/**
 * The real nav reads Content · Workflow · Connect · Share · Results. Workflow
 * has nothing behind it here, so it keeps its place and says so when pressed
 * rather than being dropped from the row.
 */
const TABS = [
  { slug: "create", label: "Content" },
  { slug: null, label: "Workflow" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
] as const;

interface FormShellProps {
  formId: number;
  /** The builder puts its "Saving… / Saved" indicator here. */
  headerSlot?: ReactNode;
  /** The builder's toolbar strip, shown directly above the working area. */
  toolbar?: ReactNode;
  children: ReactNode;
}

export function FormShell({ formId, headerSlot, toolbar, children }: FormShellProps) {
  const pathname = usePathname();
  const { data: form } = useFormQuery(formId);
  const { publish, unpublish } = useFormActions();
  const toast = useToast();
  const comingSoon = useComingSoon();

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
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] text-ink-muted hover:bg-muted hover:text-ink"
        >
          <NavForms width={17} height={17} />
          <span className="hidden sm:inline">Forms</span>
        </Link>
        <ChevronRight width={14} height={14} className="shrink-0 text-ink-faint" />
        <span className="max-w-[240px] truncate text-[14px] text-ink">
          {form?.title ?? "…"}
        </span>

        <nav className="mx-auto flex items-center gap-0.5">
          {TABS.map((tab) => {
            if (!tab.slug) {
              return (
                <button
                  key={tab.label}
                  type="button"
                  {...comingSoonProps(comingSoon, tab.label)}
                  className="rounded-lg px-3 py-1.5 text-[14px] text-ink-muted transition-colors hover:bg-muted"
                >
                  {tab.label}
                </button>
              );
            }
            const href = `/forms/${formId}/${tab.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.slug}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[14px] transition-colors",
                  active ? "bg-muted-strong text-ink" : "text-ink-muted hover:bg-muted",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {headerSlot}

          <Button
            size="sm"
            variant="secondary"
            onClick={onPublishToggle}
            disabled={publish.isPending || unpublish.isPending}
          >
            <Play width={13} height={13} />
            {published ? "Publish edits" : "Publish"}
          </Button>

          {published && form?.slug ? (
            <Link
              href={`/f/${form.slug}`}
              target="_blank"
              title="Open the public form"
              aria-label="Open the public form"
              className="rounded-lg p-2 text-ink-muted hover:bg-muted hover:text-ink"
            >
              <LinkIcon width={17} height={17} />
            </Link>
          ) : (
            <button
              type="button"
              {...comingSoonProps(comingSoon, "The public link, once this form is published")}
              className="rounded-lg p-2 text-ink-faint"
            >
              <LinkIcon width={17} height={17} />
            </button>
          )}

          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />

          <button
            type="button"
            {...comingSoonProps(comingSoon, "Plans and billing")}
            className="rounded-lg bg-brand px-3.5 py-1.5 text-[14px] font-medium text-brand-ink transition-opacity hover:opacity-90"
          >
            View plans
          </button>

          <ThemeToggle />

          <button
            type="button"
            {...comingSoonProps(comingSoon, "Help centre")}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-muted hover:text-ink"
          >
            <Help width={18} height={18} />
          </button>

          <span
            title={CREATOR.handle}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-avatar-tan text-[12px] font-semibold text-ink-strong"
          >
            {CREATOR.initials}
          </span>
        </div>
      </header>

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-canvas">
        {toolbar && (
          <div className="shrink-0 border-b-2 border-groove">{toolbar}</div>
        )}
        <div className="flex min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
