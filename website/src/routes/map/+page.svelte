<script lang="ts">
  import { untrack } from "svelte";
  import { browser } from "$app/environment";
  import { MapSidebar } from "$lib/components/map/sidebar";
  import MapTooltip from "$lib/components/map/MapTooltip.svelte";
  import EntityPopup from "$lib/components/map/EntityPopup.svelte";
  import ZonePopup from "$lib/components/map/ZonePopup.svelte";
  import ItemPopup from "$lib/components/map/ItemPopup.svelte";
  import QuestPopup from "$lib/components/map/QuestPopup.svelte";
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
    ParentZoneBoundary,
  } from "$lib/types/map";
  import type { MapSearchResult } from "$lib/queries/map-search";
  import {
    resolvePhysicalSelection,
    resolveVirtualSelection,
    type ResolvedSelection,
  } from "$lib/map/resolve-selection";

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

  // Selected zone (for zone popup display)
  let selectedZone = $state<ParentZoneBoundary | null>(null);

  // Selection state for highlighting (synced with URL)
  let selectedEntityId = $state<string | null>(null);
  let selectedEntityType = $state<string | null>(null);

  // For virtual entities (items, quests): physical entities to highlight
  let highlightEntityIds = $state<string[] | null>(null);
  let highlightEntityCategory = $state<
    | "monster"
    | "npc"
    | "altar"
    | "portal"
    | "chest"
    | "resource"
    | "crafting"
    | null
  >(null);

  /**
   * Apply a resolved selection to state variables.
   * This is the single point where all selection state is updated.
   */
  function applySelection(resolved: ResolvedSelection) {
    // Clear all state first
    selectedEntity = null;
    selectedZone = null;
    selectedEntityId = null;
    selectedEntityType = null;
    highlightEntityIds = null;
    highlightEntityCategory = null;

    // Set popup state based on popup type
    if (resolved.popup) {
      switch (resolved.popup.type) {
        case "entity":
          selectedEntity = resolved.popup.entity;
          break;
        case "zone":
          selectedZone = resolved.popup.zone;
          break;
        case "item":
        case "quest":
        case "monster":
          // Virtual entities - set ID/type for future popup components
          selectedEntityId = resolved.popup.id;
          selectedEntityType = resolved.popup.type;
          break;
      }
    }

    // Set highlight state
    if (resolved.highlight) {
      // Always set entityId/entityType for URL state persistence
      selectedEntityId = resolved.highlight.entityId;
      selectedEntityType = resolved.highlight.entityType;

      if (resolved.highlight.overrideIds) {
        // Virtual entity or altar-only monster - use override IDs for highlighting
        highlightEntityIds = resolved.highlight.overrideIds;
        highlightEntityCategory = resolved.highlight.overrideCategory ?? null;
      }
    }
  }

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
  // For virtual entities (items, quests), use highlightEntityIds instead of normal lookup
  let selectionData = $derived(
    highlightEntityIds && highlightEntityCategory
      ? computeSelectionData(
          entityIndex,
          highlightEntityCategory,
          highlightEntityIds[0],
        ).concat(
          ...highlightEntityIds
            .slice(1)
            .map((id) =>
              computeSelectionData(entityIndex, highlightEntityCategory!, id),
            ),
        )
      : computeSelectionData(entityIndex, selectedEntityType, selectedEntityId),
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
      selectedEntity,
      selectedZone,
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
    if (!entityData) return;

    // Check if clicking on a parent zone polygon
    if (info.layer?.id === "parent-zones" && info.object) {
      const zone = info.object as ParentZoneBoundary;
      applySelection({
        popup: { type: "zone", zone },
        highlight: null,
      });
      return;
    }

    if (info.object) {
      const entity = info.object as AnyMapEntity;
      const id = getSelectionId(entity);
      const resolved = resolvePhysicalSelection(entity.type, id, entityData);
      // Override popup with the clicked entity (for primary highlight)
      if (resolved.popup?.type === "entity") {
        resolved.popup.entity = entity;
      }
      applySelection(resolved);
    } else {
      // Click on empty space clears selection
      applySelection({ popup: null, highlight: null });
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
    applySelection({ popup: null, highlight: null });
  }

  function handleCloseZonePopup() {
    applySelection({ popup: null, highlight: null });
  }

  function handleSelectMonster(monsterId: string) {
    if (!entityData) return;
    const resolved = resolvePhysicalSelection("monster", monsterId, entityData);
    applySelection(resolved);
  }

  function handleSelectAltar(altarId: string) {
    if (!entityData) return;
    const resolved = resolvePhysicalSelection("altar", altarId, entityData);
    applySelection(resolved);
  }

  function handleSelectNpc(npcId: string) {
    if (!entityData) return;
    const resolved = resolvePhysicalSelection("npc", npcId, entityData);
    applySelection(resolved);
  }

  function handleSelectZone(zoneId: string) {
    if (!entityData) return;
    const resolved = resolvePhysicalSelection("zone", zoneId, entityData);
    applySelection(resolved);
  }

  async function handleSelectItem(itemId: string) {
    const resolved = await resolveVirtualSelection("item", itemId);
    applySelection(resolved);
  }

  async function handleSelectQuest(questId: string) {
    const resolved = await resolveVirtualSelection("quest", questId);
    applySelection(resolved);
  }

  // Keyboard handlers
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      searchOpen = true;
    } else if (e.key === "Escape") {
      if (selectedEntity || selectedEntityId || selectedZone) {
        applySelection({ popup: null, highlight: null });
      }
    }
  }

  function handleSearchSelect(result: MapSearchResult) {
    if (!entityData) return;

    // Handle virtual entities (items, quests) - use async resolver
    if (result.category === "item" || result.category === "quest") {
      resolveVirtualSelection(result.category, result.id).then(applySelection);
    } else {
      // Physical entities - use sync resolver
      // The resolver handles altar-only monsters, zones, and all other entity types
      const resolved = resolvePhysicalSelection(
        result.category,
        result.id,
        entityData,
      );
      applySelection(resolved);
    }

    // Fly to bounds if available
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
        if (urlState.zone) {
          focusedZoneId = urlState.zone;
        }
        // Note: Entity/zone selection is restored after data is loaded via applySelection
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

        // Restore selection from URL state (after entity data is loaded)
        if (urlState?.entity && urlState?.etype) {
          if (urlState.etype === "item" || urlState.etype === "quest") {
            // Virtual entities need async resolution
            resolveVirtualSelection(urlState.etype, urlState.entity).then(
              applySelection,
            );
          } else {
            // Physical entities (including altar-only monsters) use sync resolution
            const resolved = resolvePhysicalSelection(
              urlState.etype,
              urlState.entity,
              entityData,
            );
            applySelection(resolved);
          }
        } else if (urlState?.selectedZone) {
          // Restore zone popup from URL state
          const zone = entityData.parentZones.find(
            (z) => z.zoneId === urlState.selectedZone,
          );
          if (zone) {
            applySelection({
              popup: { type: "zone", zone },
              highlight: null,
            });
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
          selectedEntity,
          selectedZone,
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

        // Fit to content bounds on initial load (no URL state)
        if (!urlState && entityData.parentZones.length > 0) {
          // Calculate bounds from all parent zones
          const contentBounds = entityData.parentZones.reduce(
            (bounds, zone) => {
              for (const [x, y] of zone.polygon) {
                bounds.minX = Math.min(bounds.minX, x);
                bounds.maxX = Math.max(bounds.maxX, x);
                bounds.minY = Math.min(bounds.minY, y);
                bounds.maxY = Math.max(bounds.maxY, y);
              }
              return bounds;
            },
            {
              minX: Infinity,
              maxX: -Infinity,
              minY: Infinity,
              maxY: -Infinity,
            },
          );
          flyToBounds(deckInstance, contentBounds, { duration: 0 });
        }

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
    void selectedEntity; // The actual clicked entity (for primary highlight)
    void selectedZone; // The selected zone (for zone highlight)
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
      const selZoneId = untrack(() => selectedZone?.zoneId ?? null);
      debouncedUpdateUrlState(
        currentViewState,
        layers,
        levelFilter,
        entityData.levelRanges,
        entityId,
        entityType,
        zoneId,
        selZoneId,
      );
    }
  });

  // Sync URL immediately for discrete changes (layer toggles, selection, zone focus)
  $effect(() => {
    void layerVisibility;
    void selectedEntityId;
    void selectedEntityType;
    void focusedZoneId;
    void selectedZone;
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
        selectedZone?.zoneId ?? null,
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

<div class="dark relative h-screen w-full bg-background text-foreground">
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

    {#if selectedZone}
      <ZonePopup
        zone={selectedZone}
        onClose={handleCloseZonePopup}
        onSelectMonster={handleSelectMonster}
        onSelectAltar={handleSelectAltar}
        onSelectNpc={handleSelectNpc}
      />
    {:else if selectedEntity}
      <EntityPopup
        entity={selectedEntity}
        onClose={handleClosePopup}
        onSelectMonster={handleSelectMonster}
        onSelectAltar={handleSelectAltar}
        onSelectItem={handleSelectItem}
        onSelectQuest={handleSelectQuest}
        onSelectZone={handleSelectZone}
      />
    {:else if selectedEntityType === "item" && selectedEntityId}
      <ItemPopup
        itemId={selectedEntityId}
        onClose={handleClosePopup}
        onSelectMonster={handleSelectMonster}
      />
    {:else if selectedEntityType === "quest" && selectedEntityId}
      <QuestPopup
        questId={selectedEntityId}
        onClose={handleClosePopup}
        onSelectNpc={handleSelectNpc}
        onSelectItem={handleSelectItem}
      />
    {/if}

    <MapSearch bind:open={searchOpen} onselect={handleSearchSelect} />
  {/if}
</div>
