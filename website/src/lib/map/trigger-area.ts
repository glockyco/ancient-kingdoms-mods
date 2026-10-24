/** Enough segments that a circle's outline stays within 0.1% of its radius. */
const CIRCLE_SEGMENTS = 96;

/**
 * The outline of a trigger area in map coordinates, which negate the game's y.
 * A circle is centred on the row's position. Returns undefined when the row has
 * no area, including after position suppression removed its geometry.
 */
export function triggerAreaRing(
  row: Readonly<Record<string, unknown>>,
): [number, number][] | undefined {
  if (
    row.area_shape === "circle" &&
    typeof row.area_radius === "number" &&
    typeof row.position_x === "number" &&
    typeof row.position_y === "number"
  ) {
    const { area_radius: radius, position_x: x, position_y: y } = row;
    return Array.from({ length: CIRCLE_SEGMENTS }, (_, index) => {
      const angle = (2 * Math.PI * index) / CIRCLE_SEGMENTS;
      return [x + radius * Math.cos(angle), -(y + radius * Math.sin(angle))];
    });
  }
  if (row.area_shape === "polygon" && typeof row.area_paths === "string") {
    const [ring] = JSON.parse(row.area_paths) as [number, number][][];
    return ring.map(([x, y]) => [x, -y]);
  }
  return undefined;
}
