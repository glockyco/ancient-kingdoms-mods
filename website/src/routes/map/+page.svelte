<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import MapControls from "$lib/components/map/MapControls.svelte";
  import MapLegend from "$lib/components/map/MapLegend.svelte";
  import MapTooltip from "$lib/components/map/MapTooltip.svelte";
  import EntityPopup from "$lib/components/map/EntityPopup.svelte";
  import { loadAllMapEntities } from "$lib/queries/map";
  import { createLayers } from "$lib/map/layers";
  import { INITIAL_VIEW_STATE } from "$lib/map/config";
  import type {
    LayerVisibility,
    MapEntityData,
    AnyMapEntity,
  } from "$lib/types/map";

  let container: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deckInstance: any = null;
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);
  let entityData = $state<MapEntityData | null>(null);

  // Hover state
  let hoveredEntity = $state<AnyMapEntity | null>(null);
  let hoverX = $state(0);
  let hoverY = $state(0);

  // Selected entity
  let selectedEntity = $state<AnyMapEntity | null>(null);

  // Layer visibility
  let layerVisibility = $state<LayerVisibility>({
    monsters: true,
    bosses: true,
    elites: true,
    npcs: true,
    portals: true,
    chests: true,
    altars: true,
    gatheringPlants: true,
    gatheringMinerals: true,
    gatheringSparks: true,
    crafting: true,
  });

  // deck.gl modules (loaded dynamically)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deckModules: any = null;

  function handleVisibilityChange(newVisibility: LayerVisibility) {
    layerVisibility = newVisibility;
    updateLayers();
  }

  function updateLayers() {
    if (!deckInstance || !entityData || !deckModules) return;

    const layers = createLayers(entityData, layerVisibility, deckModules, {
      onHover: handleHover,
      onClick: handleClick,
    });

    deckInstance.setProps({ layers });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleHover(info: any) {
    if (info.object) {
      hoveredEntity = info.object as AnyMapEntity;
      hoverX = info.x;
      hoverY = info.y;
    } else {
      hoveredEntity = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(info: any) {
    if (info.object) {
      selectedEntity = info.object as AnyMapEntity;
    }
  }

  function handleClosePopup() {
    selectedEntity = null;
  }

  onMount(async () => {
    if (!browser) return;

    try {
      // Dynamic imports for deck.gl
      const [deckCore, deckLayers] = await Promise.all([
        import("@deck.gl/core"),
        import("@deck.gl/layers"),
      ]);

      const { Deck, OrthographicView } = deckCore;
      const { ScatterplotLayer, PolygonLayer } = deckLayers;

      deckModules = { ScatterplotLayer, PolygonLayer };

      // Load entity data
      entityData = await loadAllMapEntities();

      // Create layers
      const layers = createLayers(entityData, layerVisibility, deckModules, {
        onHover: handleHover,
        onClick: handleClick,
      });

      // Initialize deck
      deckInstance = new Deck({
        parent: container,
        views: new OrthographicView({}),
        initialViewState: INITIAL_VIEW_STATE,
        controller: true,
        layers,
        getCursor: ({ isHovering }: { isHovering: boolean }) =>
          isHovering ? "pointer" : "grab",
      });

      isLoading = false;
    } catch (err) {
      console.error("Failed to initialize map:", err);
      loadError = err instanceof Error ? err.message : "Failed to load map";
      isLoading = false;
    }
  });

  onDestroy(() => {
    deckInstance?.finalize();
  });

  // Re-render layers when visibility changes
  $effect(() => {
    // Access layerVisibility to track it
    void layerVisibility;
    updateLayers();
  });
</script>

<svelte:head>
  <title>World Map - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Interactive world map showing monsters, NPCs, portals, and other points of interest in Ancient Kingdoms."
  />
</svelte:head>

<div class="relative h-[calc(100vh-4rem)] w-full">
  <div bind:this={container} class="absolute inset-0"></div>

  {#if isLoading}
    <div
      class="absolute inset-0 flex items-center justify-center bg-background/80"
    >
      <div class="text-center">
        <div
          class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        ></div>
        <p class="mt-2 text-muted-foreground">Loading map...</p>
      </div>
    </div>
  {/if}

  {#if loadError}
    <div
      class="absolute inset-0 flex items-center justify-center bg-background/80"
    >
      <div class="text-center">
        <p class="text-destructive">Error: {loadError}</p>
        <p class="mt-2 text-sm text-muted-foreground">
          Please try refreshing the page.
        </p>
      </div>
    </div>
  {/if}

  {#if !isLoading && !loadError}
    <MapControls
      visibility={layerVisibility}
      onVisibilityChange={handleVisibilityChange}
    />
    <MapLegend />

    {#if hoveredEntity && !selectedEntity}
      <MapTooltip entity={hoveredEntity} x={hoverX} y={hoverY} />
    {/if}

    {#if selectedEntity}
      <EntityPopup entity={selectedEntity} onClose={handleClosePopup} />
    {/if}
  {/if}
</div>
