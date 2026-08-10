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
  minZoom: -3,
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
  minZoom: -3,
  maxZoom: 4,
};

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
  // Selection highlight (subtle fill, visible stroke)
  selectedZone: {
    fill: [250, 204, 21, 10] as [number, number, number, number], // yellow-400 with very low alpha
    stroke: [250, 204, 21, 200] as [number, number, number, number], // yellow-400
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
  trap: {
    source: [225, 29, 72, 200] as [number, number, number, number], // rose-600
    target: [225, 29, 72, 100] as [number, number, number, number],
  },
  trapHighlight: {
    source: [251, 113, 133, 255] as [number, number, number, number], // rose-400
    target: [251, 113, 133, 200] as [number, number, number, number],
  },
  teleporter: {
    source: [6, 182, 212, 200] as [number, number, number, number], // cyan-500
    target: [6, 182, 212, 100] as [number, number, number, number],
  },
  teleporterHighlight: {
    source: [6, 250, 212, 255] as [number, number, number, number], // brighter cyan
    target: [6, 250, 212, 200] as [number, number, number, number],
  },
} as const;

/**
 * Selection highlight colors
 */
export const HIGHLIGHT_COLORS = {
  // Dark outline for all rings (improves visibility on bright backgrounds like snow)
  ringOutline: [0, 0, 0, 255] as [number, number, number, number], // full opacity black
  // Group highlight (all spawns of the same entity type)
  ring: [255, 255, 255, 255] as [number, number, number, number], // white
  fill: [255, 255, 255, 40] as [number, number, number, number], // white with low alpha
  // Primary highlight (the actual clicked entity)
  primaryRing: [250, 204, 21, 255] as [number, number, number, number], // yellow-400
  primaryFill: [250, 204, 21, 80] as [number, number, number, number], // yellow-400 with alpha
  // Related entity colors (for blocker spawns when selecting a summon spawn)
  relatedRing: [251, 146, 60, 255] as [number, number, number, number], // orange-400
  relatedFill: [251, 146, 60, 60] as [number, number, number, number], // orange-400 with low alpha
  // Hover preview (yellow to contrast with white selection highlights)
  hoverRing: [250, 204, 21, 255] as [number, number, number, number], // yellow-400
  hoverFill: [250, 204, 21, 40] as [number, number, number, number], // yellow-400 with low alpha
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
 * Wander range colors (for selected entity)
 */
export const MOVEMENT_COLORS = {
  wanderFill: [96, 165, 250, 25] as [number, number, number, number], // blue-400, 10% fill
  wanderStroke: [96, 165, 250, 200] as [number, number, number, number], // blue-400, 80% stroke
} as const;

/**
 * Altar event radius colors (for selected altar)
 */
export const ALTAR_RADIUS_COLORS = {
  fill: [251, 146, 60, 25] as [number, number, number, number], // orange-400, 10% fill
  stroke: [251, 146, 60, 200] as [number, number, number, number], // orange-400, 80% stroke
} as const;

/**
 * Trap area colors for the selected trap. The dark halo keeps the outline
 * readable on bright terrain such as the Winterforge ice.
 */
export const TRAP_AREA_COLORS = {
  fill: [244, 63, 94, 70] as [number, number, number, number], // rose-500, 27% fill
  stroke: [255, 228, 230, 255] as [number, number, number, number], // rose-100
  halo: [136, 19, 55, 255] as [number, number, number, number], // rose-900
} as const;

/**
 * Relation arc colors (summon spawn → blocker connections)
 */
export const RELATION_ARC_COLORS = {
  arc: [251, 146, 60, 180] as [number, number, number, number], // orange-400 with some transparency
  endpoint: [251, 146, 60, 255] as [number, number, number, number], // orange-400 solid
} as const;

/**
 * Fly-to animation configuration
 */
export const FLY_TO_CONFIG = {
  /** Duration in ms for animated fly-to transitions */
  duration: 800,
  /** Padding multiplier for bounds (1.2 = 20% extra space around content) */
  padding: 1.2,
  /** Maximum zoom level when flying to bounds */
  maxZoom: 2,
  /** World units of padding when creating bounds from a single position */
  singlePointPadding: 50,
} as const;
