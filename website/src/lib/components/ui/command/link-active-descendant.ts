/**
 * Point the command input at the list and at the selected option, as the
 * WAI-ARIA combobox pattern requires. Focus stays in the input, so a screen
 * reader announces the selection only through `aria-activedescendant`.
 * bits-ui Command sets `aria-selected` on the option but neither attribute on
 * the input. Apply this to an element that contains both the input and list.
 */
export function linkActiveDescendant(node: HTMLElement) {
  function sync() {
    const input = node.querySelector<HTMLElement>(
      "[data-slot='command-input']",
    );
    const list = node.querySelector<HTMLElement>("[role='listbox']");
    if (!input) return;
    if (list?.id) input.setAttribute("aria-controls", list.id);
    else input.removeAttribute("aria-controls");
    const selected = node.querySelector<HTMLElement>(
      "[role='option'][aria-selected='true']",
    );
    if (selected?.id) input.setAttribute("aria-activedescendant", selected.id);
    else input.removeAttribute("aria-activedescendant");
  }

  const observer = new MutationObserver(sync);
  observer.observe(node, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-selected", "id"],
  });
  sync();

  return { destroy: () => observer.disconnect() };
}
