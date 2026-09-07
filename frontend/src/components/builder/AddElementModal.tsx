"use client";

/**
 * The add-element modal, grouped the way the real product groups its blocks.
 *
 * The eight supported types sit in their real groups; everything else is drawn
 * greyed out and disabled. Building the full catalogue costs almost nothing and
 * makes the unbuilt types read as a scope decision rather than as a gap.
 */

import { useMemo, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { Search, Sparkle } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { BLOCK_GROUPS, RECOMMENDED, type BlockMeta } from "@/lib/questionTypes";
import type { QuestionType } from "@/types";

const TABS = ["Add form elements", "Import questions", "Create with AI"] as const;
type Tab = (typeof TABS)[number];

interface AddElementModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
  /** The welcome screen is form data, so it is added by a different route. */
  onPickWelcome: () => void;
}

export function AddElementModal({
  open,
  onClose,
  onPick,
  onPickWelcome,
}: AddElementModalProps) {
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return BLOCK_GROUPS;
    return BLOCK_GROUPS.map((group) => ({
      ...group,
      blocks: group.blocks.filter((block) =>
        block.label.toLowerCase().includes(needle),
      ),
    })).filter((group) => group.blocks.length > 0);
  }, [query]);

  const choose = (block: BlockMeta) => {
    if (!block.supported) return;
    if (block.action === "welcome") onPickWelcome();
    else if (block.type) onPick(block.type);
    else return;
    onClose();
    setQuery("");
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add an element">
      <div className="flex flex-col">
        <nav className="flex gap-1 border-b border-line px-5">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                tab === name
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {name}
            </button>
          ))}
        </nav>

        {tab !== TABS[0] ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Sparkle className="text-ink-faint" />
            <p className="text-sm font-medium text-ink">{tab}</p>
            <p className="max-w-sm text-[13px] text-ink-muted">
              Out of scope for this build. The tab is here because the real
              product has it.
            </p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <label className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2">
              <Search width={15} height={15} className="text-ink-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search elements"
                aria-label="Search elements"
                className="w-full bg-transparent text-[13px] focus:outline-none"
              />
            </label>

            {!query && (
              <section className="mb-5">
                <GroupHeading>Recommended</GroupHeading>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {RECOMMENDED.map((block) => (
                    <BlockButton key={block.label} block={block} onPick={choose} />
                  ))}
                </div>
              </section>
            )}

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <section key={group.name}>
                  <GroupHeading>{group.name}</GroupHeading>
                  <div className="flex flex-col gap-0.5">
                    {group.blocks.map((block) => (
                      <BlockButton
                        key={`${group.name}-${block.label}`}
                        block={block}
                        onPick={choose}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
      {children}
    </h3>
  );
}

function BlockButton({
  block,
  onPick,
}: {
  block: BlockMeta;
  onPick: (block: BlockMeta) => void;
}) {
  const Icon = block.icon;
  return (
    <button
      type="button"
      disabled={!block.supported}
      title={block.supported ? undefined : "Coming soon"}
      onClick={() => onPick(block)}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px]",
        block.supported
          ? "text-ink hover:bg-muted"
          : "cursor-not-allowed text-ink-faint/70",
      )}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
        style={{ backgroundColor: block.tint, opacity: block.supported ? 1 : 0.4 }}
      >
        <Icon width={13} height={13} />
      </span>
      <span className="truncate">{block.label}</span>
    </button>
  );
}
