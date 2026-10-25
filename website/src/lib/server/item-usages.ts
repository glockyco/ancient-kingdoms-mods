import type Database from "better-sqlite3";
import type { AcquisitionModel } from "$lib/acquisition/types";
import { projectItemUsages } from "$lib/acquisition/projections";
import type { ItemUsages } from "$lib/types/item-sources";
import { loadItemSourceModel, sourceEntity } from "./item-sources";
import type { Season } from "$lib/data/seasonal-events";

export function itemUsagesFromModel(
  model: AcquisitionModel,
  itemId: string,
): ItemUsages {
  const result: ItemUsages = {
    recipes: [],
    quests: [],
    currency: [],
    altars: [],
    portals: [],
    chests: [],
    merges: [],
  };
  const name = (kind: string, id: unknown): string =>
    String(sourceEntity(model, kind, id)?.name ?? id ?? "");
  const number = (kind: string, id: unknown, key: string): number =>
    Number(sourceEntity(model, kind, id)?.[key] ?? 0);
  for (const use of projectItemUsages(model, itemId)) {
    const method = use.method;
    const detail = method?.detail;
    const amount =
      use.amount.kind === "exact"
        ? use.amount.value
        : use.amount.kind === "range"
          ? use.amount.min
          : 1;
    if (method?.kind === "recipe" && detail && use.kind === "cost") {
      const resultId = String(detail.declared_result_item_id);
      result.recipes.push({
        item_id: itemId,
        recipe_id: String(
          detail.crafting_recipe_id ??
            detail.alchemy_recipe_id ??
            detail.scribing_recipe_id,
        ),
        recipe_type: detail.alchemy_recipe_id
          ? "alchemy"
          : detail.scribing_recipe_id
            ? "scribing"
            : "crafting",
        amount,
        result_item_id: resultId,
        result_item_name: name("items", resultId),
        result_amount: Number(detail.result_amount),
        tier: Number(detail.tier),
      });
    } else if (use.kind === "objective" && use.entity?.kind === "quest") {
      const id = use.entity.id;
      const quest = sourceEntity(model, "quests", id);
      const classes =
        model.rows.facts.quest_class_requirements
          ?.filter((row) => row.quest_id === id)
          .map((row) => (row.withheld ? "unpublished class" : row.class_id)) ??
        [];
      const purpose =
        use.role === "gather_counter"
          ? "gather"
          : use.role === "brew_counter"
            ? "brew"
            : use.role === "equipped"
              ? "equip"
              : quest?.remove_items_on_complete
                ? "required"
                : "have";
      result.quests.push({
        item_id: itemId,
        quest_id: id,
        quest_name: name("quests", id),
        quest_level_required: number("quests", id, "level_required"),
        quest_level_recommended: number("quests", id, "level_recommended"),
        purpose,
        amount,
        is_repeatable: Boolean(
          quest?.is_repeatable || quest?.is_adventurer_quest,
        ),
        class_restrictions: classes.length ? JSON.stringify(classes) : null,
      });
    } else if (method?.kind === "vendor" && detail && use.kind === "cost") {
      const id = String(detail.offered_item_id);
      result.currency.push({
        currency_item_id: itemId,
        purchasable_item_id: id,
        purchasable_item_name: name("items", id),
        purchasable_quality: number("items", id, "quality"),
        npc_id: String(detail.npc_id),
        npc_name: name("npcs", detail.npc_id),
        price: amount,
        season: detail.season as Season | null,
      });
    } else if (method?.kind === "altar_activate" && detail) {
      const altar = sourceEntity(model, "altars", detail.altar_id);
      result.altars.push({
        item_id: itemId,
        altar_id: String(detail.altar_id),
        altar_name: name("altars", detail.altar_id),
        altar_type: String(altar?.type ?? ""),
        zone_id: String(altar?.zone_id ?? ""),
        zone_name: name("zones", altar?.zone_id),
      });
    } else if (use.entity?.kind === "portal") {
      const portal = sourceEntity(model, "portals", use.entity.id);
      const location = use.useLocations.find((location) => location.position);
      if (!portal) continue;
      result.portals.push({
        item_id: itemId,
        portal_id: portal.id,
        from_zone_id: String(portal.from_zone_id ?? ""),
        from_zone_name: name("zones", portal.from_zone_id),
        to_zone_id: String(portal.to_zone_id ?? ""),
        to_zone_name: portal.to_zone_id
          ? name("zones", portal.to_zone_id)
          : "Unknown destination",
        position_x: location?.position?.x ?? null,
        position_y: location?.position?.y ?? null,
      });
    } else if (
      method?.kind === "world_chest" &&
      detail &&
      use.role !== "lockpick"
    ) {
      const provider = method.providers.find(
        (provider) => provider.ref.kind === "chests",
      );
      const location = provider?.location;
      if (!location) continue;
      result.chests.push({
        item_id: itemId,
        chest_id: String(detail.chest_id),
        chest_name: name("chests", detail.chest_id),
        zone_id: location.zoneId ?? "",
        zone_name: name("zones", location.zoneId),
        position_x: location.position?.x ?? null,
        position_y: location.position?.y ?? null,
      });
    } else if (method?.kind === "merge" && use.kind === "cost") {
      for (const output of method.outputs)
        if (output.item_id)
          result.merges.push({
            item_id: itemId,
            result_item_id: output.item_id,
            result_item_name: name("items", output.item_id),
            result_quality: number("items", output.item_id, "quality"),
            all_components: method.costGroups
              .flatMap((group) => group.inputs)
              .filter((input) => input.resource_kind === "item")
              .map((input) => ({
                item_id: input.item_id ?? "",
                item_name: input.withheld
                  ? "Unpublished component"
                  : name("items", input.item_id),
              })),
          });
    }
  }
  for (const key of Object.keys(result) as (keyof ItemUsages)[])
    (result[key] as unknown[]) = [
      ...new Map(
        (result[key] as unknown[]).map((row) => [JSON.stringify(row), row]),
      ).values(),
    ];
  return result;
}
export async function getItemUsages(
  db: Database.Database,
  itemId: string,
): Promise<ItemUsages> {
  return itemUsagesFromModel(await loadItemSourceModel(db, [itemId]), itemId);
}
export async function getRecipeUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).recipes;
}
export async function getQuestUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).quests;
}
export async function getCurrencyUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).currency;
}
export async function getAltarUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).altars;
}
export async function getPortalUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).portals;
}
export async function getChestUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).chests;
}
export async function getMergeUsages(db: Database.Database, itemId: string) {
  return (await getItemUsages(db, itemId)).merges;
}
