const DOMAIN_DIRECTORIES = {
  achievement: "achievements",
  item: "items",
  monster: "monsters",
  npc: "npcs",
  pet: "pets",
  skill: "skills",
  class: "classes",
  profession: "professions",
  gathering_resource: "gathering_resources",
  chest: "chests",
  zone: "zones",
} as const;

export type EntityImageDomain = keyof typeof DOMAIN_DIRECTORIES;

const ENTITY_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Build the URL for artwork published by the compendium pipeline.
 *
 * This intentionally preserves entity ids. The pipeline validates the same character
 * set before writing files, so changing an id here would hide a broken export rather
 * than fix it.
 */
export function entityImageUrl(
  domain: EntityImageDomain,
  entityId: string,
  kind: string,
): string {
  if (!ENTITY_SEGMENT_PATTERN.test(entityId)) {
    throw new Error(`Invalid entity id for artwork: ${entityId}`);
  }
  if (!ENTITY_SEGMENT_PATTERN.test(kind)) {
    throw new Error(`Invalid artwork kind: ${kind}`);
  }
  return `/images/${DOMAIN_DIRECTORIES[domain]}/${entityId}/${kind}.webp`;
}
