<script lang="ts">
  import SeasonLabel from "$lib/components/SeasonLabel.svelte";
  import type { Season } from "$lib/data/seasonal-events";

  /** The seasons of a table row, as icons that stay beside the row's name. */
  let { seasons }: { seasons: readonly Season[] } = $props();
</script>

{#if seasons.length > 0}
  <span class="inline-flex shrink-0 items-center gap-0.5">
    {#each seasons as season (season)}
      <SeasonLabel {season} variant="icon" />
    {/each}
  </span>
{/if}
