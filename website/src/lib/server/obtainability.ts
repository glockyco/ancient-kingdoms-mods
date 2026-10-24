import type Database from "better-sqlite3";
import type {
  AcquisitionModel,
  AcquisitionQuery,
  MethodView,
} from "../acquisition/types";
import {
  projectItemSources,
  projectRecipeTeachers,
} from "../acquisition/projections";
import { loadAcquisition } from "./acquisition";
import { getItemSourceSummaries } from "./item-source-summary";
import { itemSourcesFromModel } from "./item-sources";
import type {
  ObtainabilityNode,
  ObtainabilitySourceType,
  RecipeDetailInfo,
  RecipeIngredient,
  RecipeType,
  SourceSummary,
} from "$lib/types/recipes";

export interface RecipeDefinition extends RecipeDetailInfo {
  method_id: string;
  materials: RecipeIngredient[];
  providers: Array<{
    id: string;
    name: string;
    zone_id: string | null;
    zone_name: string | null;
    sub_zone_name: string | null;
  }>;
  method: MethodView;
}

function executor(db: Database.Database): AcquisitionQuery {
  return async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];
}

function itemData(db: Database.Database, id: string) {
  return db
    .prepare(
      `SELECT i.id, i.name, i.tooltip_html, i.quality,
    v.public_path AS visual_public_path FROM items i
    LEFT JOIN visual_assets v ON v.domain='item' AND v.entity_id=i.id AND v.kind='icon'
    WHERE i.id=?`,
    )
    .get(id) as
    | {
        id: string;
        name: string;
        tooltip_html: string | null;
        quality: number;
        visual_public_path: string | null;
      }
    | undefined;
}

function recipeType(method: MethodView): RecipeType {
  switch (method.detail.display_kind) {
    case "alchemy":
      return "Alchemy";
    case "cooking":
      return "Cooking";
    case "scribing":
      return "Scribing";
    case "crafting":
      return "Crafting";
    default:
      throw new Error(`Unknown recipe kind for ${method.methodId}`);
  }
}

function routeId(method: MethodView): string {
  return String(
    method.detail.crafting_recipe_id ??
      method.detail.alchemy_recipe_id ??
      method.detail.scribing_recipe_id,
  );
}

function materials(
  db: Database.Database,
  method: MethodView,
): RecipeIngredient[] {
  return method.costGroups
    .flatMap((group) => group.inputs)
    .filter((input) => input.resource_kind === "item")
    .map((input) => {
      const item = input.item_id ? itemData(db, input.item_id) : undefined;
      return {
        item_id: item?.id ?? "",
        item_name: item?.name ?? "Unpublished item",
        visual_public_path: item?.visual_public_path ?? null,
        amount: input.amount,
        quality: item?.quality ?? 0,
      };
    })
    .sort((a, b) =>
      a.item_name < b.item_name
        ? -1
        : a.item_name > b.item_name
          ? 1
          : a.item_id.localeCompare(b.item_id),
    );
}

export async function getRecipeDefinitions(
  db: Database.Database,
  recipeIds: readonly string[],
): Promise<RecipeDefinition[]> {
  const model = await loadAcquisition(executor(db), {
    kind: "recipes",
    recipeIds,
  });
  const selected = new Set(recipeIds);
  return [...model.methodViews.values()]
    .filter(
      (method) => method.kind === "recipe" && selected.has(routeId(method)),
    )
    .map((method) => {
      const item = itemData(db, String(method.detail.declared_result_item_id));
      if (!item)
        throw new Error(`Missing result for recipe ${method.methodId}`);
      const teachers = projectRecipeTeachers(model, item.id);
      const teacher = teachers[0];
      const teacherItem = teacher ? itemData(db, teacher.id) : undefined;
      const type = recipeType(method);
      return {
        id: routeId(method),
        method_id: method.methodId,
        method,
        result_item_id: item.id,
        result_item_name: item.name,
        result_visual_public_path: item.visual_public_path,
        result_tooltip_html: item.tooltip_html,
        result_quality: item.quality,
        result_amount: Number(method.detail.result_amount),
        type,
        outputs: method.outputs
          .filter((output) => output.resource_kind === "item")
          .map((output) => {
            const delivered = output.item_id
              ? itemData(db, output.item_id)
              : undefined;
            return {
              item_id: delivered?.id ?? "",
              item_name: delivered?.name ?? "Unpublished item",
              visual_public_path: delivered?.visual_public_path ?? null,
              tooltip_html: delivered?.tooltip_html ?? null,
              amount:
                output.quantity.kind === "exact" ? output.quantity.value : null,
              quality: delivered?.quality ?? 0,
            };
          }),
        tier: Number(method.detail.tier),
        xp: Number(method.detail.experience ?? 0),
        station_type:
          type === "Alchemy"
            ? "alchemy_table"
            : type === "Scribing"
              ? "scribing_table"
              : type === "Cooking"
                ? "cooking"
                : "unknown",
        taught_by_recipe_id: teacher?.id ?? null,
        taught_by_recipe_name: teacher?.name ?? null,
        taught_by_recipe_visual_public_path: teacher?.icon_path ?? null,
        taught_by_recipe_tooltip_html: teacher?.tooltip_html ?? null,
        taught_by_recipe_quality: teacherItem?.quality ?? null,
        materials: materials(db, method),
        providers: method.providers
          .filter((p) =>
            ["crafting_stations", "alchemy_tables", "scribing_tables"].includes(
              p.ref.kind,
            ),
          )
          .map((p) => {
            const zone = p.location?.zoneId
              ? model.entities.get("zones")?.get(p.location.zoneId)
              : undefined;
            const subZone = p.location?.subZoneId
              ? model.entities.get("sub_zones")?.get(p.location.subZoneId)
              : undefined;
            return {
              id: p.ref.id,
              name: p.name,
              zone_id: p.location?.zoneId ?? null,
              zone_name: zone ? String(zone.name) : null,
              sub_zone_name: subZone ? String(subZone.name) : null,
            };
          }),
      };
    });
}

