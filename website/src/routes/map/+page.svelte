<script lang="ts">
  import { browser } from "$app/environment";
  import MapControls from "$lib/components/map/MapControls.svelte";
  import MapTooltip from "$lib/components/map/MapTooltip.svelte";
  import EntityPopup from "$lib/components/map/EntityPopup.svelte";
  import { loadAllMapEntities } from "$lib/queries/map";
  import { createLayers, createFilteredData } from "$lib/map/layers";
  import { INITIAL_VIEW_STATE } from "$lib/map/config";
  import {
    parseUrlState,
    urlStateToLayerVisibility,
    debouncedUpdateUrlState,
    getDefaultLevelFilter,
  } from "$lib/map/url-state";
  import type {
    LayerVisibility,
    LevelFilter,
    MapEntityData,
    FilteredMapData,
    AnyMapEntity,
  } from "$lib/types/map";

  // deck.gl instance and modules (not reactive - managed imperatively)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deckInstance: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deckModules: any = null;

  // Loading state
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);

  // Entity data (loaded once, cached)
  let entityData = $state<MapEntityData | null>(null);
  let filteredData = $state<FilteredMapData | null>(null);

  // Hover state
  let hoveredEntity = $state<AnyMapEntity | null>(null);
  let hoverX = $state(0);
  let hoverY = $state(0);

  // Selected entity
  let selectedEntity = $state<AnyMapEntity | null>(null);

  // Map state (initialized in onMount from URL or defaults)
  let layerVisibility = $state<LayerVisibility>({
    monsters: true,
    bosses: true,
    elites: true,
    npcs: true,
    portals: true,
    portalArcs: false,
    chests: true,
    altars: true,
    gatheringPlants: true,
    gatheringMinerals: true,
    gatheringSparks: true,
    crafting: true,
    subZones: false,
    parentZones: false,
  });

  let levelFilter = $state<LevelFilter>(getDefaultLevelFilter());

  let currentViewState = $state({
    x: INITIAL_VIEW_STATE.target[0],
    y: INITIAL_VIEW_STATE.target[1],
    zoom: INITIAL_VIEW_STATE.zoom,
  });

  // Derived: selected portal ID for arc highlighting
  let selectedPortalId = $derived(
    selectedEntity?.type === "portal" ? selectedEntity.id : null,
  );

  function handleVisibilityChange(newVisibility: LayerVisibility) {
    layerVisibility = newVisibility;
  }

  function handleLevelFilterChange(newFilter: LevelFilter) {
    levelFilter = newFilter;
  }

  function updateLayers() {
    if (!deckInstance || !entityData || !filteredData || !deckModules) return;

    const layers = createLayers(
      entityData,
      filteredData,
      layerVisibility,
      deckModules,
      {
        onHover: handleHover,
        onClick: handleClick,
      },
      levelFilter,
      selectedPortalId,
    );

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

  /**
   * Svelte action that initializes deck.gl when the container is mounted.
   * Uses action lifecycle for reliable init/cleanup across navigation.
   */
  function initDeckMap(container: HTMLDivElement) {
    if (!browser) return;

    async function initialize() {
      // Clean up any existing instance first
      if (deckInstance) {
        deckInstance.finalize();
        deckInstance = null;
      }

      isLoading = true;
      loadError = null;

      // Parse URL state fresh
      const urlState = parseUrlState();

      // Initialize state from URL if present
      if (urlState) {
        if (urlState.layers) {
          layerVisibility = urlStateToLayerVisibility(urlState.layers);
        }
        if (urlState.levelFilter) {
          levelFilter = urlState.levelFilter;
        }
        currentViewState = {
          x: urlState.x,
          y: urlState.y,
          zoom: urlState.zoom,
        };
      }

      try {
        // Dynamic imports for deck.gl (only load once)
        if (!deckModules) {
          const [deckCore, deckLayers, deckExtensions] = await Promise.all([
            import("@deck.gl/core"),
            import("@deck.gl/layers"),
            import("@deck.gl/extensions"),
          ]);

          const { Deck, OrthographicView } = deckCore;
          const { ScatterplotLayer, PolygonLayer, LineLayer } = deckLayers;
          const { DataFilterExtension } = deckExtensions;

          deckModules = {
            Deck,
            OrthographicView,
            ScatterplotLayer,
            PolygonLayer,
            LineLayer,
            DataFilterExtension,
          };
        }

        // Load entity data (only load once)
        if (!entityData) {
          entityData = await loadAllMapEntities();
          filteredData = createFilteredData(entityData);

          // Set level filter to data-derived defaults if not specified in URL
          if (!urlState?.levelFilter) {
            levelFilter = getDefaultLevelFilter(entityData.levelRanges);
          }
        }

        // Create initial layers
        const layers = createLayers(
          entityData,
          filteredData!,
          layerVisibility,
          deckModules,
          {
            onHover: handleHover,
            onClick: handleClick,
          },
          levelFilter,
          null,
        );

        // Determine initial view state
        const initialViewState = urlState
          ? {
              target: [urlState.x, urlState.y, 0] as [number, number, number],
              zoom: urlState.zoom,
              minZoom: INITIAL_VIEW_STATE.minZoom,
              maxZoom: INITIAL_VIEW_STATE.maxZoom,
            }
          : INITIAL_VIEW_STATE;

        // Initialize deck.gl
        deckInstance = new deckModules.Deck({
          parent: container,
          views: new deckModules.OrthographicView({}),
          initialViewState,
          controller: true,
          layers,
          getCursor: ({ isHovering }: { isHovering: boolean }) =>
            isHovering ? "pointer" : "grab",
          onViewStateChange: ({
            viewState,
          }: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            viewState: any;
          }) => {
            if (viewState.target) {
              currentViewState = {
                x: viewState.target[0],
                y: viewState.target[1],
                zoom: viewState.zoom,
              };
            }
          },
        });

        isLoading = false;
      } catch (err) {
        console.error("Failed to initialize map:", err);
        loadError = err instanceof Error ? err.message : "Failed to load map";
        isLoading = false;
      }
    }

    initialize();

    return {
      destroy() {
        if (deckInstance) {
          deckInstance.finalize();
          deckInstance = null;
        }
      },
    };
  }

  // Re-render layers when visibility, level filter, or selected portal changes
  $effect(() => {
    void layerVisibility;
    void levelFilter;
    void selectedPortalId;
    updateLayers();
  });

  // Sync URL when view state, layer visibility, or level filter changes
  $effect(() => {
    if (!isLoading && entityData) {
      debouncedUpdateUrlState(
        currentViewState,
        layerVisibility,
        levelFilter,
        entityData.levelRanges,
      );
    }
  });
</script>

<svelte:head>
  <title>World Map - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Interactive world map showing monsters, NPCs, portals, and other points of interest in Ancient Kingdoms."
  />
</svelte:head>

<div class="relative h-screen w-full">
  <div use:initDeckMap class="absolute inset-0"></div>

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

  {#if !isLoading && !loadError && entityData}
    <MapControls
      visibility={layerVisibility}
      onVisibilityChange={handleVisibilityChange}
      {levelFilter}
      onLevelFilterChange={handleLevelFilterChange}
      levelRanges={entityData.levelRanges}
    />

    {#if hoveredEntity}
      <MapTooltip entity={hoveredEntity} x={hoverX} y={hoverY} />
    {/if}

    {#if selectedEntity}
      <EntityPopup entity={selectedEntity} onClose={handleClosePopup} />
    {/if}
  {/if}
</div>
