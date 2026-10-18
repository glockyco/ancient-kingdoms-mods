<script lang="ts">
  import { getClassConfig } from "$lib/utils/classes";

  interface Props {
    /** Array of class IDs (lowercase, e.g., ["warrior", "cleric"]) */
    classes: string[];
    /** Show abbreviated names (WAR, CLR) instead of full names */
    abbreviated?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let { classes, abbreviated = true, class: className = "" }: Props = $props();

  // Filter out "All" and sort for consistent display
  const displayClasses = $derived(
    classes.filter((c) => c.toLowerCase() !== "all").sort(),
  );
</script>

{#if displayClasses.length > 0}
  <span class="flex flex-wrap gap-1 {className}">
    {#each displayClasses as cls (cls)}
      {@const config = getClassConfig(cls)}
      <span
        class="px-1.5 py-0.5 rounded text-xs font-medium text-white text-center min-w-10"
        style="background-color: {config.color}"
      >
        {abbreviated ? config.abbrev : config.name}
      </span>
    {/each}
  </span>
{:else}
  <span class="text-muted-foreground">-</span>
{/if}
