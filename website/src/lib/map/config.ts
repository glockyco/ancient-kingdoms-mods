/**
 * World bounds from the game (Y is negated for display)
 * Original game bounds: X [-880, 920], Z [-740, 1460]
 * deck.gl Y = -game Z, so: Y [-1460, 740]
 */
export const WORLD_BOUNDS = {
  minX: -880,
  maxX: 920,
  minY: -1460,
  maxY: 740,
} as const;

/**
 * Map tile configuration
 */
export const TILE_CONFIG = {
  url: "/tiles/{z}/{x}/{y}.webp",
  minZoom: 0,
  maxZoom: 3,
  tileSize: 256,
} as const;

/**
 * Initial view state for the deck.gl map
 */
export const INITIAL_VIEW_STATE: {
  target: [number, number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
} = {
  target: [10, -280, 0],
  zoom: 0,
  minZoom: -2,
  maxZoom: 4,
};

/**
 * Layer colors matching the design system (Tailwind colors as RGB)
 */
export const LAYER_COLORS = {
  monster: [239, 68, 68] as [number, number, number], // red-500
  boss: [6, 182, 212] as [number, number, number], // cyan-500
  elite: [168, 85, 247] as [number, number, number], // purple-500
  hunt: [234, 179, 8] as [number, number, number], // yellow-500
  npc: [59, 130, 246] as [number, number, number], // blue-500
  portal: [34, 197, 94] as [number, number, number], // green-500
  chest: [14, 165, 233] as [number, number, number], // sky-500
  altar: [249, 115, 22] as [number, number, number], // orange-500
  gathering_plant: [132, 204, 22] as [number, number, number], // lime-500
  gathering_mineral: [120, 113, 108] as [number, number, number], // stone-500
  gathering_spark: [168, 85, 247] as [number, number, number], // purple-500
  crafting: [139, 92, 246] as [number, number, number], // violet-500
} as const;

/**
 * Layer radii in pixels (used for ScatterplotLayer fallback)
 */
export const LAYER_RADII = {
  monster: 4,
  boss: 10,
  elite: 6,
  npc: 5,
  portal: 6,
  chest: 5,
  altar: 7,
  gathering: 3,
  crafting: 5,
} as const;

/**
 * Icon sizes for IconLayer.
 * Size hierarchy: rare/important entities larger, common entities smaller.
 * - base: Base size in pixels at zoom 0
 * - min: Minimum size in pixels (prevents icons from disappearing when zoomed out)
 * - max: Maximum size in pixels (prevents oversizing when zoomed in)
 *
 * Note: These are CSS pixels. On high-DPI screens (2x, 3x), the actual rendered
 * pixels will be multiplied by devicePixelRatio, so these values should be
 * generous enough to remain visible and clickable.
 */
export const ICON_SIZES = {
  boss: { base: 32, min: 28, max: 64 },
  elite: { base: 26, min: 24, max: 56 },
  altar: { base: 26, min: 24, max: 56 },
  npc: { base: 18, min: 16, max: 40 },
  portal: { base: 22, min: 20, max: 48 },
  chest: { base: 20, min: 18, max: 44 },
  crafting_station: { base: 20, min: 18, max: 44 },
  alchemy_table: { base: 20, min: 18, max: 44 },
  cooking_oven: { base: 20, min: 18, max: 44 },
  hunt: { base: 18, min: 16, max: 40 },
  monster: { base: 18, min: 16, max: 40 },
  gathering_plant: { base: 16, min: 14, max: 36 },
  gathering_mineral: { base: 16, min: 14, max: 36 },
  gathering_spark: { base: 16, min: 14, max: 36 },
} as const;

/**
 * Background color for the map
 */
export const BACKGROUND_COLOR = [0, 0, 0, 255] as const;

/**
 * Zone boundary colors
 */
export const ZONE_COLORS = {
  subZone: {
    fill: [100, 116, 139, 30] as [number, number, number, number], // slate-500 with low alpha
    stroke: [100, 116, 139, 150] as [number, number, number, number],
  },
  parentZone: {
    fill: [168, 85, 247, 20] as [number, number, number, number], // purple-500 with low alpha
    stroke: [168, 85, 247, 120] as [number, number, number, number],
  },
} as const;

/**
 * Portal arc colors
 */
export const ARC_COLORS = {
  portal: {
    source: [34, 197, 94, 200] as [number, number, number, number], // green-500
    target: [34, 197, 94, 100] as [number, number, number, number],
  },
  portalHighlight: {
    source: [34, 250, 94, 255] as [number, number, number, number], // brighter green
    target: [34, 250, 94, 200] as [number, number, number, number],
  },
} as const;

/**
 * Selection highlight colors
 */
export const HIGHLIGHT_COLORS = {
  ring: [255, 255, 255, 255] as [number, number, number, number], // white
  fill: [255, 255, 255, 40] as [number, number, number, number], // white with low alpha
  // Related entity colors (for blocker spawns when selecting a summon spawn)
  relatedRing: [251, 146, 60, 255] as [number, number, number, number], // orange-400
  relatedFill: [251, 146, 60, 60] as [number, number, number, number], // orange-400 with low alpha
} as const;

/**
 * Patrol path colors
 */
export const PATROL_COLORS = {
  path: [250, 204, 21, 200] as [number, number, number, number], // yellow-400
  waypoint: [250, 204, 21, 255] as [number, number, number, number], // yellow-400 solid
  spawnConnection: [250, 204, 21, 100] as [number, number, number, number], // yellow-400 dimmer
} as const;

/**
 * Relation arc colors (summon spawn → blocker connections)
 */
export const RELATION_ARC_COLORS = {
  arc: [251, 146, 60, 180] as [number, number, number, number], // orange-400 with some transparency
  endpoint: [251, 146, 60, 255] as [number, number, number, number], // orange-400 solid
} as const;

/**
 * Tailwind border color classes for tooltip left border by entity type
 */
export const ENTITY_BORDER_COLORS: Record<string, string> = {
  monster: "border-l-red-500",
  boss: "border-l-cyan-500",
  elite: "border-l-purple-500",
  hunt: "border-l-yellow-500",
  npc: "border-l-blue-500",
  portal: "border-l-green-500",
  chest: "border-l-sky-500",
  altar: "border-l-orange-500",
  gathering_plant: "border-l-lime-500",
  gathering_mineral: "border-l-stone-500",
  gathering_spark: "border-l-purple-500",
  alchemy_table: "border-l-violet-500",
  crafting_station: "border-l-violet-500",
};
