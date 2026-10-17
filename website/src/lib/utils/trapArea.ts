/**
 * Trap areas are exported as closed rings of world-space points, one per
 * collider path. A world unit is the yard the game's tooltips show, as in
 * "4 yd range", so areas read in yd like every other distance.
 */
export type TrapAreaRing = [number, number][];

export function parseTrapAreaRings(json: string | null): TrapAreaRing[] | null {
  if (json === null) return null;
  const rings = JSON.parse(json) as TrapAreaRing[];
  return rings.length > 0 ? rings : null;
}

/**
 * Describe rectangles by their side lengths and irregular areas by their
 * bounding box. Only the map outline shows which ground inside is covered.
 */
export function formatTrapArea(rings: TrapAreaRing[]): string {
  const [width, height] = getExtent(rings);

  if (rings.length === 1 && isRectangle(rings[0])) {
    return `${width} × ${height} yd`;
  }
  return `irregular, fits within ${width} × ${height} yd`;
}

/** Width and height of the area, rounded to the tenth of a unit shown. */
function getExtent(rings: TrapAreaRing[]): [number, number] {
  const xs = rings.flatMap((ring) => ring.map(([x]) => x));
  const ys = rings.flatMap((ring) => ring.map(([, y]) => y));
  return [
    Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10,
    Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10,
  ];
}

/**
 * A ring is a rectangle when its four corners share two x and two y values at
 * display precision, so a collider nudged a fraction of a degree off axis still
 * reads as the box it is.
 */
function isRectangle(ring: TrapAreaRing): boolean {
  if (ring.length !== 4) return false;

  const xs = new Set(ring.map(([x]) => Math.round(x * 10)));
  const ys = new Set(ring.map(([, y]) => Math.round(y * 10)));
  return xs.size === 2 && ys.size === 2;
}
