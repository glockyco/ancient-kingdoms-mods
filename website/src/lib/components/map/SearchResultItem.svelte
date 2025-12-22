<script lang="ts">
  import type { MapSearchResult } from "$lib/queries/map-search";
  import Skull from "@lucide/svelte/icons/skull";
  import User from "@lucide/svelte/icons/user";
  import MapIcon from "@lucide/svelte/icons/map";
  import Flower2 from "@lucide/svelte/icons/flower-2";
  import Package from "@lucide/svelte/icons/package";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import MapPinOff from "@lucide/svelte/icons/map-pin-off";
  import type { Component } from "svelte";

  interface Props {
    result: MapSearchResult;
  }
  let { result }: Props = $props();

  const icons: Record<MapSearchResult["category"], Component> = {
    monster: Skull,
    npc: User,
    zone: MapIcon,
    resource: Flower2,
    chest: Package,
    altar: Sparkles,
  };

  let Icon = $derived(icons[result.category]);
</script>

<div class="flex items-center gap-3 w-full">
  <Icon class="h-4 w-4 text-muted-foreground shrink-0" />
  <div class="flex-1 min-w-0">
    <div class="font-medium truncate">{result.name}</div>
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
