<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    level,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> & {
    /** Renders the title as a heading of this level, so it joins the page outline. */
    level?: 2 | 3 | 4 | 5 | 6;
  } = $props();
</script>

<svelte:element
  this={level ? `h${level}` : "div"}
  bind:this={ref}
  data-slot="card-title"
  class={cn("font-semibold leading-none", className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>
