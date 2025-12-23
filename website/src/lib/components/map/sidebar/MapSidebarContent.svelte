<script lang="ts">
  import Sword from "@lucide/svelte/icons/sword";
  import Shield from "@lucide/svelte/icons/shield";
  import Crown from "@lucide/svelte/icons/crown";
  import Users from "@lucide/svelte/icons/users";
  import CircleDot from "@lucide/svelte/icons/circle-dot";
  import Box from "@lucide/svelte/icons/box";
  import Flame from "@lucide/svelte/icons/flame";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Hammer from "@lucide/svelte/icons/hammer";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Search from "@lucide/svelte/icons/search";
  import MousePointerClick from "@lucide/svelte/icons/mouse-pointer-click";
  import MapSidebarSection from "./MapSidebarSection.svelte";
  import LevelFilter from "../LevelFilter.svelte";
  import type {
    LayerVisibility,
    LevelFilter as LevelFilterType,
    LevelRanges,
  } from "$lib/types/map";
  import { LAYER_COLORS, ZONE_COLORS } from "$lib/map/config";
  import { toggleLayerVisibility } from "$lib/map/visibility";

  interface Props {
    visibility: LayerVisibility;
    onVisibilityChange: (visibility: LayerVisibility) => void;
    levelFilter: LevelFilterType;
    onLevelFilterChange: (filter: LevelFilterType) => void;
    levelRanges: LevelRanges;
    onSearchClick?: () => void;
    /** Persisted expanded sections */
    expandedSections?: string[];
    onExpandedSectionsChange?: (sections: string[]) => void;
  }

  let {
    visibility,
    onVisibilityChange,
    levelFilter,
    onLevelFilterChange,
    levelRanges,
    onSearchClick,
    expandedSections = ["entities", "interactables", "gathering", "filters"],
    onExpandedSectionsChange,
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
    onVisibilityChange(toggleLayerVisibility(visibility, key));
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
    icon: typeof Sword;
  }

  const entityLayers: LayerOption[] = [
    { key: "bosses", label: "Bosses", color: LAYER_COLORS.boss, icon: Crown },
    { key: "elites", label: "Elites", color: LAYER_COLORS.elite, icon: Shield },
    {
      key: "monsters",
      label: "Monsters",
      color: LAYER_COLORS.monster,
      icon: Sword,
    },
    { key: "npcs", label: "NPCs", color: LAYER_COLORS.npc, icon: Users },
  ];

  const interactableLayers: LayerOption[] = [
    { key: "altars", label: "Altars", color: LAYER_COLORS.altar, icon: Flame },
    {
      key: "portals",
      label: "Portals",
      color: LAYER_COLORS.portal,
      icon: CircleDot,
    },
    { key: "chests", label: "Chests", color: LAYER_COLORS.chest, icon: Box },
    {
      key: "crafting",
      label: "Crafting Stations",
      color: LAYER_COLORS.crafting,
      icon: Hammer,
    },
  ];

  const gatheringLayers: LayerOption[] = [
    {
      key: "gatheringPlants",
      label: "Plants",
      color: LAYER_COLORS.gathering_plant,
      icon: Leaf,
    },
    {
      key: "gatheringMinerals",
      label: "Minerals",
      color: LAYER_COLORS.gathering_mineral,
      icon: Pickaxe,
    },
    {
      key: "gatheringSparks",
      label: "Radiant Sparks",
      color: LAYER_COLORS.gathering_spark,
      icon: Sparkles,
    },
  ];

  const zoneLayers: LayerOption[] = [
    {
      key: "parentZones",
      label: "Zones",
      color: ZONE_COLORS.parentZone.stroke,
      icon: MapPin,
    },
    {
      key: "subZones",
      label: "Areas",
      color: ZONE_COLORS.subZone.stroke,
      icon: MapPin,
    },
  ];

  function isSectionExpanded(section: string): boolean {
    return expandedSections.includes(section);
  }

  function handleSectionToggle(section: string, expanded: boolean) {
    const newSections = expanded
      ? [...expandedSections, section]
      : expandedSections.filter((s) => s !== section);
    onExpandedSectionsChange?.(newSections);
  }
</script>

{#snippet layerToggle(layer: LayerOption)}
  <label
    class="flex cursor-pointer items-center gap-2 py-1 text-sm hover:bg-muted/30 rounded px-1 -mx-1 transition-colors"
  >
    <input
      type="checkbox"
      checked={visibility[layer.key]}
      onchange={() => toggle(layer.key)}
      class="h-4 w-4 rounded border-border accent-primary"
    />
    <span
      class="h-3 w-3 rounded-full shrink-0"
      style="background-color: {rgbToColor(layer.color)}"
    ></span>
    <span class="text-muted-foreground">{layer.label}</span>
  </label>
{/snippet}

<div class="flex flex-col">
  <!-- Search trigger -->
  {#if onSearchClick}
    <button
      type="button"
      class="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 border-b border-border transition-colors"
      onclick={onSearchClick}
    >
      <Search class="h-4 w-4" />
      <span>Search map...</span>
      <kbd class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
        {navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  {/if}

  <!-- Entities section -->
  <MapSidebarSection
    title="Entities"
    icon={Sword}
    expanded={isSectionExpanded("entities")}
    onExpandedChange={(expanded) => handleSectionToggle("entities", expanded)}
  >
    <div class="space-y-0.5">
      {#each entityLayers as layer (layer.key)}
        {@render layerToggle(layer)}
      {/each}
    </div>
  </MapSidebarSection>

  <!-- Interactables section -->
  <MapSidebarSection
    title="Interactables"
    icon={MousePointerClick}
    expanded={isSectionExpanded("interactables")}
    onExpandedChange={(expanded) =>
      handleSectionToggle("interactables", expanded)}
  >
    <div class="space-y-0.5">
      {#each interactableLayers as layer (layer.key)}
        {@render layerToggle(layer)}
      {/each}
    </div>
  </MapSidebarSection>

  <!-- Resources section -->
  <MapSidebarSection
    title="Resources"
    icon={Leaf}
    expanded={isSectionExpanded("gathering")}
    onExpandedChange={(expanded) => handleSectionToggle("gathering", expanded)}
  >
    <div class="space-y-0.5">
      {#each gatheringLayers as layer (layer.key)}
        {@render layerToggle(layer)}
      {/each}
    </div>
  </MapSidebarSection>

  <!-- Zones section -->
  <MapSidebarSection
    title="Zones"
    icon={MapPin}
    expanded={isSectionExpanded("zones")}
    onExpandedChange={(expanded) => handleSectionToggle("zones", expanded)}
  >
    <div class="space-y-0.5">
      {#each zoneLayers as layer (layer.key)}
        {@render layerToggle(layer)}
      {/each}
    </div>
  </MapSidebarSection>

  <!-- Level Filters section -->
  <MapSidebarSection
    title="Level Filters"
    icon={Sparkles}
    expanded={isSectionExpanded("filters")}
    onExpandedChange={(expanded) => handleSectionToggle("filters", expanded)}
  >
    <div class="space-y-4">
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
  </MapSidebarSection>
</div>
