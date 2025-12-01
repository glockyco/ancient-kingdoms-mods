<script lang="ts">
  import { getQuestTypeConfig } from "$lib/utils/quests";
  import { ICON_BADGE } from "$lib/styles/badge";
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
    <Skull class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Gather"}
    <Leaf class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Have"}
    <Backpack class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Deliver"}
    <Package class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Find"}
    <Search class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Discover"}
    <Compass class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Equip"}
    <Shirt class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else if displayType === "Brew"}
    <FlaskConical class="{ICON_BADGE.iconSize} {iconColor}" />
  {:else}
    <CircleHelp class="{ICON_BADGE.iconSize} {iconColor}" />
  {/if}
{/snippet}

<span class="{ICON_BADGE.base} {ICON_BADGE.static} {className}">
  {@render typeIcon(type)}
  {type}
</span>
