<script lang="ts">
  import { getActiveQuestFlags, type QuestFlag } from "$lib/utils/quests";
  import { ICON_BADGE } from "$lib/styles/badge";
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
    <Star class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if key === "epic"}
    <Sparkles class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if key === "daily"}
    <CalendarClock class="{ICON_BADGE.iconSize} {iconColor}" />
  {/if}
{/snippet}

{#if activeFlags.length > 0}
  <div class="flex flex-wrap gap-1 {className}">
    {#each activeFlags as flag (flag.key)}
      <span class="{ICON_BADGE.base} {ICON_BADGE.static}">
        {@render flagIcon(flag.key, flag.iconColor)}
        {flag.label}
      </span>
    {/each}
  </div>
{/if}
