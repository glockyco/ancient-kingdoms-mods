<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    href: string;
    onSelect: () => void;
    onHoverStart?: () => void;
    onHoverEnd?: () => void;
    class?: string;
    children: Snippet;
  }

  let {
    href,
    onSelect,
    onHoverStart,
    onHoverEnd,
    class: className = "",
    children,
  }: Props = $props();

  function handleClick(e: MouseEvent) {
    // Allow modifier-clicks to work naturally (open in new tab)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      return;
    }
    // Normal click: prevent navigation and use callback
    e.preventDefault();
    onSelect();
  }
</script>

<a
  {href}
  class="cursor-pointer underline hover:opacity-80 text-blue-400 {className}"
  onclick={handleClick}
  onmouseenter={onHoverStart}
  onmouseleave={onHoverEnd}
>
  {@render children()}
</a>
