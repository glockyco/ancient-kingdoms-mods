/** @param {ReadonlyArray<{ id: string; is_fishing_spot: number }>} resources */
export function gatheringResourcePageIds(resources) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const resource of resources) {
    ids.add(resource.id);
    if (resource.is_fishing_spot) ids.add(fishingSpotBaseId(resource.id));
  }
  return [...ids];
}

/** @param {string} id */
export function fishingSpotBaseId(id) {
  return id.replace(/_[0-9a-f]{8}$/u, "");
}
