<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    summary,
    className = "",
    summaryClassName = "cursor-pointer text-blue-600 dark:text-blue-400",
    children,
  }: {
    summary: string;
    className?: string;
    summaryClassName?: string;
    children: Snippet;
  } = $props();

  let element = $state<HTMLDetailsElement>();
  // Adopt native open state after hydration so early user clicks are retained.
  let expanded = $derived(element?.open ?? false);
</script>

<details
  bind:this={element}
  class={className}
  ontoggle={(event) => (expanded = event.currentTarget.open)}
>
  <summary class={summaryClassName}>{summary}</summary>
  {#if expanded}
    {@render children()}
  {/if}
</details>
