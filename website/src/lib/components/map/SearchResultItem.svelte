<script lang="ts">
  import type { EntityId } from "$lib/entities/registry";
  import { entityRegistry } from "$lib/entities/registry";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import { getQualityTextColorClass, toRomanNumeral } from "$lib/utils/format";
  import {
    getActiveRoles,
    normalizeRoles,
    type RoleCategory,
  } from "$lib/utils/roles";
  import type { Component } from "svelte";
  import type { IconNode } from "lucide";
  import {
    Sword as SwordIcon,
    Shield as ShieldIcon,
    Crown as CrownIcon,
    Star as StarIcon,
    Crosshair as CrosshairIcon,
    Leaf as LeafIcon,
    Pickaxe as PickaxeIcon,
    Sparkles as SparklesIcon,
    Package as PackageIcon,
  } from "lucide";
  import MapPinOff from "@lucide/svelte/icons/map-pin-off";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Shield from "@lucide/svelte/icons/shield";
  import ShoppingBag from "@lucide/svelte/icons/shopping-bag";
  import Wrench from "@lucide/svelte/icons/wrench";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Compass from "@lucide/svelte/icons/compass";
  import type {
    MapSearchCategory,
    MapSearchResult,
  } from "$lib/queries/map-search";

  interface Props {
    result: MapSearchResult;
  }
  let { result }: Props = $props();

  const CATEGORY_ENTITY: Record<MapSearchCategory, EntityId> = {
    monster: "monster",
    npc: "npc",
    zone: "zone",
    resource: "gathering_resource",
    chest: "chest",
    treasure: "treasure",
    altar: "altar",
    house: "house",
    trap: "trap",
    crafting: "crafting_station",
    portal: "portal",
    item: "item",
    quest: "quest",
  };

  const categoryColors: Record<RoleCategory, string> = {
    quest: "text-orange-500",
    merchant: "text-green-500",
    service: "text-blue-500",
    special: "text-purple-500",
    combat: "text-red-500",
    renewal: "text-teal-500",
    travel: "text-cyan-500",
  };

  const categoryIcons: Record<RoleCategory, Component> = {
    quest: Scroll,
    merchant: ShoppingBag,
    service: Wrench,
    special: Sparkles,
    combat: Shield,
    renewal: RefreshCw,
    travel: Compass,
  };

  const entity = $derived(entityRegistry[CATEGORY_ENTITY[result.category]]);
  const fallbackIcon = $derived.by((): IconNode => {
    if (result.category === "monster") {
      if (result.subcategory === "fabled") return StarIcon;
      if (result.subcategory === "boss") return CrownIcon;
      if (result.subcategory === "elite") return ShieldIcon;
      if (result.subcategory === "hunt") return CrosshairIcon;
      return SwordIcon;
    }
    if (result.category === "resource") {
      if (result.keywords?.includes("plant")) return LeafIcon;
      if (result.keywords?.includes("mineral")) return PickaxeIcon;
      if (result.keywords?.includes("spark")) return SparklesIcon;
      return PackageIcon;
    }
    return entity.icon;
  });

  const roleCategories = $derived.by(() => {
    if (result.category !== "npc" || !result.roles) return [] as RoleCategory[];
    const activeRoles = getActiveRoles(normalizeRoles(result.roles));
    return Array.from(
      new Set(activeRoles.map((role) => role.category)),
    ) as RoleCategory[];
  });

  const itemColorClass = $derived(
    result.category === "item" && result.quality != null
      ? getQualityTextColorClass(result.quality)
      : "",
  );
  const displayName = $derived(
    result.category === "crafting" && result.subcategory
      ? result.subcategory === "alchemy"
        ? "Alchemy Table"
        : result.subcategory === "cooking"
          ? "Cooking Oven"
          : result.subcategory === "scribing"
            ? "Scribing Table"
            : "Forge"
      : result.name,
  );
  const isResourceTier = $derived(
    result.category === "resource" &&
      (result.keywords?.includes("plant") ||
        result.keywords?.includes("mineral")),
  );
</script>

<div class="flex w-full items-center gap-3">
  <EntityIcon src={result.image} alt="" {fallbackIcon} size={28} />
  <div class="min-w-0 flex-1">
    <div class="truncate font-medium {itemColorClass}">{displayName}</div>
    {#if result.renewalDungeonName}
      <div class="truncate text-xs text-muted-foreground">
        Resets {result.renewalDungeonName}
      </div>
    {:else if result.zoneName && result.category !== "zone" && !result.spawnCount}
      <div class="truncate text-xs text-muted-foreground">
        {result.zoneName}
      </div>
    {/if}
  </div>
  {#if roleCategories.length > 0}
    <div class="flex shrink-0 gap-1">
      {#each roleCategories as category (category)}
        {@const RoleIcon = categoryIcons[category]}
        <RoleIcon class={categoryColors[category]} size={14} />
      {/each}
    </div>
  {/if}
  {#if result.spawnCount}
    <span class="shrink-0 text-xs text-muted-foreground"
      >{result.spawnCount} spawns</span
    >
  {/if}
  {#if result.level != null}
    {#if isResourceTier}
      <span class="shrink-0 text-xs text-muted-foreground"
        >Tier {toRomanNumeral(result.level)}</span
      >
    {:else if result.category !== "resource" && result.level > 0}
      <span class="shrink-0 text-xs text-muted-foreground"
        >Lv {result.level}</span
      >
    {/if}
  {/if}
  {#if !result.bounds}
    <span
      class="flex shrink-0 items-center gap-1 text-xs italic text-muted-foreground"
    >
      <MapPinOff class="size-3" />
      <span class="hidden sm:inline">No location</span>
    </span>
  {/if}
</div>
