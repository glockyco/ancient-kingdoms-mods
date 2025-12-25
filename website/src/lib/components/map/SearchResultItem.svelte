<script lang="ts">
  import type { MapSearchResult } from "$lib/queries/map-search";
  import {
    getActiveRoles,
    normalizeRoles,
    type RoleCategory,
  } from "$lib/utils/roles";
  import { toRomanNumeral } from "$lib/utils/format";
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
  import Package from "@lucide/svelte/icons/package";
  import Flame from "@lucide/svelte/icons/flame";
  import Hammer from "@lucide/svelte/icons/hammer";
  import CircleDot from "@lucide/svelte/icons/circle-dot";
  import MapPinOff from "@lucide/svelte/icons/map-pin-off";
  import Scroll from "@lucide/svelte/icons/scroll";
  import ShoppingBag from "@lucide/svelte/icons/shopping-bag";
  import Wrench from "@lucide/svelte/icons/wrench";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Compass from "@lucide/svelte/icons/compass";
  import type { Component } from "svelte";

  // Role category colors (matching RoleBadges.svelte)
  const categoryColors: Record<RoleCategory, string> = {
    quest: "text-orange-500",
    merchant: "text-green-500",
    service: "text-blue-500",
    special: "text-purple-500",
    combat: "text-red-500",
    renewal: "text-teal-500",
    travel: "text-cyan-500",
  };

  // Role category icons (matching RoleBadges.svelte)
  const categoryIcons: Record<RoleCategory, Component> = {
    quest: Scroll,
    merchant: ShoppingBag,
    service: Wrench,
    special: Sparkles,
    combat: Shield,
    renewal: RefreshCw,
    travel: Compass,
  };

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
    if (result.category === "resource") {
      if (result.keywords?.includes("plant")) return Leaf;
      if (result.keywords?.includes("mineral")) return Pickaxe;
      if (result.keywords?.includes("spark")) return Sparkles;
      return Package; // "other" resources
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

  // Get unique role categories for NPC results
  let roleCategories = $derived.by(() => {
    if (result.category !== "npc" || !result.roles) return [];
    const normalizedRoles = normalizeRoles(result.roles);
    const activeRoles = getActiveRoles(normalizedRoles);
    const categories = new Set(activeRoles.map((r) => r.category));
    return Array.from(categories) as RoleCategory[];
  });
</script>

<div class="flex items-center gap-3 w-full">
  <Icon class="h-4 w-4 text-muted-foreground shrink-0" />
  <div class="flex-1 min-w-0">
    <div class="font-medium truncate">{getDisplayName(result)}</div>
    {#if result.renewalDungeonName}
      <div class="text-xs text-muted-foreground truncate">
        Resets {result.renewalDungeonName}
      </div>
    {:else if result.zoneName && result.category !== "zone" && !result.spawnCount}
      <div class="text-xs text-muted-foreground truncate">
        {result.zoneName}
      </div>
    {/if}
  </div>
  {#if roleCategories.length > 0}
    <div class="flex gap-1 shrink-0">
      {#each roleCategories as cat (cat)}
        {@const RoleIcon = categoryIcons[cat]}
        <RoleIcon class="h-3.5 w-3.5 {categoryColors[cat]}" />
      {/each}
    </div>
  {/if}
  {#if result.spawnCount}
    <span class="text-xs text-muted-foreground shrink-0"
      >{result.spawnCount} spawns</span
    >
  {/if}
  {#if result.level != null}
    {#if result.category === "resource" && (result.keywords?.includes("plant") || result.keywords?.includes("mineral"))}
      <span class="text-xs text-muted-foreground shrink-0"
        >Tier {toRomanNumeral(result.level)}</span
      >
    {:else if result.category !== "resource" && result.level > 0}
      <span class="text-xs text-muted-foreground shrink-0"
        >Lv.{result.level}</span
      >
    {/if}
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
