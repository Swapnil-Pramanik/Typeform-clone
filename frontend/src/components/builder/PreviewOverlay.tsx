"use client";

/**
 * The toolbar's play button: the form as a respondent meets it, without
 * publishing it first.
 *
 * It mounts the real `FormFlow` rather than an imitation of it, in `preview`
 * mode so nothing is written — no response row, no partial-response beacon. A
 * draft has no slug and needs none here, because no request is made.
 *
 * The phone frame is the same device the canvas toggle offers, so "how does
 * this read on a phone" has one answer in the builder rather than two.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { FormFlow } from "@/components/flow/FormFlow";
import { Close, Device, Monitor } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { PHONE } from "@/lib/device";
import type { Form, PublicForm, ViewDevice } from "@/types";

interface PreviewOverlayProps {
  open: boolean;
  onClose: () => void;
  form: Form | null;
  device: ViewDevice;
  onDevice: (device: ViewDevice) => void;
}

/** The builder's form as the respondent flow expects it. */
function asPublicForm(form: Form): PublicForm {
  return {
    slug: form.slug ?? "preview",
    title: form.title,
    welcome_screen: form.welcome_screen,
    theme: form.theme,
    settings: form.settings,
    // A closed form still previews: the creator is rehearsing it, not answering
    // it, and a lock screen would be a strange thing to show them.
    accepting_responses: true,
    questions: form.questions,
  };
}

export function PreviewOverlay({
  open,
  onClose,
  form,
  device,
  onDevice,
}: PreviewOverlayProps) {
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
      {open && form && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${form.title}`}
          className="fixed inset-0 z-50 flex flex-col bg-canvas"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
            <span className="truncate text-[14px] font-medium text-ink">
              Previewing {form.title}
            </span>

            <div className="flex items-center gap-2">
              <DeviceToggle device={device} onChange={onDevice} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
              >
                <Close width={17} height={17} />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 pt-0">
            <div
              className={cn(
                "relative overflow-hidden bg-bg",
                device === "mobile"
                  ? "rounded-[2rem] border-[10px] border-ink-strong shadow-2xl"
                  : "h-full w-full rounded-xl border border-line",
              )}
              style={
                device === "mobile"
                  ? { width: PHONE.width, height: PHONE.height }
                  : undefined
              }
            >
              {/* Keyed on the device so switching restarts the rehearsal
                  cleanly rather than resizing mid-question. */}
              <FormFlow key={device} form={asPublicForm(form)} preview />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DeviceToggle({
  device,
  onChange,
}: {
  device: ViewDevice;
  onChange: (device: ViewDevice) => void;
}) {
  const options: { id: ViewDevice; label: string; icon: typeof Device }[] = [
    { id: "desktop", label: "Desktop view", icon: Monitor },
    { id: "mobile", label: "Mobile view", icon: Device },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-label={label}
          aria-pressed={device === id}
          title={label}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            device === id
              ? "bg-panel text-ink shadow-sm"
              : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon width={16} height={16} />
        </button>
      ))}
    </div>
  );
}
