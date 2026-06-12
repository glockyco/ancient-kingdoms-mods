<script lang="ts">
  import KofiIcon from "$lib/components/KofiIcon.svelte";
  import { KOFI_URL } from "$lib/constants/links";
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    compact?: boolean;
    iconRight?: boolean;
  }

  let {
    class: className = "",
    compact = false,
    iconRight = false,
  }: Props = $props();

  const label = "Support the Compendium";
</script>

<a
  href={KOFI_URL}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Support the Compendium on Ko-fi"
  class={cn(
    "inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#72a4f2]/50 sm:min-h-9",
    className,
  )}
>
  {#snippet text()}
    {#if compact}
      <span class="md:hidden">Support</span>
      <span class="hidden md:inline">{label}</span>
    {:else}
      <span>{label}</span>
    {/if}
  {/snippet}
  {#if iconRight}
    {@render text()}
    <KofiIcon class="size-7 text-foreground" />
  {:else}
    <KofiIcon class="size-7 text-foreground" />
    {@render text()}
  {/if}
</a>
