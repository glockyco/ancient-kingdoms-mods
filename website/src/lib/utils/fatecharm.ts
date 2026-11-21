import type { AcquisitionModel, MethodView } from "$lib/acquisition/types";

export interface FatecharmItem {
  id: string;
  name: string;
}

/** The Fatecharm resolved for this kill context. */
export function monsterFatecharm(
  model: AcquisitionModel,
  method: MethodView,
): FatecharmItem | null {
  const id = method.detail.fatecharm_item_id;
  if (typeof id !== "string") return null;
  const item = model.entities.get("items")?.get(id);
  if (typeof item?.name !== "string")
    throw new Error(`Missing Fatecharm item ${id}`);
  return { id, name: item.name };
}
