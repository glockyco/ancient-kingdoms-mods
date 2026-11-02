<script lang="ts">
  import { Pagination as PaginationPrimitive } from "bits-ui";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import PaginationAnchor from "./pagination-anchor.svelte";

  let {
    ref = $bindable(null),
    class: className,
    children,
    href,
    enhanced = true,
    ...restProps
  }: PaginationPrimitive.NextButtonProps & {
    href?: string;
    enhanced?: boolean;
  } = $props();
</script>

{#snippet Fallback()}
  <span class="hidden sm:block">Next</span>
  <ChevronRightIcon class="size-4" />
{/snippet}

<PaginationPrimitive.NextButton
  bind:ref
  aria-label="Go to next page"
  class={cn(
    buttonVariants({
      size: "default",
      variant: "ghost",
      class: "gap-1 px-2.5 sm:pe-2.5",
    }),
    className,
  )}
  children={children || Fallback}
  {...restProps}
>
  {#snippet child({ props })}
    {#if href}
      <PaginationAnchor {props} {href} {enhanced}>
        {@render (children || Fallback)()}
      </PaginationAnchor>
    {:else}
      <button {...props}>{@render (children || Fallback)()}</button>
    {/if}
  {/snippet}
</PaginationPrimitive.NextButton>
