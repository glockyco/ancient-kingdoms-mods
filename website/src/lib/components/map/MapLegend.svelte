<script lang="ts">
  import { LAYER_COLORS } from "$lib/map/config";

  function rgbToHex([r, g, b]: readonly [number, number, number]): string {
    return `rgb(${r}, ${g}, ${b})`;
  }

  const legendItems = [
    { label: "Monster", color: LAYER_COLORS.monster },
    { label: "Elite", color: LAYER_COLORS.elite },
    { label: "Boss", color: LAYER_COLORS.boss },
    { label: "NPC", color: LAYER_COLORS.npc },
    { label: "Portal", color: LAYER_COLORS.portal },
    { label: "Chest", color: LAYER_COLORS.chest },
    { label: "Altar", color: LAYER_COLORS.altar },
    { label: "Plant", color: LAYER_COLORS.gathering_plant },
    { label: "Mineral", color: LAYER_COLORS.gathering_mineral },
    { label: "Spark", color: LAYER_COLORS.gathering_spark },
    { label: "Crafting", color: LAYER_COLORS.crafting },
  ];
</script>

<div
  class="absolute bottom-4 left-4 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border bg-background/95 px-3 py-2 text-xs backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  {#each legendItems as item (item.label)}
    <div class="flex items-center gap-1">
      <span
        class="h-2 w-2 rounded-full"
        style="background-color: {rgbToHex(item.color)}"
      ></span>
      <span class="text-muted-foreground">{item.label}</span>
    </div>
  {/each}
</div>
