import Link from "next/link";

/**
 * Shown when a slug is unknown *or* points at a draft.
 *
 * The two are deliberately indistinguishable: the public surface must not leak
 * that an unpublished form exists.
 */
export default function FormNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <h1 className="text-2xl font-medium text-ink">This form isn’t available</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        The link may be wrong, or the form may have been unpublished by its
        creator.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
      >
        Go to the dashboard
      </Link>
    </main>
  );
}
