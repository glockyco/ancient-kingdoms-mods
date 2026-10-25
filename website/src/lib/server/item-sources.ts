import type Database from "better-sqlite3";
import type {
  AcquisitionModel,
  DataRow,
  MethodView,
  ProbabilityResult,
} from "$lib/acquisition/types";
import {
  projectItemSources,
  projectItemSeasons,
  projectMethodSeasons,
} from "$lib/acquisition/projections";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
  professionAttempt,
} from "$lib/acquisition/rules";
import { loadAcquisition } from "./acquisition";
import type { ItemSources } from "$lib/types/item-sources";
import {
  CHEST_REWARDS_QUERY,
  assembleChests,
  type ChestRewardRow,
} from "$lib/queries/chest-rewards";
import {
  calculateChestRewards,
  type CalculatedChestReward,
} from "$lib/calculation/chest-rewards";
import { lowestCatchableSkillPercent } from "$lib/utils/fishing";
import { monsterFatecharm } from "$lib/utils/fatecharm";
import { SEASON_ORDER } from "$lib/data/seasonal-events";

export async function loadItemSourceModel(
  db: Database.Database,
  itemIds: readonly string[],
): Promise<AcquisitionModel> {
  return loadAcquisition(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
    { kind: "items", itemIds },
  );
}

export function sourceEntity(
  model: AcquisitionModel,
  kind: string,
  id: unknown,
): DataRow | undefined {
  return model.entities.get(kind)?.get(String(id));
}
const num = (row: DataRow | undefined, key: string, fallback = 0): number =>
  typeof row?.[key] === "number" ? (row[key] as number) : fallback;
const str = (row: DataRow | undefined, key: string, fallback = ""): string =>
  typeof row?.[key] === "string" ? (row[key] as string) : fallback;
const unique = <T>(rows: T[]): T[] => [
  ...new Map(rows.map((row) => [JSON.stringify(row), row])).values(),
];
export function itemProbability(
  results: readonly ProbabilityResult[],
  itemId: string,
  event?: ProbabilityResult["event"],
): number | null {
  const result = results.find(
    (result) =>
      result.target.kind === "item" &&
      result.target.itemId === itemId &&
      (!event || result.event === event),
  );
  return result?.probability ?? null;
}

export function aggregateChestRewards(
  rows: CalculatedChestReward<ChestRewardRow>[],
): CalculatedChestReward<ChestRewardRow>[] {
  const outcomes = new Map<string, CalculatedChestReward<ChestRewardRow>>();
  for (const row of rows) {
    if (row.withheld) continue;
    const key = `${row.chest_item_id}:${row.item_id}`;
    const previous = outcomes.get(key);
    if (previous) previous.open_chance += row.open_chance;
    else outcomes.set(key, { ...row, item_name: row.display_name });
  }
  return [...outcomes.values()];
}
function configuredRate(
  model: AcquisitionModel,
  method: MethodView,
  itemId: string,
): number {
  if (method.ruleId === "fishing") {
    const binding = model.rows.facts.acquisition_method_fishing_rules?.find(
      (row) => row.method_id === method.methodId,
    );
    const rule = model.rows.facts.loot_fishing_rules?.find(
      (row) => row.id === binding?.fishing_rule_id,
    );
    return (
      (model.entriesByPool.get(String(rule?.primary_pool_id)) ?? []).find(
        (entry) => entry.item_id === itemId,
      )?.probability ?? 0
    );
  }
  const pools = model.rows.methodPools.filter(
    (binding) => binding.method_id === method.methodId,
  );
  for (const pool of pools) {
    const entries = model.entriesByPool.get(String(pool.pool_id)) ?? [];
    const entry = entries.find((entry) => entry.item_id === itemId);
    if (entry) return entry.probability;
  }
  return itemProbability(method.probabilityResults, itemId) ?? 1;
}

/**
 * Whether a kill awards the item as an altar's tiered reward. An altar boss's own
 * loot pool has no reward tier and is listed like any other monster drop.
 */
export function isAltarTierReward(method: MethodView, itemId: string): boolean {
  return (
    method.kind === "kill" &&
    method.detail.event_kind === "altar_final" &&
    method.outputs.some(
      (output) => output.item_id === itemId && output.condition_slot !== null,
    )
  );
}

