/**
 * Copy text, and say whether it worked.
 *
 * `navigator.clipboard` is not always there to be called: it needs a secure
 * context and the user's permission, and it rejects rather than throwing
 * synchronously. The share page used to `await` it bare, so a denied write
 * skipped the success toast and reported nothing at all — the button simply
 * did nothing. Returning a boolean makes the caller decide what to say.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
