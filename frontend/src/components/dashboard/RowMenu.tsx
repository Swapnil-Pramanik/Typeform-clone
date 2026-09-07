"use client";

/**
 * The `⋯` menu on a form row — the Form Management requirement, verbatim.
 *
 * Grouped as the real product groups it: the link on its own, then the four
 * places you can go inside a form, then the things you can do to the form, then
 * Delete below a separator.
 */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ChevronRight, Dots } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import type { FormSummary } from "@/types";

interface RowMenuProps {
  form: FormSummary;
  onCopyLink: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RowMenu({
  form,
  onCopyLink,
  onRename,
  onDuplicate,
  onDelete,
}: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${form.title}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-muted hover:text-ink",
          open && "bg-muted text-ink",
        )}
      >
        <Dots width={18} height={18} />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-panel py-2 shadow-xl"
        >
          <Item onClick={run(onCopyLink)} disabled={!form.slug}>
            Copy link
          </Item>

          <Separator />
          <LinkItem href={`/forms/${form.id}/create`}>Content</LinkItem>
          <Item disabled title="Coming soon">
            Workflow
          </Item>
          <LinkItem href={`/forms/${form.id}/connect`}>Connect</LinkItem>
          <LinkItem href={`/forms/${form.id}/share`}>Share</LinkItem>
          <LinkItem href={`/forms/${form.id}/results`}>Results</LinkItem>

          <Separator />
          <Item onClick={run(onRename)}>Rename</Item>
          <Item onClick={run(onDuplicate)}>Duplicate</Item>
          <Item disabled title="Coming soon" trailing={<ChevronRight width={15} height={15} />}>
            Copy to
          </Item>
          <Item disabled title="Coming soon" trailing={<ChevronRight width={15} height={15} />}>
            Move to
          </Item>

          <Separator />
          <Item onClick={run(onDelete)} tone="danger">
            Delete
          </Item>
        </div>
      )}
    </div>
  );
}

const ITEM_CLASS =
  "flex w-full items-center justify-between gap-2 px-4 py-[7px] text-left text-[15px] transition-colors";

function Separator() {
  return <div className="my-2 border-t border-line" />;
}

function Item({
  children,
  onClick,
  disabled,
  tone,
  title,
  trailing,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "danger";
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        ITEM_CLASS,
        disabled
          ? "cursor-not-allowed text-ink-faint/70"
          : tone === "danger"
            ? "text-danger hover:bg-danger/8"
            : "text-ink hover:bg-muted",
      )}
    >
      {children}
      {trailing}
    </button>
  );
}

function LinkItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link role="menuitem" href={href} className={cn(ITEM_CLASS, "text-ink hover:bg-muted")}>
      {children}
    </Link>
  );
}
