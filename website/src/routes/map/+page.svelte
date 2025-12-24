<script lang="ts">
  import { untrack } from "svelte";
  import { browser } from "$app/environment";
  import { MapSidebar } from "$lib/components/map/sidebar";
  import MapTooltip from "$lib/components/map/MapTooltip.svelte";
  import EntityPopup from "$lib/components/map/EntityPopup.svelte";
  import MapSearch from "$lib/components/map/MapSearch.svelte";
  import { loadAllMapEntities, loadZoneList } from "$lib/queries/map";
  import {
    createLayers,
    createFilteredData,
    type IconAtlasData,
  } from "$lib/map/layers";
  import { createIconAtlas } from "$lib/map/icons";
  import {
    computeSelectionData,
    computePatrolPathData,
    computeRelatedEntities,
    computeRelationArcs,
    createEntityIndex,
    EMPTY_SELECTION,
    EMPTY_RELATION_ARCS,
    type EntityIndex,
  } from "$lib/map/selection";
  import { createZoneFocusedData } from "$lib/map/zone-filter";
  import { INITIAL_VIEW_STATE } from "$lib/map/config";
  import { flyToBounds } from "$lib/map/flyto";
  import {
    parseUrlState,
    urlStateToLayerVisibility,
    debouncedUpdateUrlState,
    immediateUpdateUrlState,
    getDefaultLevelFilter,
    getDefaultLayerVisibility,
  } from "$lib/map/url-state";
  import type {
    LayerVisibility,
    LevelFilter,
    MapEntityData,
    FilteredMapData,
    AnyMapEntity,
    ZoneListItem,
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
  let entityIndex = $state<EntityIndex | null>(null);
  let iconAtlas = $state<IconAtlasData | null>(null);

  // Zone focus state
  let zoneList = $state<ZoneListItem[]>([]);
  let focusedZoneId = $state<string | null>(null);

  // Hover state
  let hoveredEntity = $state<AnyMapEntity | null>(null);
  let hoverX = $state(0);
  let hoverY = $state(0);
  let isHoveringDestination = $state(false);

  // Selected entity (for popup display)
  let selectedEntity = $state<AnyMapEntity | null>(null);

  // Selection state for highlighting (synced with URL)
  let selectedEntityId = $state<string | null>(null);
  let selectedEntityType = $state<string | null>(null);

  // Search state
  let searchOpen = $state(false);

  // Map state (initialized in onMount from URL or defaults)
  let layerVisibility = $state<LayerVisibility>(getDefaultLayerVisibility());

  let levelFilter = $state<LevelFilter>(getDefaultLevelFilter());

  let currentViewState = $state({
    x: INITIAL_VIEW_STATE.target[0],
    y: INITIAL_VIEW_STATE.target[1],
    zoom: INITIAL_VIEW_STATE.zoom,
  });

  // Batch view state updates using requestAnimationFrame to reduce reactivity overhead
  let pendingViewState: { x: number; y: number; zoom: number } | null = null;
  let rafId: number | null = null;

  function batchedUpdateViewState(x: number, y: number, zoom: number) {
    pendingViewState = { x, y, zoom };
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (pendingViewState) {
          currentViewState = pendingViewState;
          pendingViewState = null;
        }
        rafId = null;
      });
    }
  }

  // Derived: selected portal ID for arc highlighting
  let selectedPortalId = $derived(
    selectedEntity?.type === "portal" ? selectedEntity.id : null,
  );

  // Derived: pre-computed selection data for highlighting (O(1) lookup via index)
  // This is only recomputed when selection changes, not on every visibility toggle
  let selectionData = $derived(
    computeSelectionData(entityIndex, selectedEntityType, selectedEntityId),
  );

  // Derived: pre-computed patrol path data for patrolling monsters
  // Only recomputed when selectionData changes
  let patrolPathData = $derived(computePatrolPathData(selectionData));

  // Derived: pre-computed related entities (blockers for summon spawns)
  // These get a different highlight color (orange instead of white)
  // Uses pre-built index for O(1) lookup
  let relatedEntities = $derived(
    computeRelatedEntities(selectionData, entityIndex),
  );

  // Derived: pre-computed relation arcs (from summon spawns to their blockers)
  let relationArcData = $derived(
    computeRelationArcs(selectionData, relatedEntities),
  );

  // Derived: combined data for layer rendering (stable array references)
  let zoneFocusedData = $derived(
    entityData && filteredData
      ? createZoneFocusedData(filteredData, entityData)
      : null,
  );

  function handleVisibilityChange(newVisibility: LayerVisibility) {
    layerVisibility = newVisibility;
  }

  function handleLevelFilterChange(newFilter: LevelFilter) {
    levelFilter = newFilter;
  }

  function handleZoneFocusChange(zoneId: string | null) {
    focusedZoneId = zoneId;
  }

  function updateLayers() {
    if (!deckInstance || !zoneFocusedData || !deckModules) return;

    const layers = createLayers(
      zoneFocusedData,
      layerVisibility,
      deckModules,
      {
        onHover: handleHover,
        onClick: handleClick,
      },
      levelFilter,
      selectedPortalId,
      focusedZoneId,
      selectionData,
      patrolPathData,
      relatedEntities,
      relationArcData,
      iconAtlas ?? undefined,
    );

    deckInstance.setProps({ layers });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleHover(info: any) {
    if (info.object) {
      hoveredEntity = info.object as AnyMapEntity;
      hoverX = info.x;
      hoverY = info.y;
      isHoveringDestination = info.layer?.id === "portal-destinations";
    } else {
      hoveredEntity = null;
      isHoveringDestination = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(info: any) {
    if (info.object) {
      const entity = info.object as AnyMapEntity;
      selectedEntity = entity;
      // For monsters, use monsterId to group all spawns of the same monster
      // For other entities, use the entity id
      selectedEntityId = getSelectionId(entity);
      selectedEntityType = entity.type;
    } else {
      // Click on empty space clears selection
      selectedEntity = null;
      selectedEntityId = null;
      selectedEntityType = null;
    }
  }

  /**
   * Get the ID to use for selection highlighting.
   * For monsters: use monsterId (groups all spawns)
   * For others: use entity id
   */
  function getSelectionId(entity: AnyMapEntity): string {
    if (
      entity.type === "monster" ||
      entity.type === "boss" ||
      entity.type === "elite" ||
      entity.type === "hunt"
    ) {
      return (entity as import("$lib/types/map").MonsterMapEntity).monsterId;
    }
    return entity.id;
  }

  function handleClosePopup() {
    selectedEntity = null;
    selectedEntityId = null;
    selectedEntityType = null;
  }

  function handleSelectMonster(monsterId: string) {
    // Find a monster spawn with this monsterId and select it
    if (!entityData) return;

    const monster = entityData.monsters.find(
      (m) => m.monsterId === monsterId && m.position !== null,
    );
    if (monster) {
      selectedEntity = monster;
      // Use monsterId for selection (groups all spawns of the same monster)
      selectedEntityId = monster.monsterId;
      selectedEntityType = monster.type;
    }
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
      // Check if this is a monster category (uses monsterId instead of id)
      if (target.category === "monster") {
        // For monsters, search by monsterId
        const monster = entityData.monsters.find(
          (m) =>
            (m as import("$lib/types/map").MonsterMapEntity).monsterId ===
            target.id,
        );
        if (monster) {
          selectedEntity = monster;
        }
      } else {
        const dataArrays: Record<string, AnyMapEntity[]> = {
          npc: entityData.npcs,
          resource: entityData.gathering,
          chest: entityData.chests,
          altar: entityData.altars,
          portal: entityData.portals,
          crafting: entityData.crafting,
        };
        const entity = dataArrays[target.category]?.find(
          (e) => e.id === target.id,
        );
        if (entity) {
          selectedEntity = entity;
        }
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
        if (urlState.zone) {
          focusedZoneId = urlState.zone;
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
          const [deckCore, deckLayers, deckGeoLayers, deckExtensions, atlas] =
            await Promise.all([
              import("@deck.gl/core"),
              import("@deck.gl/layers"),
              import("@deck.gl/geo-layers"),
              import("@deck.gl/extensions"),
              createIconAtlas(),
            ]);

          const { Deck, OrthographicView } = deckCore;
          const {
            ScatterplotLayer,
            IconLayer,
            PolygonLayer,
            LineLayer,
            BitmapLayer,
          } = deckLayers;
          const { TileLayer } = deckGeoLayers;
          const { DataFilterExtension } = deckExtensions;

          deckModules = {
            Deck,
            OrthographicView,
            ScatterplotLayer,
            IconLayer,
            PolygonLayer,
            LineLayer,
            TileLayer,
            BitmapLayer,
            DataFilterExtension,
          };
          iconAtlas = atlas;
        }

        // Load entity data and zone list (only load once)
        if (!entityData) {
          const [loadedEntityData, loadedZoneList] = await Promise.all([
            loadAllMapEntities(),
            loadZoneList(),
          ]);
          entityData = loadedEntityData;
          zoneList = loadedZoneList;
          filteredData = createFilteredData(entityData);
          entityIndex = createEntityIndex(entityData);

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
          // Check if this is a monster type (uses monsterId instead of id)
          const isMonsterType = ["monster", "boss", "elite", "hunt"].includes(
            selectedEntityType,
          );

          if (isMonsterType) {
            // Find monster by monsterId
            const monster = entityData.monsters.find(
              (m) =>
                (m as import("$lib/types/map").MonsterMapEntity).monsterId ===
                selectedEntityId,
            );
            if (monster) {
              selectedEntity = monster;
            }
          } else {
            // Map other categories to their data arrays
            const dataArrays: Record<string, AnyMapEntity[]> = {
              // Search categories
              npc: entityData.npcs,
              resource: entityData.gathering,
              chest: entityData.chests,
              altar: entityData.altars,
              portal: entityData.portals,
              // Entity types
              gathering_plant: entityData.gathering,
              gathering_mineral: entityData.gathering,
              gathering_spark: entityData.gathering,
              gathering_other: entityData.gathering,
              alchemy_table: entityData.crafting,
              crafting_station: entityData.crafting,
            };
            const entity = dataArrays[selectedEntityType]?.find(
              (e) => e.id === selectedEntityId,
            );
            if (entity) {
              selectedEntity = entity;
            }
          }
        }

        // Create initial layers with zone-focused data
        const initialZoneFocusedData = createZoneFocusedData(
          filteredData!,
          entityData,
        );
        const layers = createLayers(
          initialZoneFocusedData,
          layerVisibility,
          deckModules,
          {
            onHover: handleHover,
            onClick: handleClick,
          },
          levelFilter,
          null,
          focusedZoneId,
          selectionData,
          patrolPathData,
          EMPTY_SELECTION,
          EMPTY_RELATION_ARCS,
          iconAtlas ?? undefined,
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
          controller: { inertia: 500 },
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
              batchedUpdateViewState(
                viewState.target[0],
                viewState.target[1],
                viewState.zoom,
              );
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

  // Re-render layers when visibility, level filter, selection, or zone focus changes
  $effect(() => {
    void layerVisibility;
    void levelFilter;
    void selectedPortalId;
    void selectionData; // Pre-computed, only changes when selection changes
    void patrolPathData; // Pre-computed, only changes when selectionData changes
    void relatedEntities; // Pre-computed, only changes when selection changes
    void zoneFocusedData; // Pre-computed, only changes when focusedZoneId changes
    updateLayers();
  });

  // Sync URL with debounce for continuous changes (pan/zoom, level sliders)
  $effect(() => {
    void currentViewState;
    void levelFilter;
    if (!isLoading && entityData) {
      // Use untrack for values that shouldn't trigger this effect
      const layers = untrack(() => layerVisibility);
      const entityId = untrack(() => selectedEntityId);
      const entityType = untrack(() => selectedEntityType);
      const zoneId = untrack(() => focusedZoneId);
      debouncedUpdateUrlState(
        currentViewState,
        layers,
        levelFilter,
        entityData.levelRanges,
        entityId,
        entityType,
        zoneId,
      );
    }
  });

  // Sync URL immediately for discrete changes (layer toggles, selection, zone focus)
  $effect(() => {
    void layerVisibility;
    void selectedEntityId;
    void selectedEntityType;
    void focusedZoneId;
    if (!isLoading && entityData) {
      // Use untrack to read non-tracked values without making them dependencies
      const viewState = untrack(() => currentViewState);
      const filter = untrack(() => levelFilter);
      immediateUpdateUrlState(
        viewState,
        layerVisibility,
        filter,
        entityData.levelRanges,
        selectedEntityId,
        selectedEntityType,
        focusedZoneId,
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
      zones={zoneList}
      {focusedZoneId}
      onZoneFocusChange={handleZoneFocusChange}
    />

    {#if hoveredEntity}
      <MapTooltip
        entity={hoveredEntity}
        x={hoverX}
        y={hoverY}
        {isHoveringDestination}
      />
    {/if}

    {#if selectedEntity}
      <EntityPopup
        entity={selectedEntity}
        onClose={handleClosePopup}
        onSelectMonster={handleSelectMonster}
      />
    {/if}

    <MapSearch bind:open={searchOpen} onselect={handleSearchSelect} />
  {/if}
</div>
