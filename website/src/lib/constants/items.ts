import { STAT_FIELDS } from "$lib/generated/stat-vocabulary";

export const ITEM_STAT_FIELDS = STAT_FIELDS.filter(
  (field) => field.source === "item",
);
