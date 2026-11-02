<script lang="ts">
  import { Pagination as PaginationPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import { formatNumber } from "$lib/utils/format";
  import {
    type Props,
    buttonVariants,
  } from "$lib/components/ui/button/index.js";
  import PaginationAnchor from "./pagination-anchor.svelte";

  let {
    ref = $bindable(null),
    class: className,
    size = "icon",
    isActive,
    page,
    children,
    href,
    enhanced = true,
    ...restProps
  }: PaginationPrimitive.PageProps &
    Omit<Props, "href"> & {
      isActive: boolean;
      href?: string;
      enhanced?: boolean;
    } = $props();
</script>

{#snippet Fallback()}
  {formatNumber(page.value)}
{/snippet}

<PaginationPrimitive.Page
  bind:ref
  {page}
  aria-current={isActive ? "page" : undefined}
  data-slot="pagination-link"
  data-active={isActive}
  class={cn(
    buttonVariants({
      variant: isActive ? "outline" : "ghost",
      size,
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
</PaginationPrimitive.Page>
