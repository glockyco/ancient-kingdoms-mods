<script lang="ts">
  import { getQuestTypeConfig } from "$lib/utils/quests";
  import Skull from "@lucide/svelte/icons/skull";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Package from "@lucide/svelte/icons/package";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Search from "@lucide/svelte/icons/search";
  import Compass from "@lucide/svelte/icons/compass";
  import Shirt from "@lucide/svelte/icons/shirt";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import CircleHelp from "@lucide/svelte/icons/circle-help";

  interface Props {
    /** Quest display type (Kill, Gather, Deliver, etc.) */
    type: string;
    /** Additional CSS classes for the badge */
    class?: string;
  }

  let { type, class: className = "" }: Props = $props();

  const config = $derived(getQuestTypeConfig(type));
  const iconColor = $derived(config?.iconColor ?? "text-gray-500");
</script>

{#snippet typeIcon(displayType: string)}
  {#if displayType === "Kill"}
    <Skull class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Gather"}
    <Leaf class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Have"}
    <Backpack class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Deliver"}
    <Package class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Find"}
    <Search class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Discover"}
    <Compass class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Equip"}
    <Shirt class="h-4 w-4 {iconColor}" />
  {:else if displayType === "Brew"}
    <FlaskConical class="h-4 w-4 {iconColor}" />
  {:else}
    <CircleHelp class="h-4 w-4 {iconColor}" />
  {/if}
{/snippet}

<span
  class="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-xs {className}"
>
  {@render typeIcon(type)}
  {type}
</span>
