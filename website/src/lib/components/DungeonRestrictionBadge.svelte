<script lang="ts">
  import Castle from "@lucide/svelte/icons/castle";

  interface Props {
    /** Whether the item/skill is allowed in dungeons */
    allowDungeon: boolean;
    /** Additional CSS classes for the badge */
    class?: string;
  }

  let { allowDungeon, class: className = "" }: Props = $props();
</script>

{#if !allowDungeon}
  <span
    class="inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium bg-red-700 text-white dark:bg-red-800 flex-shrink-0 {className}"
  >
    <Castle class="h-4 w-4 flex-shrink-0" />
    No Dungeon Use
  </span>
{/if}
