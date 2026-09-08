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
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
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
  const { publish } = useFormActions();
  const toast = useToast();
  const comingSoon = useComingSoon();

  const published = form?.status === "published";
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  /**
   * Publish, or re-publish. Never the reverse.
   *
   * This used to toggle: on a published form the "Publish edits" button took
   * the form *offline*, which is the opposite of what it says. Taking a live
   * form down is not something a button labelled Publish should ever do by
   * accident, so unpublishing moved to the Share tab where the live/draft state
   * is spelled out.
   *
   * On an already-published form this re-validates the rules and marks the
   * moment in the form's history. Edits themselves are live as soon as the
   * autosave lands — see the README's §15, "No staged drafts".
   */
  const onPublish = async () => {
    try {
      const updated = await publish.mutateAsync(formId);
      // The slug only tells a republish something it already knows — the link
      // has not changed. A first publish is the moment worth naming it.
      toast.show(
        published ? "Your changes are live" : `Published to /f/${updated.slug}`,
        "success",
      );
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not publish.", "error");
    }
  };

  const copyLink = async () => {
    if (!form?.slug) return;
    const copied = await copyText(`${origin}/f/${form.slug}`);
    toast.show(
      copied ? "Link copied" : "Could not copy the link.",
      copied ? "success" : "error",
    );
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
            onClick={() => void onPublish()}
            disabled={publish.isPending}
          >
            <Play width={13} height={13} />
            {published ? "Publish edits" : "Publish"}
          </Button>

          {published && form?.slug ? (
            <button
              type="button"
              onClick={() => void copyLink()}
              title="Copy the public link"
              aria-label="Copy the public link"
              className="rounded-lg p-2 text-ink-muted hover:bg-muted hover:text-ink"
            >
              <LinkIcon width={17} height={17} />
            </button>
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
