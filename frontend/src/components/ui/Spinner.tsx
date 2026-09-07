import { cn } from "@/lib/format";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full",
        "border-2 border-current border-t-transparent opacity-60",
        className,
      )}
    />
  );
}

/** Full-pane loading state, used while a route's data is in flight. */
export function LoadingPane({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-muted">
      <Spinner className="h-5 w-5" />
      <p className="text-sm">{label}…</p>
    </div>
  );
}
