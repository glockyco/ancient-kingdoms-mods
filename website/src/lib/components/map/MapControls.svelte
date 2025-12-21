<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import type { LayerVisibility } from "$lib/types/map";
  import { LAYER_COLORS } from "$lib/map/config";

  interface Props {
    visibility: LayerVisibility;
    onVisibilityChange: (visibility: LayerVisibility) => void;
  }

  let { visibility, onVisibilityChange }: Props = $props();

  function toggle(key: keyof LayerVisibility) {
    onVisibilityChange({
      ...visibility,
      [key]: !visibility[key],
    });
  }

  function rgbToHex([r, g, b]: readonly [number, number, number]): string {
    return `rgb(${r}, ${g}, ${b})`;
  }

  interface LayerOption {
    key: keyof LayerVisibility;
    label: string;
    color: readonly [number, number, number];
  }

  const layers: LayerOption[] = [
    { key: "monsters", label: "Monsters", color: LAYER_COLORS.monster },
    { key: "elites", label: "Elites", color: LAYER_COLORS.elite },
    { key: "bosses", label: "Bosses", color: LAYER_COLORS.boss },
    { key: "npcs", label: "NPCs", color: LAYER_COLORS.npc },
    { key: "portals", label: "Portals", color: LAYER_COLORS.portal },
    { key: "chests", label: "Chests", color: LAYER_COLORS.chest },
    { key: "altars", label: "Altars", color: LAYER_COLORS.altar },
    {
      key: "gatheringPlants",
      label: "Plants",
      color: LAYER_COLORS.gathering_plant,
    },
    {
      key: "gatheringMinerals",
      label: "Minerals",
      color: LAYER_COLORS.gathering_mineral,
    },
    {
      key: "gatheringSparks",
      label: "Sparks",
      color: LAYER_COLORS.gathering_spark,
    },
    { key: "crafting", label: "Crafting", color: LAYER_COLORS.crafting },
  ];
</script>

<Card.Root
  class="absolute left-4 top-4 z-10 w-48 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  <Card.Header class="pb-2">
    <Card.Title class="text-sm font-medium">Map Layers</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-1 pb-3">
    {#each layers as layer (layer.key)}
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={visibility[layer.key]}
          onchange={() => toggle(layer.key)}
          class="h-4 w-4 rounded border-border"
        />
        <span
          class="h-3 w-3 rounded-full"
          style="background-color: {rgbToHex(layer.color)}"
        ></span>
        <span class="text-muted-foreground">{layer.label}</span>
      </label>
    {/each}
  </Card.Content>
</Card.Root>