function monsterRow(
  model: AcquisitionModel,
  method: MethodView,
  itemId: string,
  rate: number,
): ItemSources["monsters"][number] | null {
  const detail = method.detail;
  const monster = sourceEntity(model, "monsters", detail.monster_id);
  if (!monster) return null;
  const levels =
    detail.event_kind === "authored"
      ? method.providers.flatMap((provider) => {
          const spawn =
            provider.ref.kind === "monster_spawns"
              ? sourceEntity(model, "monster_spawns", provider.ref.id)
              : undefined;
          return typeof spawn?.level === "number" ? [spawn.level] : [];
        })
      : [];
  const row: ItemSources["monsters"][number] = {
    item_id: itemId,
    monster_id: monster.id,
    monster_name: str(monster, "name"),
    monster_level: num(monster, "level"),
    monster_level_min: num(monster, "level_min"),
    monster_level_max: num(monster, "level_max"),
    is_boss: Boolean(detail.is_boss),
    is_fabled: Boolean(monster.is_fabled),
    is_elite: Boolean(detail.is_elite),
    drop_rate: rate,
    seasons: projectMethodSeasons(model, method),
  };
  if (levels.length) {
    row.monster_level_min = Math.min(...levels);
    row.monster_level_max = Math.max(...levels);
  }
  return row;
}

