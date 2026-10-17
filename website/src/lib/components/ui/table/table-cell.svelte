<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLTdAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLTdAttributes> = $props();
</script>

<td
  bind:this={ref}
  data-slot="table-cell"
  class={cn(
    "min-w-0 content-center align-middle whitespace-normal bg-clip-padding px-4 py-2 [&:has([role=checkbox])]:pe-0",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</td>

<style>
  td:has(> :global(.ml-auto)) {
    display: flex;
    align-items: center;
  }
</style>
