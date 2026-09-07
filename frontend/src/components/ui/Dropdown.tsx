"use client";

/**
 * A menu that looks the same in every browser.
 *
 * A native `<select>` renders its list with the operating system's own widget,
 * which cannot be styled and looks nothing like the rest of the product. This
 * replaces it — and therefore has to re-earn what the native control gave away
 * for free: it is a labelled `listbox`, reachable and operable by keyboard, and
 * it tells assistive tech which option is active.
 *
 * Focus deliberately stays on the trigger while the list is open, with
 * `aria-activedescendant` naming the highlighted option. That keeps a single
 * tab stop and avoids the focus-restoration bugs that come from moving focus
 * into a popup and back out again.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  /** Announced to screen readers; the trigger shows the selection instead. */
  label: string;
  /** Shown before the selected label, e.g. the sort control's calendar. */
  leadingIcon?: ReactNode;
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
}

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  label,
  leadingIcon,
  align = "start",
  className,
  triggerClassName,
}: DropdownProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const [active, setActive] = useState(selectedIndex);
  const container = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openAt(selectedIndex);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => (index + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => (index - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={container} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5",
          "text-[14px] text-ink-muted transition-colors hover:text-ink",
          open && "text-ink",
          triggerClassName,
        )}
      >
        {leadingIcon}
        <span className="flex-1 truncate text-left">{selected?.label}</span>
        <ChevronDown
          width={15}
          height={15}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className={cn(
            "tf-scrollbar absolute z-40 mt-1.5 max-h-72 min-w-full overflow-y-auto",
            "rounded-xl border border-line bg-panel p-1.5 shadow-xl",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                id={`${id}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2",
                  "text-left text-[14px] transition-colors",
                  option.value === value ? "bg-muted-strong text-ink" : "text-ink",
                  index === active && option.value !== value && "bg-muted",
                )}
              >
                {option.icon && (
                  <span className="shrink-0 text-ink-muted">{option.icon}</span>
                )}
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
