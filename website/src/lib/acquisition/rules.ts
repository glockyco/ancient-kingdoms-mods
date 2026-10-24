import ruleData from "./rules-data.json";
import { calculateBossLootChance } from "../calculation/boss-loot";
import { calculateChestRewards } from "../calculation/chest-rewards";
import {
  PROFESSION_MECHANICS,
  rawTierSuccessChance,
} from "../data/professions/mechanics";
import {
  fishDropChancePerSuccessfulHook,
  fishTrashChancePerHook,
  fishLowerTierFishChancePerHook,
  fishingSpotSuccessChance,
} from "../utils/fishing";
import type {
  AcquisitionRows,
  MethodRow,
  OutputRow,
  PoolEntry,
  ProbabilityAssumptions,
  ProbabilityResult,
  ProbabilityTarget,
  ProbabilityFactor,
  DataRow,
  Profession,
  EvaluatedQuantity,
} from "./types";
import { dataError } from "./queries";

export const CODE_DEFINED_RULES = ruleData;
export const BASELINE_ASSUMPTIONS: ProbabilityAssumptions = Object.freeze({
  scenario: "baseline",
  questNeed: "none",
  fatecharm: false,
  treasureHunter: 0,
  professionFraction: null,
  toolQuality: null,
  costumePieces: 0,
  huntingFraction: 0,
  extraGatherChance: 0,
  altarTier: null,
  activatorLevel: null,
  totalVeteranPoints: null,
  chestAccess: "unknown",
});
export interface ProbabilityScenario {
  readonly assumptions?: ProbabilityAssumptions;
  readonly neededQuestItemIds?: ReadonlySet<string>;
}

export function professionAttempt(
  profession: Profession,
  tier: number,
  professionFraction: number,
  toolQuality: number | null,
  food = true,
): { raw: number; qualified: boolean; displayed: number } {
  if (
    !Number.isFinite(professionFraction) ||
    professionFraction < 0 ||
    professionFraction > 1
  )
    throw new RangeError("Profession fraction must be between 0 and 1");
  if (
    (profession === "mining" || profession === "fishing") &&
    toolQuality === null
  )
    return { raw: 0, qualified: false, displayed: 0 };
  const rule = PROFESSION_MECHANICS[profession].success;
  const raw = rawTierSuccessChance(
    rule,
    tier,
    professionFraction * 100,
    toolQuality ?? 0,
  );
  const qualified = raw + Number.EPSILON >= rule.floor;
  return {
    raw,
    qualified,
    displayed: qualified ? (profession === "cooking" && !food ? 1 : raw) : 0,
  };
}
export function calculateAltarGold(
  activatorLevel: number,
  totalVeteranPoints: number,
): number {
  return (
    CODE_DEFINED_RULES.altar.goldPerLevel * activatorLevel +
    CODE_DEFINED_RULES.altar.goldPerVeteranPoint * totalVeteranPoints
  );
}

export function evaluateOutputQuantity(
  output: OutputRow,
  carried?: { readonly amount: number; readonly complete: boolean },
): EvaluatedQuantity {
  if (output.yield_rule === "all_carried") {
    if (!carried) return { kind: "unknown" };
    return carried.complete
      ? { kind: "exact", value: carried.amount }
      : { kind: "range", min: carried.amount, max: null };
  }
  // Source: server-scripts/GatherItem.cs:446-454 — a successful Radiant roll replaces the configured gift amount with one unit.
  if (output.yield_rule === "radiant") return { kind: "exact", value: 1 };
  if (output.amount_min === null || output.amount_max === null)
    return { kind: "unknown" };
  const max =
    output.yield_rule === "uniform_upper_exclusive" &&
    output.amount_max > output.amount_min
      ? output.amount_max - 1
      : output.amount_max;
  return output.amount_min === max
    ? { kind: "exact", value: output.amount_min }
    : { kind: "range", min: output.amount_min, max };
}

