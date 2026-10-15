/**
 * Keep the keyboard-selected command item fully visible. bits-ui Command does
 * not scroll a partly hidden selection into view.
 * See https://github.com/pacocoursey/cmdk/issues/321
 */
export function scrollSelectedIntoView(node: HTMLElement) {
  function isFullyVisible(element: HTMLElement, container: HTMLElement) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return (
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom
    );
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName !== "aria-selected") continue;
      const target = mutation.target as HTMLElement;
      if (target.getAttribute("aria-selected") !== "true") continue;

      const list = node.querySelector<HTMLElement>(
        "[data-slot='command-list']",
      );
      if (list && !isFullyVisible(target, list)) {
        const itemRect = target.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        list.scrollTop +=
          itemRect.top < listRect.top
            ? itemRect.top - listRect.top
            : itemRect.bottom - listRect.bottom;
      }
    }
  });

  observer.observe(node, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-selected"],
  });

  return { destroy: () => observer.disconnect() };
}
