/**
 * House chest item ids and their account-chest slot ranges.
 *
 * The game does not expose this mapping as runtime data: the slot ranges
 * are inlined branches inside `PlayerChest.AnySlotFree()` (and mirrored in
 * `UIChest`), keyed off the interactable's display name. Both the website
 * and the inventory mechanics page need to know the same eight ids and
 * their slot windows, so the constants live here as a single source of
 * truth. When the game adds or renames a chest tier, update this file.
 *
 * Source: server-scripts/PlayerChest.cs:20-80 — chest name prefixes map to fixed 30-slot sections.
 * Source: server-scripts/UIChest.cs — UI renders the same eight sections.
 */
export const HOUSE_CHEST_SLOT_RANGES: ReadonlyMap<
  string,
  readonly [number, number]
> = new Map([
  ["wooden_chest", [0, 29]],
  ["red_chest", [30, 59]],
  ["blue_chest", [60, 89]],
  ["stone_chest", [90, 119]],
  ["granite_chest", [120, 149]],
  ["sturdy_chest", [150, 179]],
  ["rustic_chest", [180, 209]],
  ["guardian_box", [210, 239]],
] as const);

/** Returns true when the given item id is one of the eight house chest structures. */
export function isHouseChestItemId(itemId: string): boolean {
  return HOUSE_CHEST_SLOT_RANGES.has(itemId);
}