// The old flat reader represents one definition. Variant-aware callers use getRecipeDefinitions.
export async function getRecipeMaterials(
  db: Database.Database,
  recipeId: string,
  recipeType: "crafting" | "alchemy" | "scribing",
): Promise<Array<{ item_id: string; item_name: string; amount: number }>> {
  const definitions = await getRecipeDefinitions(db, [recipeId]);
  const definition = definitions.find((d) =>
    recipeType === "alchemy"
      ? d.type === "Alchemy"
      : recipeType === "scribing"
        ? d.type === "Scribing"
        : d.type === "Crafting" || d.type === "Cooking",
  );
  return (definition?.materials ?? []).map(
    ({ item_id, item_name, amount }) => ({ item_id, item_name, amount }),
  );
}

export async function buildObtainabilityTree(
  db: Database.Database,
  itemId: string,
  amount: number,
  depth: number,
  visited: Set<string>,
  isRoot: boolean = false,
  maxDepth: number = 10,
): Promise<ObtainabilityNode> {
  return buildTree(db, itemId, amount, depth, visited, isRoot, maxDepth);
}

export async function buildRecipeObtainabilityTree(
  db: Database.Database,
  definition: RecipeDefinition,
  amount: number = definition.result_amount,
): Promise<ObtainabilityNode> {
  return buildTree(
    db,
    definition.result_item_id,
    amount,
    0,
    new Set(),
    true,
    10,
    definition.method,
  );
}

