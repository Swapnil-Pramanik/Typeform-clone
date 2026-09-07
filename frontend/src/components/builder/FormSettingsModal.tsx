"use client";

/**
 * Form settings: a left nav, a scrolling pane, and Cancel / Save.
 *
 * Edits are held locally and only committed on Save, which is why Save stays
 * disabled until something actually differs — a settings dialog that saved as
 * you typed would make Cancel a lie.
 *
 * What is real: the six display switches, which the respondent flow reads, and
 * the open/closed switch, which the *server* enforces on every submission.
 * Form modes, scheduling and language are the real product's shape with nothing
 * behind them here, so they are present and say so.
 */

import { useState } from "react";

import { Toggle } from "@/components/builder/Toggle";
import { Button } from "@/components/ui/Button";
import { comingSoonProps, useComingSoon } from "@/components/ui/ComingSoon";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Gem, Layers, Lock } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { FORM_MODES, UNIVERSAL, modeLabel } from "@/lib/formModes";
import { DEFAULT_FORM_SETTINGS, type Form, type FormSettings } from "@/types";

type Tab = "general" | "access" | "language";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "access", label: "Access & Scheduling" },
  { id: "language", label: "Language" },
];

/** The switches that genuinely change what a respondent sees. */
const DISPLAY: { key: keyof FormSettings; label: string; hint?: string }[] = [
  { key: "show_branding", label: "Typeform branding" },
  { key: "show_navigation_arrows", label: "Navigation arrows" },
  { key: "show_progress_bar", label: "Progress bar" },
  { key: "show_question_number", label: "Question number" },
  {
    key: "show_required_asterisk",
    label: "Asterisks (*) to show required questions",
    hint: "Marks required questions with an asterisk",
  },
  {
    key: "show_answer_letters",
    label: "Letters on answers",
    hint: "The A, B, C keys beside choices",
  },
];

interface FormSettingsModalProps {
  open: boolean;
  onClose: () => void;
  form: Form | undefined;
  onSave: (patch: {
    settings: FormSettings;
    accepting_responses: boolean;
  }) => Promise<void>;
}

export function FormSettingsModal({
  open,
  onClose,
  form,
  onSave,
}: FormSettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Form settings">
      {form && <SettingsBody form={form} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

/**
 * Held apart from the dialog on purpose.
 *
 * `Modal` mounts its children only while open, so this body is created fresh
 * every time the dialog is opened — which means its state can simply be
 * initialised from the form. No effect has to watch for the dialog opening and
 * copy values across, and a cancelled edit cannot leave anything behind.
 */
function SettingsBody({
  form,
  onClose,
  onSave,
}: {
  form: Form;
  onClose: () => void;
  onSave: FormSettingsModalProps["onSave"];
}) {
  const comingSoon = useComingSoon();
  const saved = { ...DEFAULT_FORM_SETTINGS, ...(form.settings ?? {}) };

  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<FormSettings>(saved);
  const [accepting, setAccepting] = useState(form.accepting_responses);
  const [saving, setSaving] = useState(false);

  // Save stays disabled until something differs — a settings dialog that saved
  // as you typed would make Cancel a lie.
  const dirty =
    accepting !== form.accepting_responses ||
    DISPLAY.some(({ key }) => settings[key] !== saved[key]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ settings, accepting_responses: accepting });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex min-h-[420px] gap-5 bg-canvas p-5">
        <nav className="flex w-[190px] shrink-0 flex-col gap-0.5">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors",
                tab === entry.id
                  ? "bg-muted-strong text-ink"
                  : "text-ink-muted hover:bg-muted hover:text-ink",
              )}
            >
              {entry.label}
            </button>
          ))}
          <div className="my-2 border-t border-line" />
          <button
            type="button"
            {...comingSoonProps(comingSoon, "Block references")}
            className="rounded-lg px-3 py-2.5 text-left text-[14px] text-ink-faint"
          >
            Block references
          </button>
        </nav>

        <div className="tf-scrollbar max-h-[52vh] flex-1 overflow-y-auto rounded-xl bg-panel p-5">
          {tab === "general" && (
            <GeneralTab
              settings={settings}
              onChange={(key, value) =>
                setSettings((previous) => ({ ...previous, [key]: value }))
              }
            />
          )}
          {tab === "access" && (
            <AccessTab accepting={accepting} onChange={setAccepting} />
          )}
          {tab === "language" && <LanguageTab />}
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </footer>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-3 text-[17px] font-medium text-ink-strong">{title}</h3>
      {children}
    </section>
  );
}

