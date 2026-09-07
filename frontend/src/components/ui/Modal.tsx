"use client";

/** A centred modal with a scrim. Escape closes; focus is trapped to the panel. */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

import { Close } from "@/components/ui/icons";
import { cn } from "@/lib/format";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** `lg` is the add-element modal; `md` suits confirmations and share panels. */
  size?: "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--tf-overlay)]"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl",
              "border border-line bg-panel shadow-2xl",
              size === "lg" ? "max-w-4xl" : "max-w-md",
            )}
          >
            {title && (
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded p-1 text-ink-muted hover:bg-muted hover:text-ink"
                >
                  <Close width={16} height={16} />
                </button>
              </header>
            )}
            <div className="tf-scrollbar overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
