import type { TrapMapEntity } from "$lib/types/map";

/**
 * Return the map polygon for a wall trap's axis-aligned overlap box.
 *
 * Source: server-scripts/WallTrap.cs:37 — the game anchors the box at the
 * trap position and extends it downward by its full height. Map Y coordinates
 * are negated, so the box extends toward increasing map Y.
 */
export function getWallTrapAreaPolygon(
  trap: Pick<TrapMapEntity, "position" | "trapWidth" | "trapHeight">,
): [number, number][] | null {
  if (
    trap.position === null ||
    trap.trapWidth === null ||
    trap.trapHeight === null ||
    trap.trapWidth <= 0 ||
    trap.trapHeight <= 0
  ) {
    return null;
  }

  const [x, y] = trap.position;
  const halfWidth = trap.trapWidth / 2;
  return [
    [x - halfWidth, y],
    [x + halfWidth, y],
    [x + halfWidth, y + trap.trapHeight],
    [x - halfWidth, y + trap.trapHeight],
  ];
}
