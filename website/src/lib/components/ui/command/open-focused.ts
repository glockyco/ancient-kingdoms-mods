import { flushSync } from "svelte";

/**
 * Opens a search dialog and focuses its field while the tap that opened it
 * is still running, because iOS opens the on-screen keyboard only for a field
 * that a tap focuses.
 */
export function openFocused(
  open: () => void,
  field: () => HTMLElement | null | undefined,
) {
  flushSync(open);
  field()?.focus({ preventScroll: true });
}
