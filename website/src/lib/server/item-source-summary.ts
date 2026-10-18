import type Database from "better-sqlite3";
import type { ItemSourceType } from "$lib/constants/source-types";
import type { AcquisitionModel, MethodView } from "$lib/acquisition/types";
import { projectItemSources } from "$lib/acquisition/projections";
import {
  isAltarTierReward,
  loadItemSourceModel,
  sourceEntity,
} from "./item-sources";

export interface ItemSourceSummary {
  item_id: string;
  type: ItemSourceType;
  id: string;
  name: string;
  source_level: number | null;
}

export function itemSourceSummariesFromModel(
  model: AcquisitionModel,
  itemIds: readonly string[],
): ItemSourceSummary[] {
  const rows: ItemSourceSummary[] = [];
  for (const itemId of itemIds) {
    const view = projectItemSources(model, itemId);
    const awards = new Set(view.methods.map((method) => method.methodId));
    const methods = new Map<string, MethodView>();
    for (const method of [...view.methods, ...view.inspection.offeredAssets])
      if (method.rooted) methods.set(method.methodId, method);
    const add = (
      method: MethodView,
      type: ItemSourceType,
      id: string,
      name: string,
    ) =>
      rows.push({
        item_id: itemId,
        type,
        id,
        name,
        source_level: awards.has(method.methodId)
          ? method.sourceLevelHint
          : null,
      });
    const name = (kind: string, id: unknown) =>
      String(sourceEntity(model, kind, id)?.name ?? id ?? "");
    for (const method of methods.values()) {
      const d = method.detail;
      switch (method.kind) {
        case "kill":
          if (isAltarTierReward(method, itemId))
            add(
              method,
              "altar",
              String(d.altar_id),
              name("altars", d.altar_id),
            );
          else
            add(
              method,
              "drop",
              String(d.monster_id),
              name("monsters", d.monster_id),
            );
          break;
        case "vendor":
          if (d.season === "none")
            add(method, "vendor", String(d.npc_id), name("npcs", d.npc_id));
          break;
        case "quest_accept":
        case "quest_complete":
          add(method, "quest", String(d.quest_id), name("quests", d.quest_id));
          break;
        case "recipe": {
          const id = String(
            d.crafting_recipe_id ?? d.alchemy_recipe_id ?? d.scribing_recipe_id,
          );
          const type = d.alchemy_recipe_id
            ? "alchemy"
            : d.scribing_recipe_id
              ? "scribing"
              : "crafting";
          add(method, type, id, name("items", d.declared_result_item_id));
          break;
        }
        case "gather":
          if (d.resource_kind === "fishing")
            add(method, "fishing", "fishing", "Fishing");
          else
            add(
              method,
              "gather",
              String(d.resource_id),
              name("gathering_resources", d.resource_id),
            );
          break;
        case "world_chest":
          add(method, "chest", String(d.chest_id), name("chests", d.chest_id));
          break;
        case "portable_chest":
          add(method, "random", String(d.item_id), name("items", d.item_id));
          break;
        case "pack_use":
          add(method, "pack", String(d.item_id), name("items", d.item_id));
          break;
        case "merge":
        case "fragment":
          for (const input of method.costGroups.flatMap(
            (group) => group.inputs,
          ))
            if (input.item_id)
              add(
                method,
                "merge",
                input.item_id,
                method.kind === "fragment"
                  ? `Combine ${input.amount} ${name("items", input.item_id)}`
                  : name("items", input.item_id),
              );
          break;
        case "treasure_dig":
          if (d.map_item_id)
            add(
              method,
              "treasure_map",
              String(d.map_item_id),
              name("items", d.map_item_id),
            );
          break;
        case "essence":
        case "blessing":
          for (const provider of method.providers)
            if (provider.ref.kind === "npcs")
              add(method, "special", provider.ref.id, provider.name);
          break;
        case "creation":
          add(method, "starter", itemId, "New character");
          break;
      }
    }
    for (const method of view.inspection.parentAwards)
      add(
        method,
        "drop",
        String(method.detail.monster_id),
        name("monsters", method.detail.monster_id),
      );
  }
  const summaries = new Map<string, ItemSourceSummary>();
  for (const row of rows) {
    const key = `${row.item_id}:${row.type}:${row.id}`;
    const existing = summaries.get(key);
    if (!existing) summaries.set(key, row);
    else existing.source_level = getMinimumSourceLevel([existing, row]);
  }
  return [...summaries.values()].sort(
    (a, b) =>
      a.item_id.localeCompare(b.item_id) ||
      (a.source_level ?? Infinity) - (b.source_level ?? Infinity) ||
      a.name.localeCompare(b.name),
  );
}

export async function getItemSourceSummaries(
  db: Database.Database,
  itemIds: string[],
): Promise<ItemSourceSummary[]> {
  if (!itemIds.length) return [];
  return itemSourceSummariesFromModel(
    await loadItemSourceModel(db, itemIds),
    itemIds,
  );
}
export function groupItemSourceSummaries(
  rows: ItemSourceSummary[],
): Map<string, ItemSourceSummary[]> {
  const grouped = new Map<string, ItemSourceSummary[]>();
  for (const row of rows) {
    const existing = grouped.get(row.item_id);
    if (existing) existing.push(row);
    else grouped.set(row.item_id, [row]);
  }
  return grouped;
}
export function getMinimumSourceLevel(
  sources: Pick<ItemSourceSummary, "source_level">[],
): number | null {
  const levels = sources.flatMap((source) =>
    source.source_level === null ? [] : [source.source_level],
  );
  return levels.length ? Math.min(...levels) : null;
}