function SettingRow({
  label,
  hint,
  gem,
  children,
}: {
  label: string;
  hint?: string;
  gem?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[14px] text-ink">
        {label}
        {hint && (
          <span
            title={hint}
            aria-label={hint}
            className="flex h-[15px] w-[15px] shrink-0 cursor-help items-center justify-center rounded-full border border-line-strong text-[10px] text-ink-faint"
          >
            ?
          </span>
        )}
        {gem && (
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand">
            <Gem width={11} height={11} strokeWidth={2} />
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

function GeneralTab({
  settings,
  onChange,
}: {
  settings: FormSettings;
  onChange: (key: keyof FormSettings, value: boolean) => void;
}) {
  const comingSoon = useComingSoon();

  return (
    <>
      <Section title="Form mode">
        <p className="mb-3 text-[14px] leading-relaxed text-ink-muted">
          Modes give you the right tools for your form, so you can create and
          publish faster.
        </p>
        <p className="mb-1.5 text-[14px] text-ink">Choose a mode</p>
        <Dropdown
          label="Form mode"
          value={UNIVERSAL}
          onChange={(mode) => {
            if (mode !== UNIVERSAL) comingSoon(modeLabel(mode));
          }}
          options={FORM_MODES.map((mode) => ({
            value: mode.value,
            label: mode.label,
            icon: <Layers width={15} height={15} />,
          }))}
          triggerClassName="w-full border-line-strong bg-bg py-2 text-ink"
        />
        <p className="mt-2 text-[13px] text-ink-muted">
          Only Universal is built here. The others describe scoring and quiz
          behaviour this form engine does not model.
        </p>
      </Section>

      <div className="mb-6 border-t border-line" />

      <Section title="Display">
        {DISPLAY.map(({ key, label, hint }) => (
          <SettingRow
            key={key}
            label={label}
            hint={hint}
            gem={key === "show_branding"}
          >
            <Toggle
              label={label}
              checked={settings[key]}
              onChange={(value) => onChange(key, value)}
            />
          </SettingRow>
        ))}
      </Section>
    </>
  );
}

function AccessTab({
  accepting,
  onChange,
}: {
  accepting: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <>
      <div
        className={cn(
          "mb-5 flex items-center gap-3 rounded-xl border px-4 py-3.5 text-[14px]",
          accepting
            ? "border-info-line bg-info text-info-ink"
            : "border-line-strong bg-muted text-ink",
        )}
      >
        <Lock width={18} height={18} className="shrink-0" />
        <span>
          Your form is <strong>{accepting ? "open" : "closed"}</strong> to new
          responses.
        </span>
      </div>

      <Section title="Access & Scheduling">
        <SettingRow label="Open this form to new responses">
          <Toggle
            label="Open this form to new responses"
            checked={accepting}
            onChange={onChange}
          />
        </SettingRow>
        <SettingRow label="Schedule a close date" gem>
          <Toggle label="Schedule a close date" checked={false} onChange={() => {}} comingSoon />
        </SettingRow>
        <SettingRow label="Set a response limit" gem>
          <Toggle label="Set a response limit" checked={false} onChange={() => {}} comingSoon />
        </SettingRow>
        <SettingRow label="Show custom closed message" gem>
          <Toggle
            label="Show custom closed message"
            checked={false}
            onChange={() => {}}
            comingSoon
          />
        </SettingRow>
      </Section>

      <p className="text-[13px] leading-relaxed text-ink-muted">
        Closing a form is enforced by the server, not just hidden in the browser:
        a submission from an old tab is refused too.
      </p>
    </>
  );
}

function LanguageTab() {
  const comingSoon = useComingSoon();
  return (
    <Section title="Language">
      <p className="mb-3 text-[14px] leading-relaxed text-ink-muted">
        The real product translates the buttons, validation messages and progress
        text a respondent sees. This build ships English only.
      </p>
      <button
        type="button"
        {...comingSoonProps(comingSoon, "Form languages")}
        className="rounded-lg border border-line-strong px-3 py-2 text-[14px] text-ink-muted hover:text-ink"
      >
        Choose a language
      </button>
    </Section>
  );
}
