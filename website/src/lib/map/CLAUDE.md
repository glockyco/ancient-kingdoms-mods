# Interactive Map - Developer Documentation

WebGL-powered interactive world map using deck.gl.

## Overview

The map displays all game entities (monsters, hunts, NPCs, portals, chests, treasure, altars, gathering nodes, crafting stations, houses) on a full world map with layer toggles and entity popups.

**Architecture:**

- **Rendering**: deck.gl with OrthographicView for WebGL performance
- **Data**: Server-side SQLite queries load the map dataset during prerender. The measured renderable dataset is 5,636 points (4,360 monster spawns and 751 gathering spawns are the largest groups); the page passes prerendered props to client-side deck.gl
- **SSR**: Map data prerendered at build time; deck.gl initializes client-side

## Key Files

```
src/
├── routes/map/
│   ├── +page.server.ts   # Prerenders map data at build time
│   └── +page.svelte      # Main map component
├── lib/
│   ├── map/
│   │   ├── config.ts     # World bounds, colors, view settings
│   │   ├── layers.ts     # Layer factory functions
│   │   ├── marker-registry.ts # Marker precedence and presentation metadata
│   │   └── CLAUDE.md     # This file
│   ├── queries/
│   │   ├── map.server.ts # Server-side queries for prerendering
│   │   └── map-search.ts # Client-side map search queries
│   ├── types/
│   │   └── map.ts        # Map entity type definitions
│   └── components/map/
│       ├── sidebar/           # MapSidebar and sidebar controls
│       ├── MapTooltip.svelte  # Hover tooltip
│       ├── EntityPopup.svelte # Click detail panel
│       ├── ZonePopup.svelte   # Zone detail panel
│       ├── ItemPopup.svelte   # Item detail panel
│       ├── QuestPopup.svelte  # Quest detail panel
│       └── MapSearch.svelte   # Entity search
```

## Registry migration status

`marker-registry.ts` is the source of truth for marker precedence and presentation
metadata. Render-data partitioning, layer fallback styling, URL marker defaults, and
marker-specific sidebar quick toggles consume the registry. The migration is in progress:
selection, popup/tooltip dispatch, search, wayfinding, and the remaining hand-maintained
layer/config switches still follow the existing architecture until their clean cutover.
Do not add a second marker-specific registry or compatibility shim.

## Coordinate System

```
Game coordinates → deck.gl:
- Game X (horizontal) → deck.gl X (direct)
- Game Z (forward)    → deck.gl Y (negated: Y = -Z)
- Game Y (height)     → ignored for 2D map

World bounds:
- Game: X [-880, 920], Z [-740, 1460]
- deck.gl: X [-880, 920], Y [-1460, 740]
- Center: [10, -280]
```

**Why negate Z?** Without negation, the map would appear vertically mirrored (north at bottom). The negation ensures north (high game Z) displays at the top of the map (low deck.gl Y, since screen Y increases downward).

## Entity IDs vs Spawn IDs

Spawn tables (`monster_spawns`, `npc_spawns`, etc.) have their own `id` field, but for linking to detail pages we need the **entity ID** (`monster_id`, `npc_id`).

```sql
-- Use monster_id for links, not ms.id
SELECT ms.monster_id, ...
FROM monster_spawns ms
```

The `id` field in `MapEntity` should contain the entity ID (for URL generation), not the spawn ID.

## Layer Stack (bottom to top)

The array returned by `createLayers()` renders these layers in order:

1. **Background**
2. **Tiles**
3. **Parent zones**
4. **Sub-zones**
5. **Zone highlight**
6. **Patrol paths**
7. **Wander ranges**
8. **Altar event radius**
9. **Relation arcs**
10. **Relation arc endpoints**
11. **Portal arcs**
12. **Teleporter arcs**
13. **Creatures**
14. **Gathering plants**
15. **Gathering minerals**
16. **Fishing gathering**
17. **Gathering sparks**
18. **Other gathering**
19. **Alchemy tables**
20. **Forges**
21. **Cooking ovens**
22. **Scribing tables**
23. **Hunts**
24. **Chests**
25. **Houses**
26. **Treasure**
27. **Portals**
28. **Portal destinations**
29. **Teleporter destinations**
30. **NPCs**
31. **Altars**
32. **Elites**
33. **Fabled**
34. **Bosses**
35. **Related highlight outline and fill**
36. **Selection highlight outline and fill**
37. **Primary selection highlight outline and fill**
38. **Hover highlight outline and fill**
39. **Zone hover highlight**

## Adding a New Entity Layer

1. **Add type** in `src/lib/types/map.ts`:
   - Add to `EntityType` union
   - Create interface extending `MapEntity`
   - Add to `AnyMapEntity` union
   - Add toggle to `LayerVisibility`

2. **Add query** in `src/lib/queries/map.server.ts`:
   - Create a server query function returning typed array
   - Add to `loadAllMapEntitiesServer()`
   - Add to `MapEntityData` interface

3. **Add layer** in `src/lib/map/layers.ts`:
   - Add color to `LAYER_COLORS` in config.ts
   - Add radius to `LAYER_RADII` in config.ts
   - Create ScatterplotLayer in `createLayers()`

4. **Add toggle** in `MapSidebarContent.svelte`:
   - Add to the layer controls with key, label, and color

## Layer Colors (Tailwind)

