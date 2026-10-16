/**
 * Fades the right edge of a horizontally scrolling element while content is
 * hidden past it, which shows that the element scrolls. The fade disappears
 * once the element is scrolled to its end. A mask fades the content itself,
 * so it suits any background.
 */
export function fadeHiddenOverflow(node: HTMLElement) {
  const update = () => {
    const hidden = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    node.style.maskImage = hidden
      ? "linear-gradient(to right, #000 calc(100% - 2.5rem), transparent)"
      : "";
  };
  update();
  const observer = new ResizeObserver(update);
  observer.observe(node);
  for (const child of node.children) observer.observe(child);
  node.addEventListener("scroll", update, { passive: true });
  return {
    destroy() {
      observer.disconnect();
      node.removeEventListener("scroll", update);
    },
  };
}
