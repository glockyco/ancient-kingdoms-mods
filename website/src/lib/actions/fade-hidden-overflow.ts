export const FADE_WIDTH = "2.5rem";

/**
 * Fades the right edge of a horizontally scrolling element while content is
 * hidden past it, which shows that the element scrolls. The fade disappears
 * once the element is scrolled to its end. A mask fades the content itself,
 * so it suits any background.
 * Focused controls scroll clear of the fade so keyboard users can read them.
 */
export function fadeHiddenOverflow(node: HTMLElement) {
  const originalScrollPadding = node.style.scrollPaddingInlineEnd;
  node.style.scrollPaddingInlineEnd = FADE_WIDTH;
  const revealFocus = (event: FocusEvent) => {
    if (event.target instanceof HTMLElement && event.target !== node) {
      event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };
  const update = () => {
    const hidden = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    node.style.maskImage = hidden
      ? `linear-gradient(to right, #000 calc(100% - ${FADE_WIDTH}), transparent)`
      : "";
  };
  update();
  const observer = new ResizeObserver(update);
  observer.observe(node);
  for (const child of node.children) observer.observe(child);
  node.addEventListener("scroll", update, { passive: true });
  node.addEventListener("focusin", revealFocus);
  return {
    destroy() {
      observer.disconnect();
      node.removeEventListener("scroll", update);
      node.removeEventListener("focusin", revealFocus);
      node.style.scrollPaddingInlineEnd = originalScrollPadding;
    },
  };
}
