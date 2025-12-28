<script lang="ts">
  import { untrack } from "svelte";
  import { browser } from "$app/environment";
  import {
    MapSidebar,
    SIDEBAR_WIDTH_EXPANDED,
  } from "$lib/components/map/sidebar";

  // Popup width (w-80 = 320px) + right margin (right-4 = 16px)
  const POPUP_WIDTH = 336;
  import MapTooltip from "$lib/components/map/MapTooltip.svelte";
  import EntityPopup from "$lib/components/map/EntityPopup.svelte";
  import ZonePopup from "$lib/components/map/ZonePopup.svelte";
  import ItemPopup from "$lib/components/map/ItemPopup.svelte";
  import QuestPopup from "$lib/components/map/QuestPopup.svelte";
  import MapSearch from "$lib/components/map/MapSearch.svelte";
  import * as Drawer from "$lib/components/ui/drawer";
  import type { PageData } from "./$types";
  import {
    createLayers,
    createFilteredData,
    type IconAtlasData,
  } from "$lib/map/layers";
  import { createIconAtlas } from "$lib/map/icons";
  import {
    computeSelectionData,
    computeSelectionFromGroups,
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
  import {
    flyToBounds,
    boundsFromPositions,
    boundsFromPolygon,
    type Bounds,
  } from "$lib/map/flyto";
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
    type OverrideGroup,
  } from "$lib/map/resolve-selection";
  import { preloadDb } from "$lib/db";

  // Prerendered data from server
  let { data }: { data: PageData } = $props();

  // deck.gl instance and modules (not reactive - managed imperatively)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deckInstance: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deckModules: any = null;

  // Loading state (data is prerendered, only deck.gl needs loading)
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);

  // Entity data from prerendered props
  let entityData = $state<MapEntityData>(data.entityData);
  let filteredData = $state<FilteredMapData>(
    createFilteredData(data.entityData),
  );
  let entityIndex = $state<EntityIndex>(createEntityIndex(data.entityData));
  let iconAtlas = $state<IconAtlasData | null>(null);

  // Zone focus state
  let zoneList = $state<ZoneListItem[]>(data.zoneList);
  let focusedZoneId = $state<string | null>(null);

  // Sidebar width (for map container offset on desktop)
  let sidebarWidth = $state(SIDEBAR_WIDTH_EXPANDED);

  // Track if we're on desktop (md breakpoint) for tooltip offset
  let isDesktop = $state(false);
  $effect(() => {
    if (!browser) return;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    isDesktop = mediaQuery.matches;
    const handler = (e: MediaQueryListEvent) => (isDesktop = e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  });

  // Hover state (for tooltip display)
  let hoveredEntity = $state<AnyMapEntity | null>(null);
  let hoverX = $state(0);
  let hoverY = $state(0);
  let isHoveringDestination = $state(false);

  // Hover preview state (for popup link highlights - ephemeral, not URL-persisted)
  let hoverEntityId = $state<string | null>(null);
  let hoverEntityCategory = $state<
    "monster" | "npc" | "altar" | "zone" | "chest" | "resource" | null
  >(null);
  // For altar-only monsters: override to highlight altars instead
  let hoverOverrideIds = $state<string[] | null>(null);
  let hoverOverrideCategory = $state<"monster" | "npc" | "altar" | null>(null);

  // Selected entity (for popup display)
  let selectedEntity = $state<AnyMapEntity | null>(null);

  // Selected zone (for zone popup display)
  let selectedZone = $state<ParentZoneBoundary | null>(null);

  // Selection state for highlighting (synced with URL)
  let selectedEntityId = $state<string | null>(null);
  let selectedEntityType = $state<string | null>(null);

  // For virtual entities (items, quests): physical entities to highlight (multiple categories)
  let highlightOverrideGroups = $state<OverrideGroup[] | null>(null);

  // Track if there's an active selection (for showing reopen button on mobile)
  let hasSelection = $derived(
    selectedZone !== null ||
      selectedEntity !== null ||
      selectedEntityType === "item" ||
      selectedEntityType === "quest",
  );

  // Mobile drawer state (separate from selection so drawer can be dismissed without clearing selection)
  let mobileDrawerOpen = $state(false);

  // Right padding for flyToBounds (popup width when popup is open, on desktop only)
  let flyToRightPadding = $derived(hasSelection && isDesktop ? POPUP_WIDTH : 0);

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
    highlightOverrideGroups = null;
    // Clear hover state (link was clicked, no longer hovering)
    hoverEntityId = null;
    hoverEntityCategory = null;
    hoverOverrideIds = null;
    hoverOverrideCategory = null;

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
      // Open mobile drawer when a new selection is made
      if (!isDesktop) {
        mobileDrawerOpen = true;
      }
    }

    // Set highlight state
    if (resolved.highlight) {
      // Always set entityId/entityType for URL state persistence
      selectedEntityId = resolved.highlight.entityId;
      selectedEntityType = resolved.highlight.entityType;

      if (resolved.highlight.overrideGroups) {
        // Virtual entity or altar-only monster - use override groups for highlighting
        highlightOverrideGroups = resolved.highlight.overrideGroups;
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
  // For virtual entities (items, quests), use highlightOverrideGroups instead of normal lookup
  let selectionData = $derived(
    highlightOverrideGroups
      ? computeSelectionFromGroups(entityIndex, highlightOverrideGroups)
      : computeSelectionData(entityIndex, selectedEntityType, selectedEntityId),
  );

  // Derived: whether there are any highlight positions to focus on
  // Used to conditionally show the focus button in popups
  let hasHighlightPositions = $derived(
    selectionData.some((e) => e.position !== null),
  );

  // Derived: pre-computed patrol path data for patrolling monsters
  // Only recomputed when selectionData changes
  let patrolPathData = $derived(computePatrolPathData(selectionData));

  // Derived: pre-computed related entities (blockers for summon spawns)
  // These get a different highlight color (orange instead of white)
  // Uses pre-built index for O(1) lookup
  // Skip for virtual entities (items/quests) - they aggregate multiple monsters
  // and showing blocker relations doesn't make sense
  let relatedEntities = $derived(
    highlightOverrideGroups
      ? EMPTY_SELECTION
      : computeRelatedEntities(selectionData, entityIndex),
  );

  // Derived: pre-computed relation arcs (from summon spawns to their blockers)
  let relationArcData = $derived(
    computeRelationArcs(selectionData, relatedEntities),
  );

  // Derived: hover preview data for popup link highlights
  let hoverSelectionData = $derived.by(() => {
    // Use override for altar-only monsters
    if (hoverOverrideIds && hoverOverrideCategory && entityIndex) {
      return hoverOverrideIds.flatMap((id) =>
        computeSelectionData(entityIndex, hoverOverrideCategory!, id),
      );
    }
    // Normal case
    if (
      hoverEntityId &&
      hoverEntityCategory &&
      hoverEntityCategory !== "zone" &&
      entityIndex
    ) {
      return computeSelectionData(
        entityIndex,
        hoverEntityCategory,
        hoverEntityId,
      );
    }
    return EMPTY_SELECTION;
  });

  // Derived: hover zone for zone link highlights
  let hoverZone = $derived.by(() => {
    if (!hoverEntityId || hoverEntityCategory !== "zone" || !entityData) {
      return null;
    }
    return (
      entityData.parentZones.find((z) => z.zoneId === hoverEntityId) ?? null
    );
  });

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
      hoverSelectionData,
      hoverZone,
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

  function handleFocusBounds(bounds: Bounds) {
    if (!deckInstance) return;
    flyToBounds(deckInstance, bounds, { rightPadding: flyToRightPadding });
  }

  function handleFocusHighlighted() {
    if (!deckInstance) return;
    const positions = selectionData
      .map((e) => e.position)
      .filter((p): p is [number, number] => p !== null);
    const bounds = boundsFromPositions(positions);
    if (bounds) {
      flyToBounds(deckInstance, bounds, { rightPadding: flyToRightPadding });
    }
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

  function handleSelectChest(chestId: string) {
    if (!entityData) return;
    const resolved = resolvePhysicalSelection("chest", chestId, entityData);
    applySelection(resolved);
  }

  function handleSelectGathering(resourceId: string) {
    if (!entityData) return;
    const resolved = resolvePhysicalSelection(
      "resource",
      resourceId,
      entityData,
    );
    applySelection(resolved);
  }

  // Hover handlers (for popup link preview highlights)
  function handleHoverMonster(monsterId: string | null) {
    // Clear override state
    hoverOverrideIds = null;
    hoverOverrideCategory = null;

    if (!monsterId) {
      hoverEntityId = null;
      hoverEntityCategory = null;
      return;
    }

    // Check if this is an altar-only monster (no position, has altarIds)
    const monster = entityData?.monsters.find((m) => m.monsterId === monsterId);
    if (
      monster?.altarIds &&
      monster.altarIds.length > 0 &&
      monster.position === null
    ) {
      // Altar-only monster - highlight the altar(s) instead
      hoverOverrideIds = monster.altarIds;
      hoverOverrideCategory = "altar";
    }

    hoverEntityId = monsterId;
    hoverEntityCategory = "monster";
  }

  function handleHoverAltar(altarId: string | null) {
    hoverOverrideIds = null;
    hoverOverrideCategory = null;
    hoverEntityId = altarId;
    hoverEntityCategory = altarId ? "altar" : null;
  }

  function handleHoverNpc(npcId: string | null) {
    hoverOverrideIds = null;
    hoverOverrideCategory = null;
    hoverEntityId = npcId;
    hoverEntityCategory = npcId ? "npc" : null;
  }

  function handleHoverZone(zoneId: string | null) {
    hoverOverrideIds = null;
    hoverOverrideCategory = null;
    hoverEntityId = zoneId;
    hoverEntityCategory = zoneId ? "zone" : null;
  }

  function handleHoverChest(chestId: string | null) {
    hoverOverrideIds = null;
    hoverOverrideCategory = null;
    hoverEntityId = chestId;
    hoverEntityCategory = chestId ? "chest" : null;
  }

  function handleHoverGathering(resourceId: string | null) {
    hoverOverrideIds = null;
    hoverOverrideCategory = null;
    hoverEntityId = resourceId;
    hoverEntityCategory = resourceId ? "resource" : null;
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
    // Use POPUP_WIDTH directly since we know a popup will open after applySelection
    // (flyToRightPadding derived value hasn't updated yet in this execution)
    if (result.bounds && deckInstance) {
      flyToBounds(deckInstance, result.bounds, {
        rightPadding: isDesktop ? POPUP_WIDTH : 0,
      });
    }
  }

  /**
   * Svelte action that initializes deck.gl when the container is mounted.
   * Uses action lifecycle for reliable init/cleanup across navigation.
   */
  function initDeckMap(container: HTMLDivElement) {
    if (!browser) return;

    // Start database download immediately in background
    preloadDb();

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

      // Check if URL has explicit position params
      const urlParams = new URLSearchParams(window.location.search);
      const hasPositionParams =
        urlParams.has("x") || urlParams.has("y") || urlParams.has("z");

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
        // Only update view state if position was explicitly in URL
        // Otherwise flyToBounds will set it after computing entity bounds
        if (hasPositionParams) {
          currentViewState = {
            x: urlState.x,
            y: urlState.y,
            zoom: urlState.zoom,
          };
        }
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

        // Set level filter to data-derived defaults if not specified in URL
        // (entity data is prerendered, no need to load)
        if (!urlState?.levelFilter) {
          levelFilter = getDefaultLevelFilter(entityData.levelRanges);
        }

        // Restore selection from URL state (after entity data is loaded)
        if (urlState?.entity && urlState?.etype) {
          if (urlState.etype === "item" || urlState.etype === "quest") {
            // Virtual entities need async resolution
            resolveVirtualSelection(urlState.etype, urlState.entity).then(
              (resolved) => {
                applySelection(resolved);
                // Fly to bounds after async resolution if deck exists and no explicit position
                if (
                  !hasPositionParams &&
                  deckInstance &&
                  resolved.highlight?.overrideGroups &&
                  resolved.highlight.overrideGroups.length > 0
                ) {
                  const selection = computeSelectionFromGroups(
                    entityIndex,
                    resolved.highlight.overrideGroups,
                  );
                  const positions = selection
                    .filter((e) => e.position !== null)
                    .map((e) => e.position!);
                  const bounds = boundsFromPositions(positions);
                  if (bounds) {
                    // Use POPUP_WIDTH directly since flyToRightPadding derived value
                    // may not have updated yet after applySelection
                    const result = flyToBounds(deckInstance, bounds, {
                      duration: 0,
                      rightPadding: isDesktop ? POPUP_WIDTH : 0,
                    });
                    if (result) {
                      currentViewState = {
                        x: result.x,
                        y: result.y,
                        zoom: result.zoom,
                      };
                    }
                  }
                }
              },
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
          EMPTY_SELECTION,
          null,
          iconAtlas ?? undefined,
        );

        // Determine initial view state
        // Only use URL position if explicitly provided (x/y/z params present)
        // Otherwise use defaults - flyToBounds will position the view after creation
        // Check media query directly since isDesktop state may not be set yet
        const isDesktopNow = window.matchMedia("(min-width: 768px)").matches;
        let initialViewState = INITIAL_VIEW_STATE;
        if (urlState && hasPositionParams) {
          let targetX = urlState.x;
          // Offset center to account for popup width on desktop
          // Same formula as flyToBounds: rightPadding / 2 / 2^zoom
          if (urlState.entity && isDesktopNow) {
            targetX += POPUP_WIDTH / 2 / Math.pow(2, urlState.zoom);
          }
          initialViewState = {
            target: [targetX, urlState.y, 0] as [number, number, number],
            zoom: urlState.zoom,
            minZoom: INITIAL_VIEW_STATE.minZoom,
            maxZoom: INITIAL_VIEW_STATE.maxZoom,
          };
        }

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

        // Determine initial view bounds based on URL state
        let initialBounds: Bounds | null = null;

        if (!hasPositionParams) {
          // Try to compute bounds from URL selection
          if (
            urlState?.entity &&
            urlState?.etype &&
            urlState.etype !== "item" &&
            urlState.etype !== "quest" &&
            entityIndex
          ) {
            // Physical entity - compute bounds from selection
            const selection = computeSelectionData(
              entityIndex,
              urlState.etype,
              urlState.entity,
            );
            const positions = selection
              .filter((e) => e.position !== null)
              .map((e) => e.position!);
            initialBounds = boundsFromPositions(positions);
          } else if (urlState?.selectedZone) {
            // Zone - compute bounds from polygon
            const zone = entityData.parentZones.find(
              (z) => z.zoneId === urlState.selectedZone,
            );
            if (zone) {
              initialBounds = boundsFromPolygon(zone.polygon);
            }
          }
        }

        // If no bounds computed (no positions or excluded zone), use full map
        // But skip if URL has explicit position params (respect those instead)
        if (
          !initialBounds &&
          !hasPositionParams &&
          entityData.parentZones.length > 0
        ) {
          initialBounds = entityData.parentZones.reduce(
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
        }

        // Fly to computed bounds (selection, zone, or full map)
        // Update currentViewState synchronously so URL sync uses correct coords
        // Use POPUP_WIDTH directly with media query check since isDesktop/flyToRightPadding
        // may not be set yet during initialization
        const hasSelectionForPadding = !!(
          urlState?.entity || urlState?.selectedZone
        );
        if (initialBounds) {
          const result = flyToBounds(deckInstance, initialBounds, {
            duration: 0,
            rightPadding:
              hasSelectionForPadding && isDesktopNow ? POPUP_WIDTH : 0,
          });
          if (result) {
            currentViewState = { x: result.x, y: result.y, zoom: result.zoom };
          }
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
    void hoverSelectionData; // Hover preview highlights
    void hoverZone; // Hover preview zone highlight
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
    class="absolute inset-0 map-container"
    style="--sidebar-width: {sidebarWidth}px"
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
      bind:sidebarWidth
    />

    {#if hoveredEntity && isDesktop}
      <MapTooltip
        entity={hoveredEntity}
        x={hoverX + sidebarWidth}
        y={hoverY}
        {isHoveringDestination}
      />
    {/if}

    <!-- Desktop: show popups as absolute-positioned cards -->
    {#if isDesktop}
      {#if selectedZone}
        <ZonePopup
          zone={selectedZone}
          onClose={handleCloseZonePopup}
          onFocusClick={handleFocusBounds}
          onSelectMonster={handleSelectMonster}
          onSelectAltar={handleSelectAltar}
          onSelectNpc={handleSelectNpc}
          onHoverMonster={handleHoverMonster}
          onHoverAltar={handleHoverAltar}
          onHoverNpc={handleHoverNpc}
        />
      {:else if selectedEntity}
        <EntityPopup
          entity={selectedEntity}
          onClose={handleClosePopup}
          onFocusClick={hasHighlightPositions
            ? handleFocusHighlighted
            : undefined}
          onSelectMonster={handleSelectMonster}
          onSelectAltar={handleSelectAltar}
          onSelectItem={handleSelectItem}
          onSelectQuest={handleSelectQuest}
          onSelectZone={handleSelectZone}
          onHoverMonster={handleHoverMonster}
          onHoverAltar={handleHoverAltar}
          onHoverZone={handleHoverZone}
        />
      {:else if selectedEntityType === "item" && selectedEntityId}
        <ItemPopup
          itemId={selectedEntityId}
          onClose={handleClosePopup}
          onFocusClick={hasHighlightPositions
            ? handleFocusHighlighted
            : undefined}
          onSelectMonster={handleSelectMonster}
          onHoverMonster={handleHoverMonster}
          onSelectAltar={handleSelectAltar}
          onHoverAltar={handleHoverAltar}
          onSelectNpc={handleSelectNpc}
          onHoverNpc={handleHoverNpc}
          onSelectChest={handleSelectChest}
          onHoverChest={handleHoverChest}
          onSelectGathering={handleSelectGathering}
          onHoverGathering={handleHoverGathering}
          onSelectQuest={handleSelectQuest}
          onSelectItem={handleSelectItem}
        />
      {:else if selectedEntityType === "quest" && selectedEntityId}
        <QuestPopup
          questId={selectedEntityId}
          onClose={handleClosePopup}
          onFocusClick={hasHighlightPositions
            ? handleFocusHighlighted
            : undefined}
          onSelectNpc={handleSelectNpc}
          onSelectMonster={handleSelectMonster}
          onSelectItem={handleSelectItem}
          onHoverNpc={handleHoverNpc}
          onHoverMonster={handleHoverMonster}
        />
      {/if}
    {:else}
      <!-- Mobile: show popups in a bottom drawer -->
      <Drawer.Root bind:open={mobileDrawerOpen}>
        <Drawer.Content class="max-h-[85vh]">
          <Drawer.Header class="sr-only">
            <Drawer.Title>Details</Drawer.Title>
          </Drawer.Header>
          <div class="overflow-y-auto px-4 pb-4">
            {#if selectedZone}
              <ZonePopup
                zone={selectedZone}
                onClose={() => {
                  mobileDrawerOpen = false;
                  handleCloseZonePopup();
                }}
                onFocusClick={handleFocusBounds}
                onSelectMonster={handleSelectMonster}
                onSelectAltar={handleSelectAltar}
                onSelectNpc={handleSelectNpc}
                mode="drawer"
              />
            {:else if selectedEntity}
              <EntityPopup
                entity={selectedEntity}
                onClose={() => {
                  mobileDrawerOpen = false;
                  handleClosePopup();
                }}
                onFocusClick={hasHighlightPositions
                  ? handleFocusHighlighted
                  : undefined}
                onSelectMonster={handleSelectMonster}
                onSelectAltar={handleSelectAltar}
                onSelectItem={handleSelectItem}
                onSelectQuest={handleSelectQuest}
                onSelectZone={handleSelectZone}
                mode="drawer"
              />
            {:else if selectedEntityType === "item" && selectedEntityId}
              <ItemPopup
                itemId={selectedEntityId}
                onClose={() => {
                  mobileDrawerOpen = false;
                  handleClosePopup();
                }}
                onFocusClick={hasHighlightPositions
                  ? handleFocusHighlighted
                  : undefined}
                onSelectMonster={handleSelectMonster}
                onHoverMonster={handleHoverMonster}
                onSelectAltar={handleSelectAltar}
                onHoverAltar={handleHoverAltar}
                onSelectNpc={handleSelectNpc}
                onHoverNpc={handleHoverNpc}
                onSelectChest={handleSelectChest}
                onHoverChest={handleHoverChest}
                onSelectGathering={handleSelectGathering}
                onHoverGathering={handleHoverGathering}
                onSelectQuest={handleSelectQuest}
                onSelectItem={handleSelectItem}
                mode="drawer"
              />
            {:else if selectedEntityType === "quest" && selectedEntityId}
              <QuestPopup
                questId={selectedEntityId}
                onClose={() => {
                  mobileDrawerOpen = false;
                  handleClosePopup();
                }}
                onFocusClick={hasHighlightPositions
                  ? handleFocusHighlighted
                  : undefined}
                onSelectNpc={handleSelectNpc}
                onSelectMonster={handleSelectMonster}
                onSelectItem={handleSelectItem}
                mode="drawer"
              />
            {/if}
          </div>
        </Drawer.Content>
      </Drawer.Root>

      <!-- Mobile: floating button to reopen drawer when selection exists but drawer is closed -->
      {#if hasSelection && !mobileDrawerOpen}
        <button
          type="button"
          class="fixed bottom-4 right-4 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg transition-colors hover:bg-secondary/80"
          onclick={() => (mobileDrawerOpen = true)}
          aria-label="Show details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      {/if}
    {/if}

    <MapSearch bind:open={searchOpen} onselect={handleSearchSelect} />
  {/if}
</div>