export function evaluateAllCarriedBatch(
  knownCount: number,
  complete: boolean,
): { runes: EvaluatedQuantity; gold: EvaluatedQuantity } {
  if (!Number.isInteger(knownCount) || knownCount < 0)
    throw new RangeError("Invalid carried rune count");
  const gold = knownCount * CODE_DEFINED_RULES.blessing.goldPerRune;
  return {
    runes: complete
      ? { kind: "exact", value: knownCount }
      : { kind: "range", min: knownCount, max: null },
    gold: complete
      ? { kind: "exact", value: gold }
      : { kind: "range", min: gold, max: null },
  };
}

interface RuleIndex {
  entries: Map<string, PoolEntry[]>;
  bindings: Map<string, DataRow[]>;
  outputs: Map<string, OutputRow[]>;
  pools: Map<string, DataRow>;
  chestRules: Map<string, DataRow>;
  fishingRules: Map<string, DataRow>;
  fishingBindings: Map<string, DataRow>;
  entities: Map<string, Map<string, DataRow>>;
  luckTokens: Map<string, DataRow>;
}
const ruleIndexes = new WeakMap<AcquisitionRows, RuleIndex>();
function ruleIndex(rows: AcquisitionRows): RuleIndex {
  const cached = ruleIndexes.get(rows);
  if (cached) return cached;
  const index: RuleIndex = {
    entries: new Map(),
    bindings: new Map(),
    outputs: new Map(),
    pools: new Map(rows.pools.map((row) => [row.id, row])),
    chestRules: new Map(
      (rows.facts.loot_chest_rules ?? []).map((row) => [
        String(row.pool_id),
        row,
      ]),
    ),
    fishingRules: new Map(
      (rows.facts.loot_fishing_rules ?? []).map((row) => [row.id, row]),
    ),
    fishingBindings: new Map(
      (rows.facts.acquisition_method_fishing_rules ?? []).map((row) => [
        String(row.method_id),
        row,
      ]),
    ),
    entities: new Map(
      Object.entries(rows.entities).map(([table, entities]) => [
        table,
        new Map(entities.map((row) => [row.id, row])),
      ]),
    ),
    luckTokens: new Map(
      (rows.facts.luck_tokens ?? []).map((row) => [String(row.zone_id), row]),
    ),
  };
  for (const entry of rows.poolEntries) {
    const entries = index.entries.get(entry.pool_id) ?? [];
    entries.push(entry);
    index.entries.set(entry.pool_id, entries);
  }
  for (const entries of index.entries.values())
    entries.sort((a, b) => a.ordinal - b.ordinal);
  for (const binding of rows.methodPools) {
    const bindings = index.bindings.get(String(binding.method_id)) ?? [];
    bindings.push(binding);
    index.bindings.set(String(binding.method_id), bindings);
  }
  for (const output of rows.outputs) {
    const outputs = index.outputs.get(output.method_id) ?? [];
    outputs.push(output);
    index.outputs.set(output.method_id, outputs);
  }
  ruleIndexes.set(rows, index);
  return index;
}

