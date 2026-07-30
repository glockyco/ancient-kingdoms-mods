/**
 * Trap areas are exported as closed rings of world-space points, one per
 * collider path. A tile is one world unit: the game spawns trap effect visuals
 * on a 1-unit grid across the area.
 *
 * Source: server-scripts/DangerousGround.cs:96-112
 */
export type TrapAreaRing = [number, number][];

export function parseTrapAreaRings(json: string | null): TrapAreaRing[] | null {
  if (json === null) return null;
  const rings = JSON.parse(json) as TrapAreaRing[];
  return rings.length > 0 ? rings : null;
}

/** Tiles covered by the rings, via the shoelace formula. */
export function getTrapAreaTiles(rings: TrapAreaRing[]): number {
  let tiles = 0;
  for (const ring of rings) {
    let doubled = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      doubled += x1 * y2 - x2 * y1;
    }
    tiles += Math.abs(doubled) / 2;
  }
  return tiles;
}

/**
 * Describe an area the way its shape allows: a rectangle by its side lengths,
 * anything else by the tiles it covers, since a bounding box would overstate
 * the reach of an L-shaped or diagonal patch.
 */
export function formatTrapArea(rings: TrapAreaRing[]): string {
  if (rings.length === 1) {
    const rectangle = getRectangleSides(rings[0]);
    if (rectangle) return `${rectangle[0]} × ${rectangle[1]} tiles`;
  }

  const tiles = getTrapAreaTiles(rings);
  const rounded = tiles < 10 ? Math.round(tiles * 10) / 10 : Math.round(tiles);
  return `~${rounded} ${rounded === 1 ? "tile" : "tiles"}`;
}

/**
 * Side lengths of a rectangle, or null for any other shape. Coordinates are
 * quantised to a tenth of a tile, which is the display precision anyway, so a
 * collider nudged a fraction of a degree off axis still reads as the box it is.
 */
function getRectangleSides(ring: TrapAreaRing): [number, number] | null {
  if (ring.length !== 4) return null;

  const xs = [...new Set(ring.map(([x]) => Math.round(x * 10)))];
  const ys = [...new Set(ring.map(([, y]) => Math.round(y * 10)))];
  if (xs.length !== 2 || ys.length !== 2) return null;

  return [Math.abs(xs[0] - xs[1]) / 10, Math.abs(ys[0] - ys[1]) / 10];
}
