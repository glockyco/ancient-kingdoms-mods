<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import LevelFilter from "./LevelFilter.svelte";
  import type {
    LayerVisibility,
    LevelFilter as LevelFilterType,
    LevelRanges,
  } from "$lib/types/map";
  import { LAYER_COLORS, ZONE_COLORS, ARC_COLORS } from "$lib/map/config";

  interface Props {
    visibility: LayerVisibility;
    onVisibilityChange: (visibility: LayerVisibility) => void;
    levelFilter: LevelFilterType;
    onLevelFilterChange: (filter: LevelFilterType) => void;
    levelRanges: LevelRanges;
  }

  let {
    visibility,
    onVisibilityChange,
    levelFilter,
    onLevelFilterChange,
    levelRanges,
  }: Props = $props();

  function handleMonsterLevelChange(value: [number, number]) {
    onLevelFilterChange({
      ...levelFilter,
      monsterMin: value[0],
      monsterMax: value[1],
    });
  }

  function handleGatheringLevelChange(value: [number, number]) {
    onLevelFilterChange({
      ...levelFilter,
      gatheringMin: value[0],
      gatheringMax: value[1],
    });
  }

  function toggle(key: keyof LayerVisibility) {
    onVisibilityChange({
      ...visibility,
      [key]: !visibility[key],
    });
  }

  function rgbToColor(
    color:
      | readonly [number, number, number]
      | readonly [number, number, number, number],
  ): string {
    if (color.length === 4) {
      return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
    }
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  interface LayerOption {
    key: keyof LayerVisibility;
    label: string;
    color:
      | readonly [number, number, number]
      | readonly [number, number, number, number];
  }

  const entityLayers: LayerOption[] = [
    { key: "monsters", label: "Monsters", color: LAYER_COLORS.monster },
    { key: "elites", label: "Elites", color: LAYER_COLORS.elite },
    { key: "bosses", label: "Bosses", color: LAYER_COLORS.boss },
    { key: "npcs", label: "NPCs", color: LAYER_COLORS.npc },
    { key: "portals", label: "Portals", color: LAYER_COLORS.portal },
    {
      key: "portalArcs",
      label: "Portal Arcs",
      color: ARC_COLORS.portal.source,
    },
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

  const zoneLayers: LayerOption[] = [
    { key: "subZones", label: "Sub-zones", color: ZONE_COLORS.subZone.stroke },
    {
      key: "parentZones",
      label: "Parent Zones",
      color: ZONE_COLORS.parentZone.stroke,
    },
  ];
</script>

<Card.Root
  class="absolute left-4 top-4 z-10 w-48 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  <Card.Header class="pb-2">
    <Card.Title class="text-sm font-medium">Map Layers</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-1 pb-3">
    {#each entityLayers as layer (layer.key)}
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={visibility[layer.key]}
          onchange={() => toggle(layer.key)}
          class="h-4 w-4 rounded border-border"
        />
        <span
          class="h-3 w-3 rounded-full"
          style="background-color: {rgbToColor(layer.color)}"
        ></span>
        <span class="text-muted-foreground">{layer.label}</span>
      </label>
    {/each}

    <div class="border-t border-border pt-3 mt-3">
      <p class="text-xs text-muted-foreground mb-2">Zone Boundaries</p>
      {#each zoneLayers as layer (layer.key)}
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visibility[layer.key]}
            onchange={() => toggle(layer.key)}
            class="h-4 w-4 rounded border-border"
          />
          <span
            class="h-3 w-3 rounded-sm border"
            style="background-color: {rgbToColor(
              layer.color,
            )}; border-color: {rgbToColor(layer.color)}"
          ></span>
          <span class="text-muted-foreground">{layer.label}</span>
        </label>
      {/each}
    </div>

    <div class="border-t border-border pt-3 mt-3 space-y-3">
      <LevelFilter
        label="Monster Level"
        min={levelRanges.monsterMin}
        max={levelRanges.monsterMax}
        value={[levelFilter.monsterMin, levelFilter.monsterMax]}
        onchange={handleMonsterLevelChange}
      />
      <LevelFilter
        label="Gathering Tier"
        min={levelRanges.gatheringMin}
        max={levelRanges.gatheringMax}
        value={[levelFilter.gatheringMin, levelFilter.gatheringMax]}
        onchange={handleGatheringLevelChange}
      />
    </div>
  </Card.Content>
</Card.Root>