export function methodProbabilityFactors(
  rows: AcquisitionRows,
  method: MethodRow,
  detail: DataRow,
): readonly ProbabilityFactor[] {
  if (method.rule_id === "lootless") return [];
  const index = ruleIndex(rows),
    outputs = index.outputs.get(method.id) ?? [],
    factors: ProbabilityFactor[] = [];
  const poolIds = new Set(
    (index.bindings.get(method.id) ?? []).map((binding) =>
      String(binding.pool_id),
    ),
  );
  if (typeof detail.loot_pool_id === "string") poolIds.add(detail.loot_pool_id);
  const entries: PoolEntry[] = [];
  const visited = new Set<string>();
  const pending = [...poolIds];
  while (pending.length) {
    const poolId = pending.pop()!;
    if (visited.has(poolId)) continue;
    visited.add(poolId);
    for (const entry of index.entries.get(poolId) ?? []) {
      entries.push(entry);
      if (entry.child_pool_id) pending.push(entry.child_pool_id);
    }
  }
  const zone = index.entities.get("zones")?.get(String(detail.loot_zone_id));
  const luck = index.luckTokens.get(String(detail.loot_zone_id));
  if (
    method.kind === "kill" &&
    detail.is_boss &&
    Number(detail.loot_zone_number) > 0 &&
    zone?.is_dungeon &&
    typeof luck?.boss_luck_token_id === "string" &&
    entries.some((entry) => entry.guaranteed_equipment_candidate)
  )
    factors.push("fatecharm");
  if (
    method.kind === "portable_chest" &&
    entries.some((entry) => entry.scales_with_treasure_hunter)
  )
    factors.push("treasure_hunter");
  if (
    entries.some((entry) => entry.quest_gate !== "none") ||
    (method.kind === "gather" &&
      outputs.some(
        (output) =>
          output.delivery === "quest_progress" ||
          index.entities.get("items")?.get(String(output.item_id))
            ?.has_gather_quest,
      ))
  )
    factors.push("quest_need");
  if (
    method.kind === "kill" &&
    !detail.is_boss &&
    detail.is_hunt &&
    entries.some((entry) => Number(entry.quality) > 0)
  )
    factors.push("hunting");
  if (
    ["herbalism", "mining", "fishing", "radiant"].includes(method.rule_id) ||
    (["alchemy", "cooking", "scribing"].includes(method.rule_id) &&
      Number(detail.tier) > 0)
  )
    factors.push("profession");
  if (method.rule_id === "mining" || method.rule_id === "fishing")
    factors.push("tool");
  if (method.rule_id === "fishing") factors.push("costume");
  if (
    method.kind === "gather" &&
    outputs.some(
      (output) =>
        output.yield_rule === "radiant" ||
        (output.yield_rule === "extra_gather" && output.amount_max !== 0),
    )
  )
    factors.push("extra_gather");
  if (
    method.rule_id === "altar_final_loot" &&
    outputs.some((output) => output.condition_slot !== null)
  )
    factors.push("altar_tier");
  if (
    method.kind === "world_chest" &&
    (detail.key_item_id || detail.key_item_withheld)
  )
    factors.push("chest_access");
  return Object.freeze(factors);
}