| Entity / layer    | Color                | Tailwind    |
| ----------------- | -------------------- | ----------- |
| Monster           | `rgb(239, 68, 68)`   | red-500     |
| Boss              | `rgb(6, 182, 212)`   | cyan-500    |
| Fabled            | `rgb(16, 185, 129)`  | emerald-500 |
| Elite             | `rgb(168, 85, 247)`  | purple-500  |
| Hunt              | `rgb(234, 179, 8)`   | yellow-500  |
| NPC               | `rgb(59, 130, 246)`  | blue-500    |
| Portal            | `rgb(34, 197, 94)`   | green-500   |
| Chest             | `rgb(14, 165, 233)`  | sky-500     |
| Treasure          | `rgb(20, 184, 166)`  | teal-500    |
| Altar             | `rgb(249, 115, 22)`  | orange-500  |
| Gathering plant   | `rgb(132, 204, 22)`  | lime-500    |
| Gathering mineral | `rgb(23, 37, 84)`    | blue-950    |
| Gathering spark   | `rgb(168, 85, 247)`  | purple-500  |
| Gathering fish    | `rgb(6, 182, 212)`   | cyan-500    |
| Gathering other   | `rgb(156, 163, 175)` | gray-400    |
| Crafting          | `rgb(139, 92, 246)`  | violet-500  |
| Scribing          | `rgb(168, 85, 247)`  | purple-500  |
| House             | `rgb(245, 158, 11)`  | amber-500   |

## deck.gl Integration

**Dynamic import pattern** (prevents SSR issues):

```typescript
onMount(async () => {
  const [deckCore, deckLayers] = await Promise.all([
    import("@deck.gl/core"),
    import("@deck.gl/layers"),
  ]);

  const { Deck, OrthographicView } = deckCore;
  const { ScatterplotLayer, PolygonLayer } = deckLayers;

  // Initialize deck instance...
});
```

**View configuration:**

```typescript
new OrthographicView({})  // Default: Y increases upward

initialViewState: {
  target: [10, -280, 0],  // Center of world
  zoom: 0,
  minZoom: -3,
  maxZoom: 4,
}
```

## Entity Counts (estimated)

- Monsters: ~10,000
- Gathering: ~5,000
- NPCs: ~500
- Chests: ~300
- Portals: ~200
- Crafting: ~100
- Altars: ~50
- **Total: ~16,000 points**

deck.gl handles millions of points efficiently, but **layer recreation is expensive**.

## Performance Design

**Problem**: Toggling visibility or selecting entities caused multi-second freezes because every state change triggered full layer recreation.

**Solution**: Pre-filter once, create all layers always, use deck.gl's optimization features.

1. **Pre-filter data on load** (`FilteredMapData` type):
   - Split monsters into creatures, hunts, elites, fabled, and bosses once
   - Split gathering into plant, mineral, fish, spark, and other arrays once
   - Filter portals with destinations once
   - Calculate parent zone bounds once

2. **Create all layers always** with `visible` prop:
   - Don't conditionally create layers based on visibility
   - Set `visible: visibility.creatures` on each layer
   - deck.gl skips rendering invisible layers efficiently

3. **Use `updateTriggers`** for dynamic properties:
   - Tells deck.gl which accessor changed
   - Avoids full data re-upload to GPU

   ```typescript
   updateTriggers: {
     getColor: selectedPortalId,  // re-evaluate getColor when this changes
   }
   ```

4. **Use `DataFilterExtension`** for level filtering:
   - GPU-based filtering, no JS array recreation
   - Pass all data, filter on GPU with `filterRange`

   ```typescript
   extensions: [new DataFilterExtension({ filterSize: 1 })],
   getFilterValue: d => d.level,
   filterRange: [levelFilter.min, levelFilter.max],
   ```

5. **Pre-compute derived data with `$derived`** (Svelte 5):
   - Never compute data inside `createLayers()` - it runs on every state change
   - Use `$derived` in the page component for data that depends on specific state
   - Svelte caches the result; only recomputes when dependencies change

   ```typescript
   // selection.ts - pure function
   export function computeSelectionData(data, type, id): AnyMapEntity[];

   // +page.svelte - cached via $derived
   let selectionData = $derived(
     computeSelectionData(entityData, selectedEntityType, selectedEntityId),
   );
   ```

   - Pass pre-computed arrays to `createLayers()` as parameters
   - Use `EMPTY_SELECTION` constant for stable empty array references

**Key insight**: deck.gl is fast at rendering; the bottleneck is JS computation inside `createLayers()`.

## Tile Generation

Tiles are generated by `build-pipeline/src/compendium/commands/tiles.py`. The pipeline:

1. **Stitch**: Combine screenshot grid into single world image (north at top)
2. **Validate**: Check non-excluded boss/world-boss spawn positions for blank/black screenshot coverage
3. **Blank**: Black out excluded zones (e.g., dungeons)
4. **Tile**: Generate pyramid at zoom levels -3 to 3

**Coordinate handling:**

- Source image: North (high game Z) at top
- deck.gl TileLayer uses Y = -game_Z for tile indices
- Each tile crop is flipped vertically to match BitmapLayer's expectation (image top → maxY)

To regenerate tiles: `cd build-pipeline && uv run compendium tiles`

If `compendium tiles` fails boss-position screenshot validation, do not bypass it. Re-run the in-game screenshot export with the minimal automated mod set, then regenerate tiles.

Delete `exported-data/screenshots/stitched/world.png` to force re-stitching.
