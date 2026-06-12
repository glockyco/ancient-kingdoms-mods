<script lang="ts">
  import KofiIcon from "$lib/components/KofiIcon.svelte";
  import { KOFI_URL } from "$lib/constants/links";
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    compact?: boolean;
  }

  let { class: className = "", compact = false }: Props = $props();

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
  <KofiIcon class="size-7 text-foreground" />
  {#if compact}
    <span class="sm:hidden">Support</span>
    <span class="hidden sm:inline">{label}</span>
  {:else}
    <span>{label}</span>
  {/if}
</a>