/** Adapt the canonical methods to the existing item tables without introducing new sections. */
export function itemSourcesFromModel(
  model: AcquisitionModel,
  itemId: string,
  bestRodQuality = 0,
): ItemSources {
  const result: ItemSources = {
    monsters: [],
    vendors: [],
    quests: [],
    altars: [],
    recipes: [],
    gathers: [],
    chests: [],
    packs: [],
    randoms: [],
    chestItems: [],
    merges: [],
    treasureMaps: [],
    seasonal: [],
  };
  // One row per season and price: every repair merchant makes the same offer.
  const seasonal = new Map<string, ItemSources["seasonal"][number]>();
  const view = projectItemSources(model, itemId);
  const methods = new Map(
    [
      ...view.methods,
      ...view.inspection.offeredAssets.filter((method) => method.rooted),
    ].map((method) => [method.methodId, method]),
  );
  for (const method of methods.values()) {
    const detail = method.detail;
    const chance = itemProbability(method.probabilityResults, itemId);
    const rate = configuredRate(model, method, itemId);
    const output = method.outputs.find((output) => output.item_id === itemId);
    const inputs = method.costGroups.flatMap((group) => group.inputs);
    const seasons = projectMethodSeasons(model, method);
    if (method.kind === "kill" && !isAltarTierReward(method, itemId)) {
      const row = monsterRow(model, method, itemId, rate);
      if (!row) continue;
      const targetChance = itemProbability(
        calculateMethodProbabilities(
          model.rows,
          model.methods.get(method.methodId)!,
          detail,
          {
            assumptions: { ...BASELINE_ASSUMPTIONS, questNeed: "specified" },
            neededQuestItemIds: new Set([itemId]),
          },
        ),
        itemId,
      );
      if (row.is_boss) {
        row.per_kill_chance = targetChance ?? undefined;
        const fatecharm = monsterFatecharm(model, method);
        if (fatecharm) row.fatecharm = fatecharm;
        if (method.probabilityFactors.includes("fatecharm"))
          row.per_kill_chance_with_fatecharm =
            itemProbability(
              calculateMethodProbabilities(
                model.rows,
                model.methods.get(method.methodId)!,
                detail,
                {
                  assumptions: {
                    ...BASELINE_ASSUMPTIONS,
                    questNeed: "specified",
                    fatecharm: true,
                  },
                  neededQuestItemIds: new Set([itemId]),
                },
              ),
              itemId,
            ) ?? undefined;
      } else if (targetChance !== null) row.drop_rate = targetChance;
      result.monsters.push(row);
    } else if (method.kind === "vendor" && seasons.length) {
      const currency = inputs.find((input) => input.resource_kind === "item");
      const gold = inputs.find((input) => input.resource_kind === "gold");
      for (const season of seasons) {
        const row = {
          season,
          price: currency?.amount ?? gold?.amount ?? 0,
          currency_item_id: currency?.item_id ?? null,
          currency_item_name: currency
            ? str(sourceEntity(model, "items", currency.item_id), "name")
            : null,
          amount: output?.amount_min ?? 1,
        };
        const key = JSON.stringify(row);
        const existing = seasonal.get(key);
        if (existing) existing.merchant_count++;
        else seasonal.set(key, { ...row, merchant_count: 1 });
      }
    } else if (method.kind === "vendor") {
      const npc = sourceEntity(model, "npcs", detail.npc_id);
      if (!npc) continue;
      const currency = inputs.find((input) => input.resource_kind === "item");
      const gold = inputs.find((input) => input.resource_kind === "gold");
      const offered = sourceEntity(model, "items", detail.offered_item_id);
      const faction = str(npc, "faction") || null;
      result.vendors.push({
        item_id: itemId,
        npc_id: npc.id,
        npc_name: str(npc, "name"),
        npc_faction: faction,
        is_faction_vendor: num(offered, "faction_required_to_buy") > 0,
        price: currency?.amount ?? gold?.amount ?? 0,
        amount: output?.amount_min ?? undefined,
        currency_item_id: currency?.item_id ?? null,
        currency_item_name: currency
          ? currency.withheld
            ? "Unpublished currency"
            : str(sourceEntity(model, "items", currency.item_id), "name")
          : null,
        required_faction:
          num(offered, "faction_required_to_buy") > 0 ? faction : null,
        required_reputation_tier:
          num(offered, "faction_required_to_buy") || null,
        required_reputation_name:
          str(offered, "faction_required_tier_name") || null,
      });
    } else if (
      method.kind === "quest_accept" ||
      method.kind === "quest_complete"
    ) {
      const quest = sourceEntity(model, "quests", detail.quest_id);
      if (!quest) continue;
      const classes =
        model.rows.facts.quest_reward_slots
          ?.filter(
            (slot) =>
              slot.quest_id === quest.id &&
              slot.item_id === itemId &&
              slot.slot_kind === "class",
          )
          .map((slot) =>
            slot.class_withheld ? "unpublished class" : String(slot.class_id),
          ) ?? [];
      result.quests.push({
        item_id: itemId,
        quest_id: quest.id,
        quest_name: str(quest, "name"),
        quest_level_required: num(quest, "level_required"),
        quest_level_recommended: num(quest, "level_recommended"),
        source_type: method.kind === "quest_accept" ? "provided" : "reward",
        class_restriction: classes.length ? JSON.stringify(classes) : null,
        is_repeatable: Boolean(
          quest.is_repeatable || quest.is_adventurer_quest,
        ),
        seasons,
      });
    } else if (method.kind === "recipe") {
      const recipeType = detail.alchemy_recipe_id
        ? "alchemy"
        : detail.scribing_recipe_id
          ? "scribing"
          : "crafting";
      const stations = method.providers.map((provider) =>
        sourceEntity(model, provider.ref.kind, provider.ref.id),
      );
      result.recipes.push({
        item_id: itemId,
        recipe_id: String(
          detail.alchemy_recipe_id ??
            detail.scribing_recipe_id ??
            detail.crafting_recipe_id,
        ),
        recipe_type: recipeType,
        result_amount: output?.amount_min ?? num(detail, "result_amount", 1),
        tier: num(detail, "tier"),
        variant_id: method.methodId,
        materials: inputs.map((input) => ({
          item_id: input.item_id ?? "",
          item_name: input.withheld
            ? "Unpublished ingredient"
            : input.resource_kind === "gold"
              ? "Gold"
              : str(sourceEntity(model, "items", input.item_id), "name"),
          amount: input.amount,
        })),
        station_type:
          detail.display_kind === "cooking"
            ? "cooking"
            : (stations
                .map((station) => str(station, "station_type"))
                .find(Boolean) ?? null),
      });
    } else if (method.kind === "gather") {
      const resource = sourceEntity(
        model,
        "gathering_resources",
        detail.resource_id,
      );
      if (!resource) continue;
      const fishing = detail.resource_kind === "fishing";
      const quantity = output?.quantity;
      const binding = model.rows.facts.acquisition_method_fishing_rules?.find(
        (binding) => binding.method_id === method.methodId,
      );
      const rule = model.rows.facts.loot_fishing_rules?.find(
        (rule) => rule.id === binding?.fishing_rule_id,
      );
      const hasTarget = (poolId: unknown) =>
        (model.entriesByPool.get(String(poolId)) ?? []).some(
          (entry) => entry.item_id === itemId,
        );
      const role =
        rule && hasTarget(rule.primary_pool_id)
          ? "primary"
          : rule && hasTarget(rule.trash_pool_id)
            ? "trash"
            : "fallback";
      const rodQuality = num(
        sourceEntity(model, "items", resource.tool_required_id),
        "quality",
      );
      const floor =
        lowestCatchableSkillPercent(rodQuality, num(resource, "level")) / 100;
      const fishingChances = fishing
        ? [
            itemProbability(
              calculateMethodProbabilities(
                model.rows,
                model.methods.get(method.methodId)!,
                detail,
                {
                  assumptions: {
                    ...BASELINE_ASSUMPTIONS,
                    professionFraction: floor,
                    toolQuality: rodQuality,
                    costumePieces: 0,
                  },
                },
              ),
              itemId,
              "cast",
            ),
            itemProbability(
              calculateMethodProbabilities(
                model.rows,
                model.methods.get(method.methodId)!,
                detail,
                {
                  assumptions: {
                    ...BASELINE_ASSUMPTIONS,
                    professionFraction: 1,
                    toolQuality: bestRodQuality,
                    costumePieces: 3,
                  },
                },
              ),
              itemId,
              "cast",
            ),
          ].sort((a, b) => (a ?? 0) - (b ?? 0))
        : [];
      const scenario = calculateMethodProbabilities(
        model.rows,
        model.methods.get(method.methodId)!,
        detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            professionFraction: detail.resource_kind === "radiant" ? 0 : 1,
            toolQuality: bestRodQuality,
          },
        },
      );
      const outer =
        method.ruleId === "herbalism" || method.ruleId === "mining"
          ? professionAttempt(
              method.ruleId,
              num(resource, "level"),
              1,
              bestRodQuality,
            ).displayed
          : 1;
      const harvestChance = itemProbability(scenario, itemId);
      for (const provider of fishing
        ? method.providers
        : [method.providers[0]]) {
        const zoneId = provider?.location?.zoneId ?? null;
        result.gathers.push({
          item_id: itemId,
          resource_id: resource.id,
          resource_name: str(resource, "name"),
          drop_rate: rate,
          actual_drop_chance:
            harvestChance !== null && outer > 0 ? harvestChance / outer : rate,
          is_guaranteed: harvestChance === outer,
          is_radiant_spark: detail.resource_kind === "radiant",
          is_fishing_spot: fishing,
          virtual_location_count: fishing ? 1 : 0,
          fishing_source_role: fishing ? role : null,
          fishing_chance_min: fishingChances[0] ?? null,
          fishing_chance_max: fishingChances[1] ?? null,
          spawn_id: fishing ? (provider?.ref.id ?? null) : null,
          zone_id: fishing ? zoneId : null,
          zone_name:
            fishing && zoneId
              ? str(sourceEntity(model, "zones", zoneId), "name")
              : null,
          amount_min: fishing
            ? null
            : quantity?.kind === "exact"
              ? quantity.value
              : quantity?.kind === "range"
                ? quantity.min
                : 1,
          amount_max: fishing
            ? null
            : quantity?.kind === "exact"
              ? quantity.value
              : quantity?.kind === "range"
                ? quantity.max
                : 1,
        });
      }
    } else if (method.kind === "world_chest") {
      const chest = sourceEntity(model, "chests", detail.chest_id);
      const provider = method.providers.find(
        (provider) => provider.ref.kind === "chests",
      );
      if (!chest || !provider?.location) continue;
      const zoneId = provider.location.zoneId;
      const key = detail.key_item_id ? String(detail.key_item_id) : null;
      const keyedChance = itemProbability(
        calculateMethodProbabilities(
          model.rows,
          model.methods.get(method.methodId)!,
          detail,
          { assumptions: { ...BASELINE_ASSUMPTIONS, chestAccess: "key" } },
        ),
        itemId,
      );
      result.chests.push({
        item_id: itemId,
        chest_id: chest.id,
        chest_name: str(chest, "name"),
        drop_rate: rate,
        actual_drop_chance: keyedChance ?? rate,
        zone_id: zoneId ?? "",
        zone_name: str(sourceEntity(model, "zones", zoneId), "name"),
        key_required_id: key,
        key_name: key ? str(sourceEntity(model, "items", key), "name") : null,
        position_x: provider.location.position?.x ?? null,
        position_y: provider.location.position?.y ?? null,
      });
    } else if (method.kind === "pack_use") {
      const pack = sourceEntity(model, "items", detail.item_id);
      if (pack)
        result.packs.push({
          item_id: itemId,
          pack_item_id: pack.id,
          pack_item_name: str(pack, "name"),
          pack_quality: num(pack, "quality"),
          amount: output?.amount_min ?? 1,
          seasons: projectItemSeasons(model, pack.id),
        });
    } else if (method.kind === "merge") {
      const components = inputs.filter(
        (input) => input.resource_kind === "item",
      );
      result.merges.push({
        item_id: itemId,
        component_item_ids: components.map((input) => input.item_id ?? ""),
        component_item_names: components.map((input) =>
          input.withheld
            ? "Unpublished component"
            : str(sourceEntity(model, "items", input.item_id), "name"),
        ),
      });
    } else if (method.kind === "treasure_dig") {
      const provider = method.providers.find(
        (provider) => provider.ref.kind === "treasure_locations",
      );
      if (!detail.map_item_id || !provider?.location) continue;
      result.treasureMaps.push({
        item_id: itemId,
        map_item_id: String(detail.map_item_id),
        map_item_name: str(
          sourceEntity(model, "items", detail.map_item_id),
          "name",
        ),
        treasure_location_id: provider.ref.id,
        zone_id: provider.location.zoneId ?? "",
        zone_name: str(
          sourceEntity(model, "zones", provider.location.zoneId),
          "name",
        ),
        position_x: provider.location.position?.x ?? null,
        position_y: provider.location.position?.y ?? null,
      });
    } else if (method.kind === "kill") {
      const altar = sourceEntity(model, "altars", detail.altar_id);
      if (!altar) continue;
      const tiers = method.outputs
        .filter(
          (output) =>
            output.item_id === itemId && output.condition_slot !== null,
        )
        .map((output) => output.condition_slot!);
      for (const tier of new Set(tiers)) {
        const tierNames = ["common", "magic", "epic", "legendary"] as const;
        const thresholds = [
          1,
          num(altar, "magic_reward_threshold"),
          num(altar, "epic_reward_threshold"),
          num(altar, "legendary_reward_threshold"),
        ];
        result.altars.push({
          item_id: itemId,
          altar_id: altar.id,
          altar_name: str(altar, "name"),
          altar_type: str(altar, "type"),
          zone_id: str(altar, "zone_id"),
          zone_name: str(sourceEntity(model, "zones", altar.zone_id), "name"),
          reward_tier: tierNames[tier],
          drop_rate: chance ?? rate,
          min_level_plus_veteran: thresholds[tier],
          min_level: num(altar, "min_level_required", 1),
          min_veteran_points: 0,
          magic_reward_threshold: num(altar, "magic_reward_threshold"),
          epic_reward_threshold: num(altar, "epic_reward_threshold"),
          legendary_reward_threshold: num(altar, "legendary_reward_threshold"),
          final_wave_boss_id: String(detail.monster_id),
          final_wave_boss_name: str(
            sourceEntity(model, "monsters", detail.monster_id),
            "name",
          ),
        });
      }
    }
  }
  for (const method of view.inspection.parentAwards) {
    if (method.kind !== "kill")
      throw new Error(
        `Unsupported ${method.kind} award ${method.methodId} rolling ${itemId}`,
      );
    // The configured roll of the distribution itself, as the drop tables list it.
    const row = monsterRow(
      model,
      method,
      itemId,
      configuredRate(model, method, itemId),
    );
    if (row) result.monsters.push(row);
  }
  const awardPools = new Set<string>();
  const pendingPools: string[] = view.methods.flatMap((method) => [
    ...model.rows.methodPools
      .filter((binding) => binding.method_id === method.methodId)
      .map((binding) => String(binding.pool_id)),
    ...(typeof method.detail.loot_pool_id === "string"
      ? [method.detail.loot_pool_id]
      : []),
  ]);
  while (pendingPools.length) {
    const poolId = pendingPools.pop()!;
    if (awardPools.has(poolId)) continue;
    awardPools.add(poolId);
    for (const entry of model.entriesByPool.get(poolId) ?? [])
      if (entry.child_pool_id) pendingPools.push(entry.child_pool_id);
  }
  for (const definition of model.rows.facts.item_pool_definitions ?? []) {
    if (definition.role !== "random") continue;
    const poolId = String(definition.pool_id);
    const entries = model.entriesByPool.get(poolId) ?? [];
    const matches = entries.filter((entry) => entry.item_id === itemId);
    const parent = sourceEntity(model, "items", definition.item_id);
    if (matches.length && parent && awardPools.has(poolId))
      result.randoms.push({
        item_id: itemId,
        random_item_id: parent.id,
        random_item_name: str(parent, "name"),
        random_quality: num(parent, "quality"),
        probability:
          matches.reduce((total, entry) => total + entry.probability, 0) /
          entries.length,
      });
  }
  result.seasonal = [...seasonal.values()].sort(
    (a, b) => SEASON_ORDER[a.season] - SEASON_ORDER[b.season],
  );
  for (const key of Object.keys(result) as (keyof ItemSources)[])
    (result[key] as unknown[]) = unique(result[key] as unknown[]);
  result.monsters.sort(
    (a, b) =>
      b.drop_rate - a.drop_rate || a.monster_name.localeCompare(b.monster_name),
  );
  return result;
}

