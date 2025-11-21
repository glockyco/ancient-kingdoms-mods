/**
 * Stats fields that are metadata, not actual stats to display.
 * These are filtered out when showing item stats on the detail page.
 */
export const STATS_METADATA_FIELDS = [
  "max_durability",
  "has_serenity",
  "is_costume",
  "augment_bonus_set",
] as const;