export function calculateMethodProbabilities(
  rows: AcquisitionRows,
  method: MethodRow,
  detail: DataRow,
  scenario: ProbabilityScenario = {},
): readonly ProbabilityResult[] {
  const index = ruleIndex(rows);
  const outputs = index.outputs.get(method.id) ?? [];
  const tier =
    method.rule_id === "altar_final_loot"
      ? (outputs.find((output) => output.condition_slot !== null)
          ?.condition_slot ?? null)
      : null;
  const assumptions: ProbabilityAssumptions = {
    ...BASELINE_ASSUMPTIONS,
    ...scenario.assumptions,
    ...(tier !== null ? { altarTier: tier as 0 | 1 | 2 | 3 } : {}),
  };
  for (const value of [
    assumptions.treasureHunter,
    assumptions.professionFraction,
    assumptions.huntingFraction,
    assumptions.extraGatherChance,
  ])
    if (
      value !== null &&
      value !== undefined &&
      (!Number.isFinite(value) || value < 0 || value > 1)
    )
      dataError(method.id, "scenario fraction outside 0..1");
  if (assumptions.questNeed === "specified" && !scenario.neededQuestItemIds)
    dataError(method.id, "missing specified quest-need set");
  const results: ProbabilityResult[] = [];
  const bindings = index.bindings.get(method.id) ?? [];
  const event: ProbabilityResult["event"] =
    method.kind === "kill"
      ? method.rule_id === "altar_final_loot"
        ? "eligible_kill"
        : "corpse_generation"
      : "parent_award";
  const chestAccess =
    (!detail.key_item_id && !detail.key_item_withheld) ||
    assumptions.chestAccess === "key"
      ? 1
      : assumptions.chestAccess === "lockpick"
        ? CODE_DEFINED_RULES.worldChest.lockpickSuccess
        : null;
  let applicable: boolean | null = true;
  if (
    tier !== null &&
    assumptions.activatorLevel !== null &&
    assumptions.activatorLevel !== undefined &&
    assumptions.totalVeteranPoints !== null &&
    assumptions.totalVeteranPoints !== undefined
  ) {
    const altar = index.entities.get("altars")?.get(String(detail.altar_id));
    if (!altar) dataError(method.id, "missing altar thresholds");
    const thresholds = [
      altar.magic_reward_threshold,
      altar.epic_reward_threshold,
      altar.legendary_reward_threshold,
    ];
    if (thresholds.some((value) => typeof value !== "number"))
      dataError(method.id, "invalid altar thresholds");
    const score = assumptions.activatorLevel + assumptions.totalVeteranPoints;
    const actualTier = thresholds.reduce<number>(
      (count, bound) => count + Number(score >= Number(bound)),
      0,
    );
    applicable = actualTier === tier;
  }
  function emit(
    target: ProbabilityTarget,
    namedEvent: ProbabilityResult["event"],
    probability: number | null,
    expectedQuantity: number | null,
    quantityMeaning: ProbabilityResult["quantityMeaning"] = "at_least_one",
  ): void {
    if (applicable === false) {
      probability = 0;
      expectedQuantity = 0;
    }
    if (
      probability !== null &&
      (!Number.isFinite(probability) ||
        probability < -1e-12 ||
        probability > 1 + 1e-12)
    )
      dataError(method.id, "invalid calculated probability");
    const outcomeKey =
      target.kind === "item"
        ? `item:${target.itemId}:${target.delivery}`
        : `gold:${target.delivery}`;
    const previousIndex = results.findIndex(
      (result) =>
        result.outcomeKey === outcomeKey && result.event === namedEvent,
    );
    if (previousIndex >= 0) {
      const previous = results[previousIndex];
      let commonSuccess: number | null = 1;
      if (namedEvent === "attempt") {
        if (method.kind === "world_chest")
          commonSuccess =
            outer === null || chestAccess === null ? null : outer * chestAccess;
        else if (method.kind === "gather" || method.kind === "recipe")
          commonSuccess = outer;
      }
      const combinedChance =
        previous.probability === null ||
        probability === null ||
        commonSuccess === null
          ? previous.probability === 1 || probability === 1
            ? 1
            : null
          : commonSuccess === 0
            ? 0
            : commonSuccess *
              (1 -
                (1 - previous.probability / commonSuccess) *
                  (1 - probability / commonSuccess));
      results[previousIndex] = {
        ...previous,
        probability: combinedChance,
        expectedQuantity:
          previous.expectedQuantity === null || expectedQuantity === null
            ? null
            : previous.expectedQuantity + expectedQuantity,
      };
    } else
      results.push({
        methodId: method.id,
        outcomeKey,
        target,
        event: namedEvent,
        quantityMeaning,
        probability:
          probability === null ? null : Math.max(0, Math.min(1, probability)),
        expectedQuantity,
        assumptions,
      });
  }
  const childOutcomes = new Map<
    string,
    { itemId: string; weight: number; entry: PoolEntry }[]
  >();
  function children(
    poolId: string,
    path: ReadonlySet<string> = new Set(),
  ): { itemId: string; weight: number; entry: PoolEntry }[] {
    if (path.has(poolId)) dataError(poolId, "cyclic loot pool");
    const cached = childOutcomes.get(poolId);
    if (cached) return cached;
    const entries = index.entries.get(poolId) ?? [];
    const next = new Set(path);
    next.add(poolId);
    const outcomes: { itemId: string; weight: number; entry: PoolEntry }[] = [];
    for (const entry of entries) {
      if (entry.resolution === "uniform_child") {
        if (!entry.child_pool_id) dataError(entry.id, "missing child pool");
        const members = index.entries.get(entry.child_pool_id);
        if (!members?.length) dataError(entry.id, "empty uniform child pool");
        for (const child of children(entry.child_pool_id, next))
          outcomes.push({
            itemId: child.itemId,
            weight: child.weight / members.length,
            entry,
          });
      } else if (entry.item_id)
        outcomes.push({ itemId: entry.item_id, weight: 1, entry });
    }
    childOutcomes.set(poolId, outcomes);
    return outcomes;
  }
  function questAllowed(entry: PoolEntry): boolean {
    return (
      entry.quest_gate === "none" ||
      (assumptions.questNeed === "specified" &&
        scenario.neededQuestItemIds!.has(entry.item_id ?? ""))
    );
  }
  function questUnknown(entries: readonly PoolEntry[]): boolean {
    return (
      (assumptions.questNeed === "unknown" &&
        entries.some((entry) => entry.quest_gate !== "none")) ||
      (assumptions.questNeed !== "none" &&
        entries.some((entry) => entry.quest_gate === "withheld_need"))
    );
  }
  function outerSuccess(): number | null {
    if (method.kind === "gather") {
      const resource = index.entities
        .get("gathering_resources")
        ?.get(String(detail.resource_id));
      if (
        method.rule_id === "herbalism" ||
        method.rule_id === "mining" ||
        method.rule_id === "fishing"
      ) {
        if (
          assumptions.professionFraction === null ||
          ((method.rule_id === "mining" || method.rule_id === "fishing") &&
            assumptions.toolQuality === null)
        )
          return null;
        return professionAttempt(
          method.rule_id,
          Number(resource?.level),
          assumptions.professionFraction,
          assumptions.toolQuality,
        ).displayed;
      }
    }
    if (
      method.kind === "recipe" &&
      (method.rule_id === "alchemy" ||
        method.rule_id === "cooking" ||
        method.rule_id === "scribing")
    ) {
      if (Number(detail.tier) === 0) return 1;
      if (assumptions.professionFraction === null) return null;
      const result = index.entities
        .get("items")
        ?.get(String(detail.declared_result_item_id));
      return professionAttempt(
        method.rule_id === "scribing" ? "alchemy" : method.rule_id,
        Number(detail.tier),
        assumptions.professionFraction,
        null,
        result?.item_type === "food",
      ).displayed;
    }
    return method.kind === "gather" || method.kind === "world_chest"
      ? Number(detail.outer_success)
      : 1;
  }
  const outer = outerSuccess();
  let secondarySurvival: number | null = 1;
  if (method.kind === "gather") {
    const primary = outputs.find((output) => {
      const item = index.entities.get("items")?.get(String(output.item_id));
      return (
        output.resource_kind === "item" &&
        output.yield_rule !== "pool" &&
        !output.withheld &&
        item?.is_quest_item &&
        item.has_gather_quest
      );
    });
    if (primary) {
      if (primary.yield_rule === "radiant") {
        secondarySurvival =
          assumptions.professionFraction === null
            ? null
            : 1 -
              (PROFESSION_MECHANICS.radiant_seeker.procChance.base +
                PROFESSION_MECHANICS.radiant_seeker.procChance.skillFactor *
                  assumptions.professionFraction);
      } else {
        const quantity = evaluateOutputQuantity(primary);
        secondarySurvival =
          quantity.kind === "exact"
            ? Number(quantity.value === 0)
            : quantity.kind === "range" && quantity.min > 0
              ? 0
              : quantity.kind === "range" && quantity.max !== null
                ? 1 / (quantity.max - quantity.min + 1)
                : null;
      }
    } else if (
      outputs.some(
        (output) =>
          output.withheld &&
          output.yield_rule !== "pool" &&
          output.delivery === "quest_progress",
      )
    ) {
      secondarySurvival = null;
    }
  }
  function emitAward(
    target: ProbabilityTarget,
    chance: number | null,
    expected: number | null,
    meaning: ProbabilityResult["quantityMeaning"] = "at_least_one",
    namedEvent: ProbabilityResult["event"] = event,
  ): void {
    if (method.kind === "world_chest") {
      emit(target, "successful_opening", chance, expected, meaning);
      emit(
        target,
        "attempt",
        chance === null || chestAccess === null || outer === null
          ? null
          : chance * outer * chestAccess,
        expected === null || chestAccess === null || outer === null
          ? null
          : expected * outer * chestAccess,
        meaning,
      );
    } else emit(target, namedEvent, chance, expected, meaning);
  }

  if (method.rule_id === "lootless") return [];
  if (method.kind === "portable_chest") {
    for (const binding of bindings) {
      const poolId = String(binding.pool_id),
        entries = index.entries.get(poolId) ?? [];
      const rule = index.chestRules.get(poolId);
      if (!rule) dataError(method.id, "missing portable chest rule");
      if (
        entries.some(
          (entry) =>
            entry.resolution !== "direct" || entry.quest_gate !== "none",
        )
      )
        dataError(poolId, "unsupported portable chest process");
      if (Number(rule.num_items) === 0) continue;
      const calculated = calculateChestRewards(
        {
          id: poolId,
          num_items: Number(rule.num_items),
          rewards: entries.map((entry) => ({
            item_id: entry.item_id ?? `anonymous:${entry.ordinal}`,
            item_name: `group:${entry.duplicate_group}`,
            roll_order: entry.ordinal,
            roll_chance: entry.probability,
            scales_with_treasure_hunter: entry.scales_with_treasure_hunter,
          })),
        },
        assumptions.treasureHunter,
      );
      const totals = new Map<string, number>();
      for (let i = 0; i < entries.length; i++)
        if (entries[i].item_id) {
          const itemId = entries[i].item_id!;
          totals.set(
            itemId,
            (totals.get(itemId) ?? 0) + calculated[i].open_chance,
          );
        }
      for (const [itemId, chance] of totals)
        emit(
          { kind: "item", itemId, delivery: "inventory" },
          "opening",
          chance,
          chance,
        );
    }
  } else if (method.kind === "kill") {
    const poolId = String(detail.loot_pool_id),
      entries = index.entries.get(poolId) ?? [];
    const isBoss = !!detail.is_boss;
    const drops = entries.map((entry) => ({
      item_id: entry.item_id ?? `anonymous:${entry.duplicate_group}`,
      item_name: `group:${entry.duplicate_group}`,
      probability: entry.probability,
      requires_quest: entry.quest_gate !== "none",
      counts_as_equipment: !!entry.guaranteed_equipment_candidate,
      random_items:
        entry.resolution === "uniform_child"
          ? (index.entries.get(entry.child_pool_id!) ?? []).map((child) => ({
              item_id: child.item_id ?? `anonymous-child:${child.ordinal}`,
              counts_as_equipment: !!child.counts_equipment,
            }))
          : undefined,
    }));
    const publicTargets = new Set(
      children(poolId).map((outcome) => outcome.itemId),
    );
    if (isBoss && publicTargets.size) {
      const counts = new Map<number, number>();
      for (const entry of entries)
        counts.set(
          entry.duplicate_group,
          (counts.get(entry.duplicate_group) ?? 0) + 1,
        );
      for (const entry of entries)
        if (
          entry.guaranteed_equipment_candidate &&
          entry.cap !== null &&
          entry.cap !== counts.get(entry.duplicate_group)
        )
          dataError(
            poolId,
            "boss cap is not representable by the original loot adapter",
          );
    }
    for (const itemId of publicTargets) {
      let chance: number | null;
      if (isBoss) {
        chance = calculateBossLootChance(drops, itemId, {
          fatecharm: assumptions.fatecharm,
          neededQuestItemIds: scenario.neededQuestItemIds,
        });
      } else {
        let miss = 1;
        for (const entry of entries) {
          if (!questAllowed(entry)) continue;
          const contribution =
            entry.resolution === "uniform_child"
              ? children(entry.child_pool_id!)
                  .filter((outcome) => outcome.itemId === itemId)
                  .reduce((sum, outcome) => sum + outcome.weight, 0) /
                (index.entries.get(entry.child_pool_id!)?.length ?? 1)
              : Number(entry.item_id === itemId);
          // Monster.OnDeath applies Hunting only to quality-positive hunt entries.
          const raw =
            entry.probability +
            (detail.is_hunt && Number(entry.quality) > 0
              ? (assumptions.huntingFraction ?? 0) / 2
              : 0);
          miss *= 1 - Math.min(1, raw) * contribution;
        }
        chance = 1 - miss;
      }
      emit(
        { kind: "item", itemId, delivery: "corpse" },
        event,
        questUnknown(entries) ? null : chance,
        null,
      );
    }
    const zone = index.entities.get("zones")?.get(String(detail.loot_zone_id));
    const fragment = index.luckTokens.get(String(detail.loot_zone_id));
    if (
      !detail.loot_zone_withheld &&
      !detail.is_boss &&
      !detail.is_elite &&
      Number(detail.loot_zone_number) > 0 &&
      zone?.is_dungeon &&
      detail.respawn &&
      Number(detail.exp_multiplier) >= 1 &&
      typeof fragment?.fragment_token_id === "string"
    ) {
      const probability = Number(fragment.fragment_drop_chance);
      emit(
        {
          kind: "item",
          itemId: fragment.fragment_token_id,
          delivery: "corpse",
        },
        event,
        probability,
        probability,
      );
    }
    const dynamicGold = outputs.some(
      (output) => output.resource_kind === "gold" && output.amount_min === null,
    );
    if (dynamicGold || Number(detail.gold_max) > 0) {
      const min = Number(detail.gold_min),
        max = Number(detail.gold_max);
      let mean: number | null = (min + (max > min ? max - 1 : max)) / 2;
      if (dynamicGold)
        mean =
          assumptions.activatorLevel != null &&
          assumptions.totalVeteranPoints != null
            ? calculateAltarGold(
                assumptions.activatorLevel,
                assumptions.totalVeteranPoints,
              )
            : null;
      const probability = Number(detail.gold_probability);
      emit(
        { kind: "gold", delivery: "corpse" },
        event,
        probability,
        mean === null ? null : mean * probability,
        "range",
      );
    }
  } else if (method.rule_id === "fishing") {
    const binding = index.fishingBindings.get(method.id),
      rule = binding
        ? index.fishingRules.get(String(binding.fishing_rule_id))
        : undefined;
    if (!rule) dataError(method.id, "missing fishing rule");
    const primary = index.entries.get(String(rule.primary_pool_id)) ?? [];
    const known = assumptions.professionFraction !== null;
    const params = {
      spotDrops: primary.map((entry) => ({ probability: entry.probability })),
      fishingPercent: (assumptions.professionFraction ?? 0) * 100,
      fishermanCostumePieces: assumptions.costumePieces,
      spotTier: Number(rule.spot_tier),
    };
    const totals = new Map<string, number>();
    for (const entry of primary)
      if (entry.item_id) {
        const chance = fishDropChancePerSuccessfulHook({
          configuredDropRate: entry.probability,
          fishCountAtSpot: primary.length,
          fishingPercent: params.fishingPercent,
          fishermanCostumePieces: params.fishermanCostumePieces,
        });
        totals.set(entry.item_id, (totals.get(entry.item_id) ?? 0) + chance);
      }
    for (const [field, chance] of [
      ["trash_pool_id", fishTrashChancePerHook(params)],
      ["fallback_pool_id", fishLowerTierFishChancePerHook(params)],
    ] as const) {
      const entries = (index.entries.get(String(rule[field])) ?? []).filter(
        (entry) =>
          field !== "fallback_pool_id" ||
          (entry.quality !== null && entry.quality < Number(rule.spot_tier)),
      );
      for (const entry of entries)
        if (entry.item_id)
          totals.set(
            entry.item_id,
            (totals.get(entry.item_id) ?? 0) + chance / entries.length,
          );
    }
    for (const [itemId, chance] of totals) {
      const target: ProbabilityTarget = {
        kind: "item",
        itemId,
        delivery: "inventory",
      };
      emit(
        target,
        "successful_hook",
        known ? chance : null,
        known ? chance : null,
      );
      const success =
        known && assumptions.toolQuality !== null
          ? fishingSpotSuccessChance({
              fishingPercent: params.fishingPercent,
              rodQuality: assumptions.toolQuality,
              spotTier: Number(rule.spot_tier),
            })
          : null;
      emit(
        target,
        "cast",
        success === null ? null : chance * success,
        success === null ? null : chance * success,
      );
    }
  } else {
    for (const binding of bindings) {
      const poolId = String(binding.pool_id),
        entries = index.entries.get(poolId) ?? [],
        pool = index.pools.get(poolId);
      const totals = new Map<string, number>();
      for (const outcome of children(poolId)) {
        if (!questAllowed(outcome.entry)) continue;
        const denominator =
          pool?.kind === "random" || pool?.kind === "resource_secondary"
            ? entries.length
            : 1;
        const chance =
          (outcome.entry.probability * outcome.weight) / denominator;
        totals.set(outcome.itemId, (totals.get(outcome.itemId) ?? 0) + chance);
      }
      for (const [itemId, chance] of totals) {
        if (secondarySurvival === 0) continue;
        const targetOutputs = outputs.filter(
          (output) => output.item_id === itemId && !output.withheld,
        );
        const conditional =
          method.kind === "quest_complete" &&
          targetOutputs.length > 0 &&
          targetOutputs.every((output) => output.condition_slot !== null);
        const perAttempt =
          outer === null ||
          secondarySurvival === null ||
          questUnknown(entries) ||
          conditional
            ? null
            : chance * outer * secondarySurvival;
        const delivery =
          targetOutputs.find((output) => output.delivery !== "quest_progress")
            ?.delivery ?? "inventory";
        emitAward(
          { kind: "item", itemId, delivery },
          method.kind === "world_chest" ? chance : perAttempt,
          method.kind === "world_chest" ? chance : perAttempt,
          "at_least_one",
          binding.event as ProbabilityResult["event"],
        );
      }
    }
  }

  const existing = new Set(results.map((result) => result.outcomeKey));
  for (const output of outputs) {
    if (output.withheld || output.yield_rule === "pool") continue;
    const target: ProbabilityTarget | null =
      output.resource_kind === "gold"
        ? {
            kind: "gold",
            delivery: output.delivery === "corpse" ? "corpse" : "inventory",
          }
        : output.item_id
          ? { kind: "item", itemId: output.item_id, delivery: output.delivery }
          : null;
    if (!target) continue;
    const key =
      target.kind === "gold"
        ? `gold:${target.delivery}`
        : `item:${target.itemId}:${target.delivery}`;
    if (
      existing.has(key) &&
      method.kind === "kill" &&
      output.resource_kind === "gold"
    )
      continue;
    const quantity = evaluateOutputQuantity(output);
    let expected =
      quantity.kind === "exact"
        ? quantity.value
        : quantity.kind === "range" && quantity.max !== null
          ? (quantity.min + quantity.max) / 2
          : null;
    let probability: number | null = method.kind === "world_chest" ? 1 : outer;
    if (
      output.yield_rule === "all_carried" ||
      (output.condition_slot !== null && method.kind === "quest_complete")
    )
      probability = null;
    if (output.yield_rule === "extra_gather")
      expected =
        expected === null
          ? null
          : expected + (assumptions.extraGatherChance ?? 0);
    if (output.yield_rule === "radiant") {
      const skill = assumptions.professionFraction;
      probability =
        skill === null
          ? null
          : PROFESSION_MECHANICS.radiant_seeker.procChance.base +
            PROFESSION_MECHANICS.radiant_seeker.procChance.skillFactor * skill;
      expected = 1 + (assumptions.extraGatherChance ?? 0);
    }
    const primary = output.item_id
      ? index.entities.get("items")?.get(output.item_id)
      : undefined;
    if (output.delivery === "quest_progress") {
      const needed =
        assumptions.questNeed === "specified" &&
        scenario.neededQuestItemIds!.has(output.item_id ?? "");
      probability =
        assumptions.questNeed === "none" ? 0 : needed ? probability : null;
    } else if (method.kind === "gather" && primary?.has_gather_quest) {
      if (assumptions.questNeed === "unknown") probability = null;
      else if (
        assumptions.questNeed === "specified" &&
        scenario.neededQuestItemIds!.has(output.item_id ?? "")
      )
        probability = 0;
    }
    emitAward(
      target,
      probability,
      probability === null || expected === null ? null : probability * expected,
      quantity.kind === "exact" ? "fixed_units" : "range",
      method.kind === "gather" || method.kind === "recipe" ? "attempt" : event,
    );
    existing.add(key);
  }
  return Object.freeze(results);
}
