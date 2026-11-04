let lastPointerWasTouch = false;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (event) => (lastPointerWasTouch = event.pointerType === "touch"),
    true,
  );
  window.addEventListener("keydown", () => (lastPointerWasTouch = false), true);
}

/**
 * For a popover's onOpenAutoFocus. A popover that a finger opened keeps focus
 * on its button, so the on-screen keyboard does not open over the options. A
 * mouse or a key still moves focus into the popover.
 */
export function keepKeyboardClosedAfterTouch(event: Event) {
  if (lastPointerWasTouch) event.preventDefault();
}
