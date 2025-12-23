<script lang="ts">
  import { browser } from "$app/environment";
  import { MapSidebar } from "$lib/components/map/sidebar";
  import MapTooltip from "$lib/components/map/MapTooltip.svelte";
  import EntityPopup from "$lib/components/map/EntityPopup.svelte";
  import MapSearch from "$lib/components/map/MapSearch.svelte";
  import { loadAllMapEntities } from "$lib/queries/map";
  import { createLayers, createFilteredData } from "$lib/map/layers";
  import { computeSelectionData } from "$lib/map/selection";
  import { INITIAL_VIEW_STATE } from "$lib/map/config";
  import { flyToBounds } from "$lib/map/flyto";
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
  import type { MapSearchResult } from "$lib/queries/map-search";

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

  // Selected entity (for popup display)
  let selectedEntity = $state<AnyMapEntity | null>(null);

  // Selection state for highlighting (synced with URL)
  let selectedEntityId = $state<string | null>(null);
  let selectedEntityType = $state<string | null>(null);

  // Search state
  let searchOpen = $state(false);

  // Map state (initialized in onMount from URL or defaults)
  let layerVisibility = $state<LayerVisibility>({
    monsters: true,
    bosses: true,
    elites: true,
    npcs: true,
    portals: true,
    portalArcs: true,
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

  // Derived: pre-computed selection data for highlighting
  // This is only recomputed when selection changes, not on every visibility toggle
  let selectionData = $derived(
    computeSelectionData(entityData, selectedEntityType, selectedEntityId),
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
      selectionData,
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
      const entity = info.object as AnyMapEntity;
      selectedEntity = entity;
      selectedEntityId = entity.id;
      selectedEntityType = entity.type;
    } else {
      // Click on empty space clears selection
      selectedEntity = null;
      selectedEntityId = null;
      selectedEntityType = null;
    }
  }

  function handleClosePopup() {
    selectedEntity = null;
    selectedEntityId = null;
    selectedEntityType = null;
  }

  // Keyboard handlers
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      searchOpen = true;
    } else if (e.key === "Escape" && selectedEntityId) {
      selectedEntity = null;
      selectedEntityId = null;
      selectedEntityType = null;
    }
  }

  function handleSearchSelect(result: MapSearchResult) {
    // Use selectTarget if provided (for altar/placeholder spawns that redirect to another entity)
    // Otherwise use the result itself
    const target = result.selectTarget ?? {
      category: result.category,
      id: result.id,
    };

    // Set selection state for highlighting
    selectedEntityId = target.id;
    selectedEntityType = target.category;

    // Find and show popup for the TARGET entity (not the search result)
    // This shows the altar popup when searching for altar-spawned monsters
    if (entityData && target.category !== "zone") {
      const dataArrays: Record<string, AnyMapEntity[]> = {
        monster: entityData.monsters,
        npc: entityData.npcs,
        resource: entityData.gathering,
        chest: entityData.chests,
        altar: entityData.altars,
      };
      const entity = dataArrays[target.category]?.find(
        (e) => e.id === target.id,
      );
      if (entity) {
        selectedEntity = entity;
      }
    }

    // Fly to bounds (uses result.bounds, NOT target bounds)
    // This flies to where the searched monster spawns, even if we select the altar
    if (result.bounds && deckInstance) {
      flyToBounds(deckInstance, result.bounds);
    }
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
        if (urlState.entity && urlState.etype) {
          selectedEntityId = urlState.entity;
          selectedEntityType = urlState.etype;
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

        // Restore popup from URL state (after entity data is loaded)
        if (
          selectedEntityId &&
          selectedEntityType &&
          selectedEntityType !== "zone"
        ) {
          // Map both search categories and entity types to their data arrays
          const dataArrays: Record<string, AnyMapEntity[]> = {
            // Search categories
            monster: entityData.monsters,
            npc: entityData.npcs,
            resource: entityData.gathering,
            chest: entityData.chests,
            altar: entityData.altars,
            // Entity types (from clicking on map)
            boss: entityData.monsters,
            elite: entityData.monsters,
            gathering_plant: entityData.gathering,
            gathering_mineral: entityData.gathering,
            gathering_spark: entityData.gathering,
          };
          const entity = dataArrays[selectedEntityType]?.find(
            (e) => e.id === selectedEntityId,
          );
          if (entity) {
            selectedEntity = entity;
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
          selectionData,
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

  // Re-render layers when visibility, level filter, selection, or portal changes
  $effect(() => {
    void layerVisibility;
    void levelFilter;
    void selectedPortalId;
    void selectionData; // Pre-computed, only changes when selection changes
    updateLayers();
  });

  // Sync URL when view state, layer visibility, level filter, or selection changes
  $effect(() => {
    if (!isLoading && entityData) {
      debouncedUpdateUrlState(
        currentViewState,
        layerVisibility,
        levelFilter,
        entityData.levelRanges,
        selectedEntityId,
        selectedEntityType,
      );
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>World Map - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Interactive world map showing monsters, NPCs, portals, and other points of interest in Ancient Kingdoms."
  />
</svelte:head>

<div class="relative h-screen w-full">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    use:initDeckMap
    class="absolute inset-0"
    onmouseleave={() => (hoveredEntity = null)}
  ></div>

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
    <MapSidebar
      visibility={layerVisibility}
      onVisibilityChange={handleVisibilityChange}
      {levelFilter}
      onLevelFilterChange={handleLevelFilterChange}
      levelRanges={entityData.levelRanges}
      onSearchClick={() => (searchOpen = true)}
    />

    {#if hoveredEntity}
      <MapTooltip entity={hoveredEntity} x={hoverX} y={hoverY} />
    {/if}

    {#if selectedEntity}
      <EntityPopup entity={selectedEntity} onClose={handleClosePopup} />
    {/if}

    <MapSearch bind:open={searchOpen} onselect={handleSearchSelect} />
  {/if}
</div>
