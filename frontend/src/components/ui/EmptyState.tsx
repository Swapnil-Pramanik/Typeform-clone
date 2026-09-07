import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 py-16 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      {action}
    </div>
  );
}
