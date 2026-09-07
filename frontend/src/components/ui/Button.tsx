"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "border border-line-strong bg-panel text-ink hover:bg-muted",
  ghost: "text-ink-muted hover:bg-muted hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  );
}
