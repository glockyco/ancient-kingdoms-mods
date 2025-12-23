<script lang="ts" module>
  export const SIDEBAR_WIDTH_EXPANDED = 280;
  export const SIDEBAR_WIDTH_COLLAPSED = 56;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import PanelLeftClose from "@lucide/svelte/icons/panel-left-close";
  import PanelLeftOpen from "@lucide/svelte/icons/panel-left-open";
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
  import Menu from "@lucide/svelte/icons/menu";
  import Search from "@lucide/svelte/icons/search";
  import * as Drawer from "$lib/components/ui/drawer";
  import { Button } from "$lib/components/ui/button";
  import MapSidebarContent from "./MapSidebarContent.svelte";
  import type {
    LayerVisibility,
    LevelFilter,
    LevelRanges,
  } from "$lib/types/map";
  import { LAYER_COLORS, ZONE_COLORS } from "$lib/map/config";
  import { toggleLayerVisibility } from "$lib/map/visibility";

  interface Props {
    visibility: LayerVisibility;
    onVisibilityChange: (visibility: LayerVisibility) => void;
    levelFilter: LevelFilter;
    onLevelFilterChange: (filter: LevelFilter) => void;
    levelRanges: LevelRanges;
    onSearchClick: () => void;
    /** Bindable: current sidebar width in pixels (0 on mobile) */
    sidebarWidth?: number;
  }

  let {
    visibility,
    onVisibilityChange,
    levelFilter,
    onLevelFilterChange,
    levelRanges,
    onSearchClick,
    sidebarWidth = $bindable(SIDEBAR_WIDTH_EXPANDED),
  }: Props = $props();

  // State initialized once on mount
  let isCollapsed = $state(false);
  let expandedSections = $state<string[]>(["entities", "gathering", "filters"]);
  let drawerOpen = $state(false);
  let initialized = $state(false);

  onMount(() => {
    // Load persisted state
    const savedCollapsed = localStorage.getItem("map-sidebar-collapsed");
    if (savedCollapsed !== null) {
      isCollapsed = savedCollapsed === "true";
    }

    const savedSections = localStorage.getItem("map-sidebar-sections");
    if (savedSections) {
      try {
        expandedSections = JSON.parse(savedSections);
      } catch {
        // Invalid JSON, keep defaults
      }
    }

    updateSidebarWidth();
    initialized = true;
  });

  function updateSidebarWidth() {
    sidebarWidth = isCollapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED;
  }

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
    localStorage.setItem("map-sidebar-collapsed", String(isCollapsed));
    updateSidebarWidth();
  }

  function handleExpandedSectionsChange(sections: string[]) {
    expandedSections = sections;
    localStorage.setItem("map-sidebar-sections", JSON.stringify(sections));
  }

  // Quick toggle icons for collapsed state
  interface QuickToggle {
    key: keyof LayerVisibility;
    icon: typeof Sword;
    color:
      | readonly [number, number, number]
      | readonly [number, number, number, number];
    label: string;
  }

  const quickToggles: QuickToggle[] = [
    {
      key: "monsters",
      icon: Sword,
      color: LAYER_COLORS.monster,
      label: "Monsters",
    },
    { key: "elites", icon: Shield, color: LAYER_COLORS.elite, label: "Elites" },
    { key: "bosses", icon: Crown, color: LAYER_COLORS.boss, label: "Bosses" },
    { key: "npcs", icon: Users, color: LAYER_COLORS.npc, label: "NPCs" },
    {
      key: "portals",
      icon: CircleDot,
      color: LAYER_COLORS.portal,
      label: "Portals",
    },
    { key: "chests", icon: Box, color: LAYER_COLORS.chest, label: "Chests" },
    { key: "altars", icon: Flame, color: LAYER_COLORS.altar, label: "Altars" },
    {
      key: "gatheringPlants",
      icon: Leaf,
      color: LAYER_COLORS.gathering_plant,
      label: "Plants",
    },
    {
      key: "gatheringMinerals",
      icon: Pickaxe,
      color: LAYER_COLORS.gathering_mineral,
      label: "Minerals",
    },
    {
      key: "gatheringSparks",
      icon: Sparkles,
      color: LAYER_COLORS.gathering_spark,
      label: "Sparks",
    },
    {
      key: "crafting",
      icon: Hammer,
      color: LAYER_COLORS.crafting,
      label: "Crafting",
    },
    {
      key: "subZones",
      icon: MapPin,
      color: ZONE_COLORS.subZone.stroke,
      label: "Zones",
    },
  ];

  function toggleLayer(key: keyof LayerVisibility) {
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

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      toggleCollapsed();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if initialized}
  <!-- Mobile: Floating buttons (hidden on md+) -->
  <div class="fixed bottom-4 left-4 z-20 flex gap-2 md:hidden">
    <Button
      variant="secondary"
      size="icon"
      class="h-12 w-12 cursor-pointer rounded-full shadow-lg"
      onclick={onSearchClick}
    >
      <Search class="h-5 w-5" />
      <span class="sr-only">Search map</span>
    </Button>
    <Button
      variant="secondary"
      size="icon"
      class="h-12 w-12 cursor-pointer rounded-full shadow-lg"
      onclick={() => (drawerOpen = true)}
    >
      <Menu class="h-5 w-5" />
      <span class="sr-only">Open map controls</span>
    </Button>
  </div>

  <Drawer.Root bind:open={drawerOpen}>
    <Drawer.Content class="max-h-[85vh] md:hidden">
      <Drawer.Header>
        <Drawer.Title>Map Controls</Drawer.Title>
      </Drawer.Header>
      <div class="overflow-y-auto">
        <MapSidebarContent
          {visibility}
          {onVisibilityChange}
          {levelFilter}
          {onLevelFilterChange}
          {levelRanges}
          onSearchClick={() => {
            drawerOpen = false;
            onSearchClick();
          }}
          {expandedSections}
          onExpandedSectionsChange={handleExpandedSectionsChange}
        />
      </div>
    </Drawer.Content>
  </Drawer.Root>

  <!-- Desktop: Collapsible left sidebar (hidden on mobile) -->
  <aside
    aria-label="Map controls"
    class="fixed left-0 top-0 z-20 hidden h-full flex-col border-r border-border bg-background md:flex"
    style="width: {isCollapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED}px"
  >
    <!-- Header with collapse toggle -->
    <div
      class="flex h-14 items-center justify-between border-b border-border px-3"
    >
      {#if !isCollapsed}
        <span class="text-sm font-semibold">Map Layers</span>
      {/if}
      <button
        type="button"
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted transition-colors {isCollapsed
          ? 'mx-auto'
          : ''}"
        onclick={toggleCollapsed}
        title={isCollapsed
          ? "Expand sidebar (Cmd+B)"
          : "Collapse sidebar (Cmd+B)"}
      >
        {#if isCollapsed}
          <PanelLeftOpen class="h-4 w-4" />
        {:else}
          <PanelLeftClose class="h-4 w-4" />
        {/if}
      </button>
    </div>

    {#if isCollapsed}
      <!-- Collapsed: Search button + Quick toggle icon strip -->
      <div class="flex flex-col items-center gap-1 py-2 overflow-y-auto">
        <!-- Search button always at top -->
        <button
          type="button"
          class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground mb-1"
          onclick={onSearchClick}
          title="Search (⌘K)"
        >
          <Search class="h-5 w-5" />
        </button>
        <div class="w-8 border-t border-border mb-1"></div>
        {#each quickToggles as toggle (toggle.key)}
          {@const Icon = toggle.icon}
          {@const isActive = visibility[toggle.key]}
          <button
            type="button"
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors {isActive
              ? 'bg-muted'
              : 'hover:bg-muted/50 opacity-50'}"
            style={isActive ? `color: ${rgbToColor(toggle.color)}` : undefined}
            onclick={() => toggleLayer(toggle.key)}
            title="{toggle.label} ({isActive ? 'on' : 'off'})"
          >
            <Icon class="h-5 w-5" />
          </button>
        {/each}
      </div>
    {:else}
      <!-- Expanded: Full content -->
      <div class="flex-1 overflow-y-auto">
        <MapSidebarContent
          {visibility}
          {onVisibilityChange}
          {levelFilter}
          {onLevelFilterChange}
          {levelRanges}
          {onSearchClick}
          {expandedSections}
          onExpandedSectionsChange={handleExpandedSectionsChange}
        />
      </div>
    {/if}
  </aside>
{/if}
