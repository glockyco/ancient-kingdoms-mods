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
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 {className}"
  >
    <Castle class="h-3 w-3 flex-shrink-0" />
    No Dungeon Use
  </span>
{/if}
