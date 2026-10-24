import type { AcquisitionModel, MethodView } from "$lib/acquisition/types";

export interface FatecharmItem {
  id: string;
  name: string;
}

/**
 * The Fatecharm a boss kill context can consume: its loot zone's configured
 * boss luck token, when that zone is a dungeon with a positive boss bonus.
 */
export function monsterFatecharm(
  model: AcquisitionModel,
  method: MethodView,
): FatecharmItem | null {
  if (
    method.detail.is_boss !== 1 ||
    method.detail.loot_zone_withheld ||
    Number(method.detail.loot_zone_number) <= 0
  )
    return null;
  const zoneId = String(method.detail.loot_zone_id);
  const zone = model.entities.get("zones")?.get(zoneId);
  if (!zone?.is_dungeon) return null;
  const reference = model.rows.facts.luck_tokens?.find(
    (row) => row.zone_id === zoneId,
  );
  if (typeof reference?.boss_luck_token_id !== "string") return null;
  const item = model.entities.get("items")?.get(reference.boss_luck_token_id);
  if (typeof item?.name !== "string")
    throw new Error(`Missing Fatecharm item ${reference.boss_luck_token_id}`);
  return { id: reference.boss_luck_token_id, name: item.name };
}
