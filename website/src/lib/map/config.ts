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
export const INITIAL_VIEW_STATE = {
  target: [10, -280, 0] as [number, number, number],
  zoom: 0,
  minZoom: -2,
  maxZoom: 6,
} as const;

/**
 * Layer colors matching the design system (Tailwind colors as RGB)
 */
export const LAYER_COLORS = {
  monster: [239, 68, 68] as [number, number, number], // red-500
  boss: [6, 182, 212] as [number, number, number], // cyan-500
  elite: [168, 85, 247] as [number, number, number], // purple-500
  npc: [59, 130, 246] as [number, number, number], // blue-500
  portal: [34, 197, 94] as [number, number, number], // green-500
  chest: [234, 179, 8] as [number, number, number], // yellow-500
  altar: [249, 115, 22] as [number, number, number], // orange-500
  gathering_plant: [132, 204, 22] as [number, number, number], // lime-500
  gathering_mineral: [156, 163, 175] as [number, number, number], // gray-400
  gathering_spark: [236, 72, 153] as [number, number, number], // pink-500
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
