<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    onSelect: () => void;
    onHoverStart?: () => void;
    onHoverEnd?: () => void;
    class?: string;
    children: Snippet;
  }

  let {
    onSelect,
    onHoverStart,
    onHoverEnd,
    class: className = "",
    children,
  }: Props = $props();
</script>

<button
  type="button"
  class="cursor-pointer underline hover:opacity-80 {className}"
  onclick={onSelect}
  onmouseenter={onHoverStart}
  onmouseleave={onHoverEnd}
>
  {@render children()}
</button>
