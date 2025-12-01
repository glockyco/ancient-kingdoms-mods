<script lang="ts">
  import { getActiveQuestFlags, type QuestFlag } from "$lib/utils/quests";
  import Star from "@lucide/svelte/icons/star";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";

  interface Props {
    /** Quest flags data */
    quest: {
      is_main_quest: boolean;
      is_epic_quest: boolean;
      is_adventurer_quest: boolean;
    };
    /** Additional CSS classes for the container */
    class?: string;
  }

  let { quest, class: className = "" }: Props = $props();

  const activeFlags = $derived(getActiveQuestFlags(quest));
</script>

{#snippet flagIcon(key: QuestFlag, iconColor: string)}
  {#if key === "main"}
    <Star class="h-4 w-4 {iconColor}" />
  {:else if key === "epic"}
    <Sparkles class="h-4 w-4 {iconColor}" />
  {:else if key === "daily"}
    <CalendarClock class="h-4 w-4 {iconColor}" />
  {/if}
{/snippet}

{#if activeFlags.length > 0}
  <div class="flex flex-wrap gap-1 {className}">
    {#each activeFlags as flag (flag.key)}
      <span
        class="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-xs"
      >
        {@render flagIcon(flag.key, flag.iconColor)}
        {flag.label}
      </span>
    {/each}
  </div>
{/if}
