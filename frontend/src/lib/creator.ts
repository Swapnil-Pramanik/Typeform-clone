/**
 * The single seeded creator.
 *
 * There is no auth and no users table (README §14), so the account chrome reads
 * from one constant rather than a session. Adding real accounts later means
 * replacing this module with a `useSession()` hook — nothing else in the
 * dashboard reaches for the creator's identity.
 */

export const CREATOR = {
  handle: "pramanikswapnil9",
  initials: "SP",
  /** The letter shown in the workspace chip beside the handle. */
  workspaceInitial: "P",
} as const;
