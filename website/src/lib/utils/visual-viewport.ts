import type { Attachment } from "svelte/attachments";

/**
 * Gives an element the size and position of the part of the screen that the
 * visitor sees, as --visual-viewport-height and --visual-viewport-top. On
 * phones the on-screen keyboard covers the page without resizing it, and only
 * window.visualViewport reports the part above the keyboard.
 */
export const trackVisualViewport: Attachment<HTMLElement> = (node) => {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const update = () => {
    node.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
    node.style.setProperty("--visual-viewport-top", `${viewport.offsetTop}px`);
  };
  update();
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  return () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
  };
};
