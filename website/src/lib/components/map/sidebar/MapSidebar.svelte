<script lang="ts" module>
  export const SIDEBAR_WIDTH_EXPANDED = 280;
  export const SIDEBAR_WIDTH_COLLAPSED = 56;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import Home from "@lucide/svelte/icons/home";
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
  import Menu from "@lucide/svelte/icons/menu";
  import Search from "@lucide/svelte/icons/search";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import * as Drawer from "$lib/components/ui/drawer";
  import { Button } from "$lib/components/ui/button";
  import MapSidebarContent from "./MapSidebarContent.svelte";
  import type {
    LayerVisibility,
    LevelFilter,
    LevelRanges,
    ZoneListItem,
  } from "$lib/types/map";
  import { LAYER_COLORS } from "$lib/map/config";
  import {
    toggleLayerVisibility,
    isAnyNpcTypeVisible,
    isAnyCraftingTypeVisible,
    toggleAllNpcTypes,
    toggleAllCraftingTypes,
  } from "$lib/map/visibility";

  interface Props {
    visibility: LayerVisibility;
    onVisibilityChange: (visibility: LayerVisibility) => void;
    levelFilter: LevelFilter;
    onLevelFilterChange: (filter: LevelFilter) => void;
    levelRanges: LevelRanges;
    onSearchClick: () => void;
    /** Zone list for zone focus dropdown */
    zones?: ZoneListItem[];
    /** Currently focused zone ID */
    focusedZoneId?: string | null;
    /** Callback when zone focus changes */
    onZoneFocusChange?: (zoneId: string | null) => void;
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
    zones = [],
    focusedZoneId = null,
    onZoneFocusChange,
    sidebarWidth = $bindable(SIDEBAR_WIDTH_EXPANDED),
  }: Props = $props();

  // State initialized once on mount
  let isCollapsed = $state(false);
  let expandedSections = $state<string[]>([
    "monsters",
    "npcs",
    "interactables",
    "crafting",
    "gathering",
    "filters",
  ]);
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
    key: keyof LayerVisibility | "allNpcs" | "allCrafting";
    icon: typeof Sword;
    color:
      | readonly [number, number, number]
      | readonly [number, number, number, number];
    label: string;
  }

  const monsterToggles: QuickToggle[] = [
    { key: "bosses", icon: Crown, color: LAYER_COLORS.boss, label: "Bosses" },
    { key: "elites", icon: Shield, color: LAYER_COLORS.elite, label: "Elites" },
    {
      key: "creatures",
      icon: Sword,
      color: LAYER_COLORS.monster,
      label: "Creatures",
    },
    { key: "hunts", icon: Crosshair, color: LAYER_COLORS.hunt, label: "Hunts" },
  ];

  const npcToggle: QuickToggle = {
    key: "allNpcs",
    icon: Users,
    color: LAYER_COLORS.npc,
    label: "All NPCs",
  };

  const interactableToggles: QuickToggle[] = [
    { key: "altars", icon: Flame, color: LAYER_COLORS.altar, label: "Altars" },
    {
      key: "portals",
      icon: CircleDot,
      color: LAYER_COLORS.portal,
      label: "Portals",
    },
    { key: "chests", icon: Box, color: LAYER_COLORS.chest, label: "Chests" },
  ];

  const craftingToggle: QuickToggle = {
    key: "allCrafting",
    icon: Hammer,
    color: LAYER_COLORS.crafting,
    label: "Crafting Stations",
  };

  const resourceToggles: QuickToggle[] = [
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
      label: "Radiant Sparks",
    },
  ];

  function toggleLayer(key: QuickToggle["key"]) {
    if (key === "allNpcs") {
      onVisibilityChange(toggleAllNpcTypes(visibility));
    } else if (key === "allCrafting") {
      onVisibilityChange(toggleAllCraftingTypes(visibility));
    } else {
      onVisibilityChange(toggleLayerVisibility(visibility, key));
    }
  }

  function isToggleActive(key: QuickToggle["key"]): boolean {
    if (key === "allNpcs") {
      return isAnyNpcTypeVisible(visibility);
    } else if (key === "allCrafting") {
      return isAnyCraftingTypeVisible(visibility);
    }
    return visibility[key];
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
  <!-- Mobile: Home button (top-left) -->
  <a
    href="/"
    class="fixed top-4 left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg hover:bg-secondary/80 transition-colors md:hidden"
    aria-label="Home"
  >
    <Home class="h-5 w-5" />
  </a>

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
          {zones}
          {focusedZoneId}
          {onZoneFocusChange}
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
        <a
          href="/"
          class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Home class="h-4 w-4" />
          <span class="text-sm font-medium">Home</span>
        </a>
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
      <!-- Collapsed: Home, Search + Quick toggle icon strip -->
      <div class="flex flex-col items-center gap-1 py-2 overflow-y-auto">
        <!-- Home button at top -->
        <a
          href="/"
          class="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Home"
          title="Home"
        >
          <Home class="h-5 w-5" />
        </a>
        <div class="w-8 border-t border-border my-1"></div>
        <!-- Search button -->
        <button
          type="button"
          class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground mb-1"
          onclick={onSearchClick}
          title="Search (Cmd+K)"
        >
          <Search class="h-5 w-5" />
        </button>
        <div class="w-8 border-t border-border mb-1"></div>

        <!-- Monster toggles -->
        {#each monsterToggles as toggle (toggle.key)}
          {@const Icon = toggle.icon}
          {@const isActive = isToggleActive(toggle.key)}
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

        <div class="w-8 border-t border-border my-1"></div>

        <!-- NPCs (toggles all) -->
        {#if true}
          {@const npcActive = isToggleActive(npcToggle.key)}
          <button
            type="button"
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors {npcActive
              ? 'bg-muted'
              : 'hover:bg-muted/50 opacity-50'}"
            style={npcActive
              ? `color: ${rgbToColor(npcToggle.color)}`
              : undefined}
            onclick={() => toggleLayer(npcToggle.key)}
            title="{npcToggle.label} ({npcActive ? 'on' : 'off'})"
          >
            <Users class="h-5 w-5" />
          </button>
        {/if}

        <div class="w-8 border-t border-border my-1"></div>

        <!-- Interactable toggles -->
        {#each interactableToggles as toggle (toggle.key)}
          {@const Icon = toggle.icon}
          {@const isActive = isToggleActive(toggle.key)}
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

        <div class="w-8 border-t border-border my-1"></div>

        <!-- Crafting Stations (toggles all) -->
        {#if true}
          {@const craftingActive = isToggleActive(craftingToggle.key)}
          <button
            type="button"
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors {craftingActive
              ? 'bg-muted'
              : 'hover:bg-muted/50 opacity-50'}"
            style={craftingActive
              ? `color: ${rgbToColor(craftingToggle.color)}`
              : undefined}
            onclick={() => toggleLayer(craftingToggle.key)}
            title="{craftingToggle.label} ({craftingActive ? 'on' : 'off'})"
          >
            <Hammer class="h-5 w-5" />
          </button>
        {/if}

        <div class="w-8 border-t border-border my-1"></div>

        <!-- Resource toggles -->
        {#each resourceToggles as toggle (toggle.key)}
          {@const Icon = toggle.icon}
          {@const isActive = isToggleActive(toggle.key)}
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
          {zones}
          {focusedZoneId}
          {onZoneFocusChange}
          {expandedSections}
          onExpandedSectionsChange={handleExpandedSectionsChange}
        />
      </div>
    {/if}
  </aside>
{/if}
