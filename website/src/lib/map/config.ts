/**
 * World bounds from the game (Y is negated for display)
 * Original game bounds: X [-880, 900], Y [-740, 1300]
 */
export const WORLD_BOUNDS = {
  minX: -880,
  maxX: 900,
  minY: -1300,
  maxY: 740,
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
  maxZoom: 6,
};

/**
 * Layer colors matching the design system (Tailwind colors as RGB)
 */
export const LAYER_COLORS = {
  monster: [239, 68, 68] as [number, number, number], // red-500
  boss: [6, 182, 212] as [number, number, number], // cyan-500
  elite: [168, 85, 247] as [number, number, number], // purple-500
  npc: [59, 130, 246] as [number, number, number], // blue-500
  portal: [34, 197, 94] as [number, number, number], // green-500
  chest: [14, 165, 233] as [number, number, number], // sky-500
  altar: [249, 115, 22] as [number, number, number], // orange-500
  gathering_plant: [132, 204, 22] as [number, number, number], // lime-500
  gathering_mineral: [245, 158, 11] as [number, number, number], // amber-500
  gathering_spark: [168, 85, 247] as [number, number, number], // purple-500
  crafting: [139, 92, 246] as [number, number, number], // violet-500
} as const;

/**
 * Layer radii in pixels
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
 * Background color for the map (when tiles are not available)
 */
export const BACKGROUND_COLOR = [24, 24, 27, 255] as const; // zinc-900

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
  fill: [255, 255, 255, 60] as [number, number, number, number], // white with low alpha
} as const;

/**
 * Patrol path colors
 */
export const PATROL_COLORS = {
  path: [250, 204, 21, 200] as [number, number, number, number], // yellow-400
  waypoint: [250, 204, 21, 255] as [number, number, number, number], // yellow-400 solid
} as const;
