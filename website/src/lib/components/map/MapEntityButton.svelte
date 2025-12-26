<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    onSelect: () => void;
    class?: string;
    children: Snippet;
  }

  let { onSelect, class: className = "", children }: Props = $props();
</script>

<button
  type="button"
  class="cursor-pointer underline hover:opacity-80 {className}"
  onclick={onSelect}
>
  {@render children()}
</button>
