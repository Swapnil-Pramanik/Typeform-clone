import { Lock } from "@/components/ui/icons";

/**
 * The placeholder every unbuilt area uses.
 *
 * A styled panel naming what would go here reads as a scope decision; a dead
 * link or a 404 reads as unfinished work.
 */
export function ComingSoon({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-line bg-panel px-8 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-choice text-ink-muted">
        <Lock width={20} height={20} />
      </span>
      <div>
        <h2 className="text-lg font-medium text-ink">{title}</h2>
        <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
      </div>
      {items && (
        <ul className="mt-1 flex flex-wrap justify-center gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-line bg-choice px-3 py-1 text-xs text-ink-muted"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-faint">
        Out of scope for this build — the placement is real, the feature is not.
      </p>
    </div>
  );
}
