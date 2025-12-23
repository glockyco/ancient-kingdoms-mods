<script lang="ts">
  import type { MapSearchResult } from "$lib/queries/map-search";
  import Sword from "@lucide/svelte/icons/sword";
  import Shield from "@lucide/svelte/icons/shield";
  import Crown from "@lucide/svelte/icons/crown";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import Users from "@lucide/svelte/icons/users";
  import MapIcon from "@lucide/svelte/icons/map";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Box from "@lucide/svelte/icons/box";
  import Flame from "@lucide/svelte/icons/flame";
  import Hammer from "@lucide/svelte/icons/hammer";
  import CircleDot from "@lucide/svelte/icons/circle-dot";
  import MapPinOff from "@lucide/svelte/icons/map-pin-off";
  import type { Component } from "svelte";

  interface Props {
    result: MapSearchResult;
  }
  let { result }: Props = $props();

  function getIcon(result: MapSearchResult): Component {
    if (result.category === "monster") {
      switch (result.subcategory) {
        case "boss":
          return Crown;
        case "elite":
          return Shield;
        case "hunt":
          return Crosshair;
        default:
          return Sword;
      }
    }
    if (result.category === "resource" && result.keywords) {
      if (result.keywords.includes("mineral")) return Pickaxe;
      if (result.keywords.includes("spark")) return Sparkles;
      return Leaf;
    }
    const icons: Record<MapSearchResult["category"], Component> = {
      monster: Sword,
      npc: Users,
      zone: MapIcon,
      resource: Leaf,
      chest: Box,
      altar: Flame,
      crafting: Hammer,
      portal: CircleDot,
    };
    return icons[result.category];
  }

  let Icon = $derived(getIcon(result));

  function getDisplayName(result: MapSearchResult): string {
    if (result.category === "crafting" && result.subcategory) {
      switch (result.subcategory) {
        case "alchemy":
          return "Alchemy Table";
        case "cooking":
          return "Cooking Oven";
        case "forge":
          return "Forge";
      }
    }
    return result.name;
  }
</script>

<div class="flex items-center gap-3 w-full">
  <Icon class="h-4 w-4 text-muted-foreground shrink-0" />
  <div class="flex-1 min-w-0">
    <div class="font-medium truncate">{getDisplayName(result)}</div>
    {#if result.zoneName && result.category !== "zone" && !result.spawnCount}
      <div class="text-xs text-muted-foreground truncate">
        {result.zoneName}
      </div>
    {/if}
  </div>
  {#if result.spawnCount}
    <span class="text-xs text-muted-foreground shrink-0"
      >{result.spawnCount} locations</span
    >
  {/if}
  {#if result.level}
    <span class="text-xs text-muted-foreground shrink-0">Lv.{result.level}</span
    >
  {/if}
  {#if !result.bounds}
    <span
      class="text-xs text-muted-foreground italic flex items-center gap-1 shrink-0"
    >
      <MapPinOff class="h-3 w-3" />
      <span class="hidden sm:inline">No location</span>
    </span>
  {/if}
</div>
