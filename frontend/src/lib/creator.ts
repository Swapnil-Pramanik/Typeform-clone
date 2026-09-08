/**
 * The single seeded creator.
 *
 * There is no auth and no users table (README §14), so the account chrome reads
 * from one constant rather than a session. Adding real accounts later means
 * replacing this module with a `useSession()` hook — nothing else in the
 * dashboard reaches for the creator's identity.
 */

export const CREATOR = {
  /** A person's name rather than an account handle — it is what a reader parses. */
  handle: "Swapnil Pramanik",
  initials: "SP",
  /** The letter shown in the workspace chip beside the name. */
  workspaceInitial: "S",
} as const;