async function buildTree(
  db: Database.Database,
  itemId: string,
  amount: number,
  depth: number,
  visited: ReadonlySet<string>,
  isRoot: boolean,
  maxDepth: number,
  rootMethod?: MethodView,
): Promise<ObtainabilityNode> {
  const execute = executor(db);
  const models = new Map<string, Promise<AcquisitionModel>>();
  const summaries = new Map<string, Promise<SourceSummary[]>>();
  const rod = db
    .prepare(
      "SELECT MAX(quality) AS quality FROM items WHERE weapon_category='Fishing Rod'",
    )
    .get() as { quality: number | null };
  let expanded = 0;
  const getModel = (id: string) => {
    let result = models.get(id);
    if (!result) {
      result = loadAcquisition(execute, { kind: "items", itemIds: [id] });
      models.set(id, result);
    }
    return result;
  };
  const getSources = (id: string) => {
    let result = summaries.get(id);
    if (!result) {
      result = Promise.all([
        getItemSourceSummaries(db, [id]),
        getModel(id),
      ]).then(([rows, model]) => {
        const seen = new Set<string>();
        const sources: SourceSummary[] = rows
          .filter(
            (row) =>
              !["gather", "fishing", "housing", "starter"].includes(row.type),
          )
          .flatMap((row) => {
            const type = ["alchemy", "crafting", "scribing"].includes(row.type)
              ? "recipe"
              : row.type;
            const key = `${type}:${row.id}`;
            if (seen.has(key)) return [];
            seen.add(key);
            return [
              {
                type: type as ObtainabilitySourceType,
                id: row.id,
                name: row.name,
              },
            ];
          });
        const projected = itemSourcesFromModel(model, id, rod.quality ?? 0);
        const dropOrder = new Map<string, number>();
        for (const monster of projected.monsters) {
          if (!dropOrder.has(monster.monster_id))
            dropOrder.set(monster.monster_id, dropOrder.size);
        }
        const gathers = projected.gathers;
        for (const gather of gathers) {
          if (gather.is_fishing_spot && gather.fishing_chance_max === 0)
            continue;
          const key = gather.resource_id;
          if (seen.has(key)) continue;
          seen.add(key);
          sources.push({
            type: "gather",
            id: gather.resource_id,
            name: gather.resource_name,
          });
        }
        const order: ObtainabilitySourceType[] = [
          "special",
          "merge",
          "drop",
          "vendor",
          "seasonal",
          "quest",
          "altar",
          "gather",
          "chest",
          "pack",
          "random",
          "treasure_map",
          "recipe",
        ];
        return sources.sort(
          (a, b) =>
            order.indexOf(a.type) - order.indexOf(b.type) ||
            (a.type === "drop"
              ? (dropOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                (dropOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
              : 0),
        );
      });
      summaries.set(id, result);
    }
    return result;
  };
  async function node(
    id: string,
    count: number,
    level: number,
    path: ReadonlySet<string>,
    root: boolean,
    selected?: MethodView,
  ): Promise<ObtainabilityNode> {
    const item = id ? itemData(db, id) : undefined;
    const sourceRows = id ? await getSources(id) : [];
    const sourceCountsByType: Record<string, number> = {};
    for (const source of sourceRows)
      sourceCountsByType[source.type] =
        (sourceCountsByType[source.type] ?? 0) + 1;
    const shown: Record<string, number> = {};
    const base: ObtainabilityNode = {
      item_id: id,
      item_name: item?.name ?? (id || "Unpublished item"),
      tooltip_html: item?.tooltip_html ?? null,
      visual_public_path: item?.visual_public_path ?? null,
      quality: item?.quality ?? 0,
      amount: count,
      depth: level,
      isRoot: root,
      sources: sourceRows.filter(
        (source) => (shown[source.type] = (shown[source.type] ?? 0) + 1) <= 3,
      ),
      sourceCountsByType,
    };
    if (!id || level >= maxDepth || expanded++ >= 200 || path.has(id))
      return base;
    const model = await getModel(id);
    const source = projectItemSources(model, id);
    const recipes = selected
      ? [selected]
      : [
          ...new Map(
            [...source.methods, ...source.inspection.offeredAssets]
              .filter((m) => m.kind === "recipe")
              .map((m) => [m.methodId, m]),
          ).values(),
        ];
    const transformations = recipes.length
      ? recipes
      : source.methods.filter(
          (m) =>
            m.kind === "blessing" ||
            m.kind === "merge" ||
            m.kind === "fragment",
        );
    for (const method of transformations) {
      const pair = `${id}:${method.methodId}`;
      if (path.has(pair)) continue;
      const nextPath = new Set(path);
      nextPath.add(pair);
      const branch: ObtainabilityNode = { ...base };
      const deliveredAmount = method.outputs
        .filter(
          (output) => output.item_id === id && output.quantity.kind === "exact",
        )
        .reduce(
          (total, output) =>
            total +
            (output.quantity.kind === "exact" ? output.quantity.value : 0),
          0,
        );
      const perAction =
        method.kind === "recipe" &&
        (selected || method.detail.declared_result_item_id === id)
          ? Number(method.detail.result_amount)
          : deliveredAmount;
      const batches =
        method.kind === "blessing"
          ? 1
          : Math.ceil(count / Math.max(1, perAction));
      if (method.kind !== "blessing" && perAction > 0)
        branch.produced_amount = batches * perAction;
      const children: ObtainabilityNode[] = [];
      for (const group of method.costGroups) {
        for (const input of group.inputs) {
          if (input.resource_kind !== "item") continue;
          // Blessing has an all-carried batch, not a selectable one-rune execution.
          const childAmount =
            group.quantity_rule === "all_carried"
              ? count
              : input.amount * batches;
          children.push(
            await node(
              input.item_id ?? "",
              childAmount,
              level + 1,
              nextPath,
              false,
            ),
          );
        }
      }
      children.sort((a, b) =>
        a.item_name < b.item_name
          ? -1
          : a.item_name > b.item_name
            ? 1
            : a.item_id.localeCompare(b.item_id),
      );
      if (method.kind === "recipe") {
        const type = recipeType(method);
        let learningRequirement: ObtainabilityNode | undefined;
        if (type === "Alchemy") {
          for (const teacher of projectRecipeTeachers(model, id)) {
            if (nextPath.has(`learning:${teacher.id}`)) continue;
            const learningPath = new Set(nextPath);
            learningPath.add(`learning:${teacher.id}`);
            learningRequirement = await node(
              teacher.id,
              1,
              level + 1,
              learningPath,
              false,
            );
            break;
          }
        }
        branch.recipe = {
          recipe_id: routeId(method),
          recipe_type: type,
          materials: children,
          learningRequirement,
        };
      } else if (method.kind === "blessing")
        branch.service = { service_type: "blessing", materials: children };
      else branch.merge = { materials: children };
      return branch;
    }
    return base;
  }
  return node(itemId, amount, depth, visited, isRoot, rootMethod);
}
