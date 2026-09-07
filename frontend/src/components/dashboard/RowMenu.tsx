"use client";

/**
 * The `⋯` menu on a form row — the Form Management requirement, verbatim.
 *
 * Copy link · Content · Workflow · Connect · Rename · Duplicate · Copy to ·
 * Move to · Delete, with Delete red and below a separator.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Dots } from "@/components/ui/icons";
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
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
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
        className="rounded-lg p-1.5 text-ink-muted hover:bg-muted hover:text-ink"
      >
        <Dots width={16} height={16} />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-xl"
        >
          <Item onClick={run(onCopyLink)} disabled={!form.slug}>
            Copy link
          </Item>
          <LinkItem href={`/forms/${form.id}/create`}>Content</LinkItem>
          <Item disabled title="Coming soon">
            Workflow
          </Item>
          <LinkItem href={`/forms/${form.id}/connect`}>Connect</LinkItem>
          <Item onClick={run(onRename)}>Rename</Item>
          <Item onClick={run(onDuplicate)}>Duplicate</Item>
          <Item disabled title="Coming soon">
            Copy to
          </Item>
          <Item disabled title="Coming soon">
            Move to
          </Item>
          <div className="my-1 border-t border-line" />
          <Item onClick={run(onDelete)} tone="danger">
            Delete
          </Item>
        </div>
      )}
    </div>
  );
}

const ITEM_CLASS =
  "block w-full px-3 py-1.5 text-left text-[13px] transition-colors";

function Item({
  children,
  onClick,
  disabled,
  tone,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "danger";
  title?: string;
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
    </button>
  );
}

function LinkItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className={cn(ITEM_CLASS, "text-ink hover:bg-muted")}>
      {children}
    </Link>
  );
}