export async function getItemSources(
  db: Database.Database,
  itemId: string,
): Promise<ItemSources> {
  return getItemSourcesFromModel(
    db,
    await loadItemSourceModel(db, [itemId]),
    itemId,
  );
}

export async function getItemSourcesFromModel(
  db: Database.Database,
  model: AcquisitionModel,
  itemId: string,
): Promise<ItemSources> {
  const bestRod = db
    .prepare(
      "SELECT MAX(quality) AS quality FROM items WHERE weapon_category = 'Fishing Rod'",
    )
    .get() as { quality: number | null };
  const sources = itemSourcesFromModel(model, itemId, bestRod.quality ?? 0);
  sources.chestItems = await chestItemSources(db, model, itemId);
  return sources;
}
async function chestItemSources(
  db: Database.Database,
  model: AcquisitionModel,
  itemId: string,
): Promise<ItemSources["chestItems"]> {
  const methods = projectItemSources(model, itemId).methods.filter(
    (method) => method.kind === "portable_chest",
  );
  const ids = [
    ...new Set(methods.map((method) => String(method.detail.item_id))),
  ];
  if (!ids.length) return [];
  const rows = db
    .prepare(
      `${CHEST_REWARDS_QUERY} WHERE definition.item_id IN (SELECT value FROM json_each(?)) ORDER BY definition.item_id, entry.ordinal`,
    )
    .all(JSON.stringify(ids)) as ChestRewardRow[];
  return assembleChests(rows).flatMap((chest) =>
    aggregateChestRewards(calculateChestRewards(chest, 0))
      .filter((reward) => reward.item_id === itemId)
      .map((reward) => ({
        ...reward,
        chest_scales_with_treasure_hunter: chest.rewards.some((reward) =>
          Boolean(reward.scales_with_treasure_hunter),
        ),
      })),
  );
}
export async function getMonsterSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).monsters;
}
export async function getVendorSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).vendors;
}
export async function getQuestSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).quests;
}
export async function getAltarSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).altars;
}
export async function getRecipeSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).recipes;
}
export async function getGatherSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).gathers;
}
export async function getChestSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).chests;
}
export async function getPackSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).packs;
}
export async function getRandomSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).randoms;
}
export async function getMergeSources(db: Database.Database, itemId: string) {
  return (await getItemSources(db, itemId)).merges;
}
export async function getTreasureMapSources(
  db: Database.Database,
  itemId: string,
) {
  return (await getItemSources(db, itemId)).treasureMaps;
}
export async function getChestItemSources(
  db: Database.Database,
  itemId: string,
) {
  return (await getItemSources(db, itemId)).chestItems;
}
