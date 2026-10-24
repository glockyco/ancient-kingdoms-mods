import { query } from "$lib/db";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import type { AltarThresholds } from "$lib/calculation/altar";
import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";
import { monsterFatecharm, type FatecharmItem } from "$lib/utils/fatecharm";
import {
  loadBrowserAcquisition,
  itemMapLocations,
  mapMethodIsVisible,
} from "$lib/map/acquisition";
import {
  projectItemSources,
  projectItemUsages,
  projectMonsterLoot,
  projectProviderMethods,
} from "$lib/acquisition/projections";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import type {
  AcquisitionModel,
  DataRow,
  MethodView,
  ProbabilityAssumptions,
  ProbabilityResult,
  ProviderRef,
} from "$lib/acquisition/types";
import {
  lowestCatchableSkillPercent,
  fishingSpotSuccessChance,
  fishTrashChancePerHook,
  fishEscapeChancePerHook,
  fishLowerTierFishChancePerHook,
} from "$lib/utils/fishing";

const itemIconPathCache = new Map<string, string | null>();
export async function loadMapItemIconPaths(
  ids: Iterable<string>,
): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids)];
  const missing = unique.filter((id) => !itemIconPathCache.has(id));
  for (let offset = 0; offset < missing.length; offset += 200) {
    const batch = missing.slice(offset, offset + 200);
    const rows = await query<{ id: string; public_path: string | null }>(
      `SELECT i.id, va.public_path FROM items i LEFT JOIN visual_assets va ON va.domain='item' AND va.entity_id=i.id AND va.kind='icon' WHERE i.id IN (${batch.map(() => "?").join(",")})`,
      batch,
    );
    for (const row of rows) itemIconPathCache.set(row.id, row.public_path);
    for (const id of batch)
      if (!itemIconPathCache.has(id))
        throw new Error(`Missing item for icon availability: ${id}`);
  }
  return Object.fromEntries(
    unique.map((id) => [id, itemIconPathCache.get(id)!]),
  );
}

export interface PopupDropItem {
  itemId: string;
  itemName: string;
  quality: number;
  dropRate: number;
  fatecharmDropRate?: number;
  fatecharm?: FatecharmItem;
  isDistributionRoll?: boolean;
  requiresQuest?: boolean;
  dropRateMax?: number;
  amountMin?: number;
  amountMax?: number;
  tooltipHtml: string | null;
  isBestiary?: boolean;
  isRandomItem?: boolean;
  randomItemOutcomes?: Array<{
    itemId: string;
    itemName: string;
  }>;
}

export interface PopupQuestInfo {
  id: string;
  name: string;
  levelRecommended: number;
}

export interface PopupItemSoldInfo {
  itemId: string;
  itemName: string;
  quality: number;
  price: number;
  tooltipHtml: string | null;
}

export interface PopupAltarReward extends AltarThresholds {
  tier: "common" | "magic" | "epic" | "legendary";
  maxLevel: number;
  itemId: string;
  itemName: string;
  quality: number;
  dropRate: number | null;
  tooltipHtml: string | null;
}

export interface PopupRenewalSage {
  npcId: string;
  npcName: string;
  zoneId: string | null;
  zoneName: string | null;
  cost: number;
}

export interface MonsterPopupVisualAsset {
  publicPath: string;
  width: number;
  height: number;
  sourceType: string;
}

export interface MonsterPopupDetails {
  drops: PopupDropItem[];
  renewalSages: PopupRenewalSage[];
  health: number;
  damage: number;
  magicDamage: number;
  visualAsset: MonsterPopupVisualAsset | null;
}

export interface PopupWorldBoss {
  id: string;
  name: string;
  level: number;
}

export interface NpcPopupDetails {
  quests: PopupQuestInfo[];
  itemsSold: PopupItemSoldInfo[];
  worldBosses: PopupWorldBoss[];
  subZones: string[];
  visualAsset: MonsterPopupVisualAsset | null;
}

export interface ChestPopupDetails {
  drops: PopupDropItem[];
}

export interface FishingPopupOutcome {
  kind: "primary_fish" | "fallback_fish" | "trash" | "escape" | "no_catch";
  label: string;
  itemId: string | null;
  itemName: string | null;
  quality: number | null;
  dropRateMin: number;
  dropRateMax: number;
  tooltipHtml: string | null;
}

export interface GatheringPopupDetails {
  drops: PopupDropItem[];
  fishingOutcomes?: FishingPopupOutcome[];
}

export interface PopupAltarBossDrop {
  monsterId: string;
  monsterName: string;
  drops: PopupDropItem[];
}

export interface AltarPopupDetails {
  rewards: PopupAltarReward[];
  bossDrops: PopupAltarBossDrop[];
  finalMonsterIds: string[];
}

export interface AltarBasicInfo {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
}

export interface ItemPopupDropper {
  monsterId: string;
  monsterName: string;
  level: number;
  isBoss: boolean;
  isFabled: boolean;
  isElite: boolean;
  dropRate: number;
  fatecharmDropRate?: number;
  fatecharm?: FatecharmItem;
  isDistributionRoll?: boolean;
  requiresQuest?: boolean;
  zoneName: string | null;
}

export interface ItemPopupAltarSource extends AltarThresholds {
  altarId: string;
  altarName: string;
  altarType: string;
  /** Tier for tier rewards, null for boss bestiary drops */
  tier: "common" | "magic" | "epic" | "legendary" | null;
  dropRate: number;
  maxLevel: number;
  monsterName?: string;
  isDistributionRoll?: boolean;
  requiresQuest?: boolean;
  fatecharmDropRate?: number;
  fatecharm?: FatecharmItem;
}

export interface ItemPopupVendor {
  npcId: string;
  npcName: string;
  price: number;
  resultAmount: number | null;
  currencyItemId: string | null;
  currencyItemName: string | null;
}

export interface ItemPopupQuestReward {
  questId: string;
  questName: string;
  levelRecommended: number;
}

export interface ItemPopupGatherSource {
  resourceId: string;
  resourceName: string;
  resourceType: "resource" | "chest";
  rate: number;
  rateNote?: string;
  isFishingSpot: boolean;
  fishingSourceRole: "primary" | "fallback" | "trash" | null;
  fishingChanceMin: number | null;
  fishingChanceMax: number | null;
  virtualLocationCount: number;
}

export interface ItemPopupChestSource {
  chestId: string;
  chestName: string;
  rate: number;
}

export interface ItemPopupCraftSource {
  recipeId: string;
  resultAmount: number;
  materials: Array<{ itemId: string; itemName: string; amount: number }>;
}

export interface ItemPopupMergeSource {
  itemId: string;
  itemName: string;
}

export interface ItemPopupTreasureMapSource {
  mapItemId: string;
  mapItemName: string;
  mapItemTooltipHtml: string | null;
  zoneName: string;
}

export interface ItemPopupTreasureDestination {
  treasureLocationId: string;
  zoneId: string;
  zoneName: string;
  rewardItemId: string | null;
  rewardItemName: string | null;
  rewardItemTooltipHtml: string | null;
}

export interface ItemPopupDetails {
  id: string;
  name: string;
  quality: number;
  canFocus: boolean;
  tooltipHtml: string | null;
  visualAsset: Pick<
    EntityVisualAsset,
    "public_path" | "width" | "height"
  > | null;
  droppers: ItemPopupDropper[];
  altarSources: ItemPopupAltarSource[];
  vendors: ItemPopupVendor[];
  questRewards: ItemPopupQuestReward[];
  gatheringSources: ItemPopupGatherSource[];
  chestSources: ItemPopupChestSource[];
  craftingSources: ItemPopupCraftSource[];
  mergeSources: ItemPopupMergeSource[];
  /** Treasure maps that lead to this item as a reward */
  treasureMapSources: ItemPopupTreasureMapSource[];
  /** Treasure location info for items that ARE treasure maps */
  treasureDestination: ItemPopupTreasureDestination | null;
}

export interface QuestPopupNpc {
  npcId: string;
  npcName: string;
  zoneName: string | null;
  isGiver: boolean;
  isTurnIn: boolean;
}

export interface QuestRewardItem {
  itemId: string;
  itemName: string;
  quality: number;
  classSpecific: string | null;
  tooltipHtml: string | null;
}

export interface QuestObjective {
  type: "kill" | "gather" | "have" | "deliver" | "equip" | "find" | "discover";
  targetId: string | null;
  targetName: string;
  amount: number;
  quality?: number;
  tooltipHtml?: string | null;
  position?: [number, number];
  zoneName?: string | null;
}

export interface QuestPopupDetails {
  id: string;
  name: string;
  levelRecommended: number;
  canFocus: boolean;
  displayType: string;
  isMainQuest: boolean;
  isEpicQuest: boolean;
  isAdventurerQuest: boolean;
  isRepeatable: boolean;
  gold: number;
  exp: number;
  rewardItems: QuestRewardItem[];
  objectives: QuestObjective[];
  npcs: QuestPopupNpc[];
}

export interface ZonePopupMonster {
  id: string;
  name: string;
  level: number;
}

export interface ZonePopupAltar {
  id: string;
  name: string;
}

export interface ZonePopupRenewalSage {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  goldCost: number;
}

export interface ZonePopupDetails {
  bosses: ZonePopupMonster[];
  elites: ZonePopupMonster[];
  altars: ZonePopupAltar[];
  renewalSage: ZonePopupRenewalSage | null;
}

function entity(
  model: AcquisitionModel,
  table: string,
  id: unknown,
): DataRow | undefined {
  return typeof id === "string"
    ? model.entities.get(table)?.get(id)
    : undefined;
}
function itemFields(model: AcquisitionModel, itemId: string) {
  const item = entity(model, "items", itemId);
  if (!item) throw new Error(`Missing popup item ${itemId}`);
  return {
    itemId,
    itemName: String(item.name),
    quality: Number(item.quality ?? 0),
    tooltipHtml:
      typeof item.tooltip_html === "string" ? item.tooltip_html : null,
  };
}
function results(
  model: AcquisitionModel,
  method: MethodView,
  assumptions: Partial<ProbabilityAssumptions> = {},
  itemId?: string,
): readonly ProbabilityResult[] {
  const row = model.methods.get(method.methodId);
  if (!row) throw new Error(`Missing popup method ${method.methodId}`);
  return calculateMethodProbabilities(model.rows, row, method.detail, {
    assumptions: {
      ...BASELINE_ASSUMPTIONS,
      ...assumptions,
      ...(itemId ? { questNeed: "specified" as const } : {}),
    },
    neededQuestItemIds: itemId ? new Set([itemId]) : undefined,
  });
}
function targetChance(
  values: readonly ProbabilityResult[],
  itemId: string,
  event?: ProbabilityResult["event"],
): number | null {
  const matches = values.filter(
    (r) =>
      r.target.kind === "item" &&
      r.target.itemId === itemId &&
      (!event || r.event === event),
  );
  const known = matches.flatMap((r) =>
    r.probability === null ? [] : [r.probability],
  );
  return known.length ? Math.max(...known) : null;
}
function chance(model: AcquisitionModel, method: MethodView, itemId: string) {
  const poolIds = new Set(
    model.rows.methodPools
      .filter((binding) => binding.method_id === method.methodId)
      .map((binding) => String(binding.pool_id)),
  );
  if (typeof method.detail.loot_pool_id === "string")
    poolIds.add(method.detail.loot_pool_id);
  for (const poolId of poolIds) {
    for (const entry of model.entriesByPool.get(poolId) ?? []) {
      if (entry.child_pool_id) poolIds.add(entry.child_pool_id);
    }
  }
  const entries = model.rows.poolEntries.filter(
    (entry) => poolIds.has(entry.pool_id) && entry.item_id === itemId,
  );
  const requiresQuest =
    entries.length > 0 && entries.every((entry) => entry.quest_gate !== "none");
  const neededItemId = requiresQuest ? itemId : undefined;
  const assumptions: Partial<ProbabilityAssumptions> = {
    chestAccess: "key",
    professionFraction: 1,
    toolQuality: 4,
  };
  const dropRate =
    targetChance(results(model, method, assumptions, neededItemId), itemId) ??
    0;
  const fatecharmDropRate = method.probabilityFactors.includes("fatecharm")
    ? (targetChance(
        results(
          model,
          method,
          { ...assumptions, fatecharm: true },
          neededItemId,
        ),
        itemId,
      ) ?? undefined)
    : undefined;
  const fatecharm =
    fatecharmDropRate === undefined
      ? undefined
      : (monsterFatecharm(model, method) ?? undefined);
  return {
    dropRate,
    fatecharmDropRate,
    ...(fatecharm ? { fatecharm } : {}),
    requiresQuest,
  };
}
/** The configured roll of a distribution item in its parent award's pool. */
function wrapperChance(
  model: AcquisitionModel,
  method: MethodView,
  itemId: string,
) {
  for (const binding of model.rows.methodPools) {
    if (binding.method_id !== method.methodId) continue;
    const entry = model.entriesByPool
      .get(String(binding.pool_id))
      ?.find(
        (entry) =>
          entry.item_id === itemId && entry.resolution === "uniform_child",
      );
    if (entry)
      return {
        dropRate: entry.probability,
        fatecharmDropRate: undefined,
        requiresQuest: entry.quest_gate !== "none",
      };
  }
  throw new Error(`Missing ${itemId} roll in ${method.methodId}`);
}
function popupDrops(
  model: AcquisitionModel,
  methods: readonly MethodView[],
  bestiaryFirst = false,
): PopupDropItem[] {
  const drops = new Map<string, PopupDropItem>();
  for (const method of methods) {
    const ids = new Set([
      ...method.outputs.flatMap((o) =>
        o.item_id && !o.withheld && o.delivery !== "quest_progress"
          ? [o.item_id]
          : [],
      ),
      ...method.probabilityResults.flatMap((r) =>
        r.target.kind === "item" && r.target.delivery !== "quest_progress"
          ? [r.target.itemId]
          : [],
      ),
    ]);
    for (const itemId of ids) {
      const rates = chance(model, method, itemId);
      if (rates.dropRate <= 0 || rates.requiresQuest) continue;
      const item = entity(model, "items", itemId)!;
      const output = method.outputs.find(
        (o) => o.item_id === itemId && o.delivery !== "quest_progress",
      );
      const drop: PopupDropItem = {
        ...itemFields(model, itemId),
        ...rates,
        isBestiary: Boolean(item.is_bestiary_drop),
        amountMin:
          output?.quantity.kind === "range"
            ? output.quantity.min
            : output?.quantity.kind === "exact"
              ? output.quantity.value
              : undefined,
        amountMax:
          output?.quantity.kind === "range"
            ? (output.quantity.max ?? undefined)
            : output?.quantity.kind === "exact"
              ? output.quantity.value
              : undefined,
      };
      const previous = drops.get(itemId);
      if (!previous || previous.dropRate < drop.dropRate)
        drops.set(itemId, drop);
    }
  }
  return [...drops.values()].sort(
    (a, b) =>
      (bestiaryFirst ? Number(b.isBestiary) - Number(a.isBestiary) : 0) ||
      b.dropRate - a.dropRate ||
      a.itemName.localeCompare(b.itemName),
  );
}
async function providerModel(provider: ProviderRef) {
  const model = await loadBrowserAcquisition({
    kind: "providers",
    providers: [provider],
  });
  return {
    model,
    methods: projectProviderMethods(model, provider).filter(mapMethodIsVisible),
  };
}
function altarThresholds(altar: DataRow): AltarThresholds {
  return {
    magic_reward_threshold: Number(altar.magic_reward_threshold),
    epic_reward_threshold: Number(altar.epic_reward_threshold),
    legendary_reward_threshold: Number(altar.legendary_reward_threshold),
  };
}
async function maxLevel(): Promise<number> {
  const [row] = await query<{ max_level: number }>(
    "SELECT max_level FROM progression_rules WHERE id=1",
  );
  if (!row) throw new Error("Missing progression_rules.max_level");
  return row.max_level;
}

export async function loadMonsterPopupDetails(
  monsterId: string,
  level: number,
  spawnId: string | null = null,
  isBossOrElite = false,
  isWorldBoss = false,
): Promise<MonsterPopupDetails> {
  const [stats] = await query<{
    health_base: number;
    health_per_level: number;
    damage_base: number;
    damage_per_level: number;
    magic_damage_base: number;
    magic_damage_per_level: number;
    spawn_id: string | null;
    spawn_health: number | null;
    spawn_damage: number | null;
    spawn_magic_damage: number | null;
    visual_public_path: string | null;
    visual_width: number | null;
    visual_height: number | null;
    visual_source_type: string | null;
  }>(
    `SELECT m.health_base,m.health_per_level,m.damage_base,m.damage_per_level,m.magic_damage_base,m.magic_damage_per_level,ms.id spawn_id,ms.health spawn_health,ms.damage spawn_damage,ms.magic_damage spawn_magic_damage,va.public_path visual_public_path,va.width visual_width,va.height visual_height,va.source_type visual_source_type FROM monsters m LEFT JOIN monster_spawns ms ON ms.id=? LEFT JOIN visual_assets va ON va.domain='monster' AND va.entity_id=m.id AND va.kind='primary' WHERE m.id=?`,
    [spawnId, monsterId],
  );
  const model = await loadBrowserAcquisition(
    stats?.spawn_id
      ? {
          kind: "providers",
          providers: [{ kind: "monster_spawns", id: stats.spawn_id }],
        }
      : { kind: "monsters", monsterIds: [monsterId] },
  );
  const loot = projectMonsterLoot(model, monsterId);
  // A presentation-only event marker is not an authored placement. Select its
  // canonical context through the event identity rather than template geometry.
  const methods =
    spawnId && model.methodViews.has(spawnId)
      ? loot.contexts.filter((method) => method.methodId === spawnId)
      : spawnId && model.entities.get("monster_spawns")?.has(spawnId)
        ? loot.contexts.filter((method) =>
            method.providers.some(
              (p) => p.ref.kind === "monster_spawns" && p.ref.id === spawnId,
            ),
          )
        : loot.contexts;
  let renewalSages: PopupRenewalSage[] = [];
  if (isWorldBoss)
    renewalSages = (
      await query<{
        npc_id: string;
        npc_name: string;
        zone_id: string;
        zone_name: string;
        cost: number;
      }>(
        `SELECT n.id npc_id,n.name npc_name,ns.zone_id,z.name zone_name,n.gold_required_respawn_dungeon cost FROM npcs n JOIN npc_spawns ns ON ns.npc_id=n.id LEFT JOIN zones z ON z.id=ns.zone_id WHERE n.respawn_dungeon_id=?`,
        [WORLD_BOSS_DUNGEON_ID],
      )
    ).map((s) => ({
      npcId: s.npc_id,
      npcName: s.npc_name,
      zoneId: s.zone_id,
      zoneName: s.zone_name,
      cost: s.cost,
    }));
  const offset = Math.max(0, level - 1);
  return {
    drops: popupDrops(model, methods, isBossOrElite),
    renewalSages,
    health:
      stats?.spawn_health ??
      (stats?.health_base ?? 0) + (stats?.health_per_level ?? 0) * offset,
    damage:
      stats?.spawn_damage ??
      (stats?.damage_base ?? 0) + (stats?.damage_per_level ?? 0) * offset,
    magicDamage:
      stats?.spawn_magic_damage ??
      (stats?.magic_damage_base ?? 0) +
        (stats?.magic_damage_per_level ?? 0) * offset,
    visualAsset: stats?.visual_public_path
      ? {
          publicPath: stats.visual_public_path,
          width: stats.visual_width ?? 0,
          height: stats.visual_height ?? 0,
          sourceType: stats.visual_source_type ?? "",
        }
      : null,
  };
}

export async function loadNpcPopupDetails(
  npcId: string,
  isWorldBossReset = false,
): Promise<NpcPopupDetails> {
  const { model, methods } = await providerModel({ kind: "npcs", id: npcId });
  const [visual] = await query<{
    public_path: string;
    width: number;
    height: number;
    source_type: string;
  }>(
    "SELECT public_path,width,height,source_type FROM visual_assets WHERE domain='npc' AND entity_id=? AND kind='primary'",
    [npcId],
  );
  const quests = await query<PopupQuestInfo>(
    `SELECT DISTINCT q.id,q.name,q.level_recommended levelRecommended
     FROM npc_quest_memberships m JOIN quests q ON q.id=m.quest_id
     WHERE m.npc_id=? AND m.role='offer' ORDER BY q.level_recommended,q.name`,
    [npcId],
  );
  // A vendor row is the offered item, as the trade window shows it. The game's
  // sale list can repeat an identical offer, which the popup lists once.
  const offers = new Map<string, PopupDropItem & { price: number }>();
  for (const method of methods) {
    if (method.kind !== "vendor") continue;
    const offeredId = String(method.detail.offered_item_id);
    const gold = method.costGroups
      .flatMap((group) => group.inputs)
      .find((input) => input.resource_kind === "gold");
    const price = gold?.amount ?? 0;
    offers.set(`${offeredId}:${price}`, {
      ...itemFields(model, offeredId),
      dropRate: 1,
      isBestiary: Boolean(entity(model, "items", offeredId)?.is_bestiary_drop),
      price,
    });
  }
  const itemsSold = [...offers.values()].sort(
    (a, b) => b.quality - a.quality || a.itemName.localeCompare(b.itemName),
  );
  const subZones = await query<{ name: string }>(
    `SELECT DISTINCT zt.name FROM npc_spawns ns JOIN zone_triggers zt ON zt.id=ns.sub_zone_id WHERE ns.npc_id=? ORDER BY zt.name`,
    [npcId],
  );
  return {
    quests,
    itemsSold,
    worldBosses: isWorldBossReset
      ? await query<PopupWorldBoss>(
          "SELECT id,name,level FROM monsters WHERE is_world_boss=1 ORDER BY level,name",
        )
      : [],
    subZones: subZones.map((zone) => zone.name),
    visualAsset: visual
      ? {
          publicPath: visual.public_path,
          width: visual.width,
          height: visual.height,
          sourceType: visual.source_type,
        }
      : null,
  };
}

export async function loadChestPopupDetails(
  chestId: string,
): Promise<ChestPopupDetails> {
  const { model, methods } = await providerModel({
    kind: "chests",
    id: chestId,
  });
  return { drops: popupDrops(model, methods) };
}

async function fishingScenarios(
  model: AcquisitionModel,
  method: MethodView,
): Promise<[ProbabilityAssumptions, ProbabilityAssumptions]> {
  const resource = entity(
    model,
    "gathering_resources",
    method.detail.resource_id,
  );
  if (!resource)
    throw new Error(`Missing fishing resource ${method.detail.resource_id}`);
  const tool = entity(model, "items", resource.tool_required_id);
  const [best] = await query<{ quality: number }>(
    "SELECT MAX(quality) quality FROM items WHERE weapon_category='Fishing Rod'",
  );
  const tier = Number(resource.level);
  const bestQuality = best?.quality ?? 0;
  let quality = Number(tool?.quality ?? 0);
  let skill = lowestCatchableSkillPercent(quality, tier);
  if (
    fishingSpotSuccessChance({
      rodQuality: quality,
      fishingPercent: skill,
      spotTier: tier,
    }) === 0
  ) {
    quality = bestQuality;
    skill = lowestCatchableSkillPercent(quality, tier);
  }
  return [
    {
      ...BASELINE_ASSUMPTIONS,
      professionFraction: skill / 100,
      toolQuality: quality,
    },
    {
      ...BASELINE_ASSUMPTIONS,
      professionFraction: 1,
      toolQuality: bestQuality,
      costumePieces: 3,
    },
  ];
}

async function fishingOutcomes(
  model: AcquisitionModel,
  method: MethodView,
): Promise<FishingPopupOutcome[]> {
  const [low, high] = await fishingScenarios(model, method);
  const lowResults = results(model, method, low);
  const highResults = results(model, method, high);
  const binding = model.rows.facts.acquisition_method_fishing_rules?.find(
    (row) => row.method_id === method.methodId,
  );
  const rule = model.rows.facts.loot_fishing_rules?.find(
    (row) => row.id === binding?.fishing_rule_id,
  );
  if (!rule) throw new Error(`Missing fishing rule ${method.methodId}`);
  const primary = model.entriesByPool.get(String(rule.primary_pool_id)) ?? [];
  const primaryIds = new Set(primary.map((entry) => entry.item_id));
  const ids = [...primaryIds].filter((id): id is string => id !== null);
  const outcomes: FishingPopupOutcome[] = [...ids].map((itemId) => {
    const a = targetChance(lowResults, itemId, "cast") ?? 0;
    const b = targetChance(highResults, itemId, "cast") ?? 0;
    const item = itemFields(model, itemId);
    return {
      ...item,
      kind: primaryIds.has(itemId) ? "primary_fish" : "fallback_fish",
      label: item.itemName,
      dropRateMin: Math.min(a, b),
      dropRateMax: Math.max(a, b),
    };
  });
  const tier = Number(rule.spot_tier);
  function aggregate(
    assumptions: ProbabilityAssumptions,
    kind: "trash" | "escape" | "no_catch" | "fallback_fish",
  ) {
    const fishingPercent = (assumptions.professionFraction ?? 0) * 100;
    const success = fishingSpotSuccessChance({
      rodQuality: assumptions.toolQuality ?? 0,
      fishingPercent,
      spotTier: tier,
    });
    const parameters = {
      spotDrops: primary.map((entry) => ({ probability: entry.probability })),
      fishingPercent,
      fishermanCostumePieces: assumptions.costumePieces,
      spotTier: tier,
    };
    if (kind === "no_catch") return 1 - success;
    const conditional =
      kind === "trash"
        ? fishTrashChancePerHook(parameters)
        : kind === "fallback_fish"
          ? fishLowerTierFishChancePerHook(parameters)
          : fishEscapeChancePerHook(parameters);
    return success * conditional;
  }
  for (const [kind, label] of [
    ["fallback_fish", "Any lower-tier fish"],
    ["trash", "Trash catch"],
    ["escape", "Fish escapes"],
    ["no_catch", "No bite"],
  ] as const) {
    const a = aggregate(low, kind),
      b = aggregate(high, kind);
    if (a > 0 || b > 0)
      outcomes.push({
        kind,
        label,
        itemId: null,
        itemName: null,
        quality: null,
        tooltipHtml: null,
        dropRateMin: Math.min(a, b),
        dropRateMax: Math.max(a, b),
      });
  }
  return outcomes;
}

export async function loadGatheringPopupDetails(
  resourceId: string,
): Promise<GatheringPopupDetails> {
  const spawns = await query<{ id: string }>(
    "SELECT id FROM gathering_resource_spawns WHERE id=? OR resource_id=? ORDER BY id",
    [resourceId, resourceId],
  );
  const model = await loadBrowserAcquisition({
    kind: "providers",
    providers: spawns.map(({ id }) => ({ kind: "resource_spawns", id })),
  });
  const methods = [...model.methodViews.values()].filter(
    (method) => method.kind === "gather",
  );
  const fishing = methods.find((method) => method.ruleId === "fishing");
  if (fishing)
    return {
      drops: [],
      fishingOutcomes: await fishingOutcomes(model, fishing),
    };
  const drops = popupDrops(model, methods);
  for (const drop of drops) {
    const applicable = methods.filter((method) =>
      method.outputs.some(
        (output) =>
          output.item_id === drop.itemId && output.yield_rule === "radiant",
      ),
    );
    if (applicable.length) {
      drop.dropRate = Math.max(
        ...applicable.map(
          (method) =>
            targetChance(
              results(model, method, { professionFraction: 0 }),
              drop.itemId,
            ) ?? 0,
        ),
      );
      drop.dropRateMax = Math.max(
        ...applicable.map(
          (method) =>
            targetChance(
              results(model, method, { professionFraction: 1 }),
              drop.itemId,
            ) ?? 0,
        ),
      );
    }
  }
  return { drops };
}

const ALTAR_TIERS = ["common", "magic", "epic", "legendary"] as const;

export async function loadAltarPopupDetails(
  altarId: string,
): Promise<AltarPopupDetails> {
  const { model, methods } = await providerModel({
    kind: "altars",
    id: altarId,
  });
  const altar = entity(model, "altars", altarId);
  if (!altar) return { rewards: [], bossDrops: [], finalMonsterIds: [] };
  const level = await maxLevel();
  const final = methods.filter(
    (method) =>
      method.kind === "kill" && method.detail.event_kind === "altar_final",
  );
  const rewardIds = new Set(
    ALTAR_TIERS.map((tier) => altar[`reward_${tier}_id`]),
  );
  const rewards: PopupAltarReward[] = [];
  for (const tier of ALTAR_TIERS) {
    const itemId = altar[`reward_${tier}_id`];
    if (typeof itemId !== "string") continue;
    const rates = final
      .map((method) => targetChance(results(model, method, {}, itemId), itemId))
      .filter((rate): rate is number => rate !== null && rate > 0);
    if (!rates.length) continue;
    rewards.push({
      tier,
      ...altarThresholds(altar),
      maxLevel: level,
      ...itemFields(model, itemId),
      dropRate: Math.max(...rates),
    });
  }
  const finalMonsterIds = [
    ...new Set(final.map((method) => String(method.detail.monster_id))),
  ];
  const bossDrops = finalMonsterIds.flatMap((monsterId) => {
    const monster = entity(model, "monsters", monsterId);
    if (!monster || (!monster.is_boss && !monster.is_elite)) return [];
    const drops = popupDrops(
      model,
      final.filter((method) => method.detail.monster_id === monsterId),
      true,
    ).filter((drop) => drop.isBestiary && !rewardIds.has(drop.itemId));
    return drops.length
      ? [{ monsterId, monsterName: String(monster.name), drops }]
      : [];
  });
  return { rewards, bossDrops, finalMonsterIds };
}

export async function loadAltarBasicInfo(
  altarId: string,
): Promise<AltarBasicInfo | null> {
  const [altar] = await query<AltarBasicInfo>(
    "SELECT a.id,a.name,a.zone_id zoneId,z.name zoneName FROM altars a LEFT JOIN zones z ON z.id=a.zone_id WHERE a.id=?",
    [altarId],
  );
  return altar ?? null;
}

export async function loadItemPopupDetails(
  itemId: string,
): Promise<ItemPopupDetails | null> {
  const model = await loadBrowserAcquisition({
    kind: "items",
    itemIds: [itemId],
  });
  const item = entity(model, "items", itemId);
  if (!item) return null;
  const source = projectItemSources(model, itemId);
  const methods = source.methods.filter(mapMethodIsVisible);
  const droppers: ItemPopupDropper[] = [];
  const altarSources: ItemPopupAltarSource[] = [];
  const vendors: ItemPopupVendor[] = [];
  const questRewards: ItemPopupQuestReward[] = [];
  const gatheringSources: ItemPopupGatherSource[] = [];
  const chestSources: ItemPopupChestSource[] = [];
  const craftingSources: ItemPopupCraftSource[] = [];
  const mergeSources: ItemPopupMergeSource[] = [];
  const treasureMapSources: ItemPopupTreasureMapSource[] = [];
  let level: number | null = null;
  // A distribution item is never an award output: list the parent awards that roll it.
  const wrapperAwards = source.inspection.parentAwards.filter(
    (method) =>
      mapMethodIsVisible(method) &&
      !methods.some((other) => other.methodId === method.methodId),
  );
  // A pack is offered rather than delivered: list the vendors and recipes that offer it, as its page does.
  const offers = source.inspection.offeredAssets.filter(
    (method) =>
      method.rooted &&
      mapMethodIsVisible(method) &&
      !methods.some((other) => other.methodId === method.methodId),
  );
  const recipeVariants = new Map<string, number>();
  for (const method of [...methods, ...offers]) {
    if (method.kind !== "recipe") continue;
    const routeId =
      method.detail.crafting_recipe_id ??
      method.detail.alchemy_recipe_id ??
      method.detail.scribing_recipe_id;
    if (typeof routeId === "string")
      recipeVariants.set(routeId, (recipeVariants.get(routeId) ?? 0) + 1);
  }
  for (const method of [...methods, ...wrapperAwards, ...offers]) {
    const rates = wrapperAwards.includes(method)
      ? wrapperChance(model, method, itemId)
      : chance(model, method, itemId);
    if (rates.requiresQuest) continue;
    if (method.kind === "kill") {
      const monster = entity(model, "monsters", method.detail.monster_id);
      if (!monster || rates.dropRate <= 0) continue;
      if (method.detail.event_kind === "altar_final") {
        const altar = entity(model, "altars", method.detail.altar_id);
        if (!altar) continue;
        level ??= await maxLevel();
        const tier =
          ALTAR_TIERS.find((tier) => altar[`reward_${tier}_id`] === itemId) ??
          null;
        const row: ItemPopupAltarSource = {
          altarId: altar.id,
          altarName: String(altar.name),
          altarType: String(altar.type),
          tier,
          ...altarThresholds(altar),
          maxLevel: level,
          ...rates,
          ...(tier ? {} : { monsterName: String(monster.name) }),
        };
        const previous = altarSources.find(
          (s) =>
            s.altarId === altar.id &&
            s.tier === tier &&
            s.monsterName === row.monsterName,
        );
        if (!previous) altarSources.push(row);
        else if (previous.dropRate < row.dropRate) Object.assign(previous, row);
      } else {
        const positions = method.providers.filter(
          (p) => p.ref.kind === "monster_spawns",
        );
        if (!positions.length) continue;
        const levels = positions.map((p) =>
          Number(
            entity(model, "monster_spawns", p.ref.id)?.level ?? monster.level,
          ),
        );
        const zone = entity(
          model,
          "zones",
          positions.find((p) => p.location?.zoneId)?.location?.zoneId,
        );
        const row = {
          monsterId: monster.id,
          monsterName: String(monster.name),
          level: Math.min(...levels),
          isBoss: Boolean(monster.is_boss),
          isFabled: Boolean(monster.is_fabled),
          isElite: Boolean(monster.is_elite),
          ...rates,
          zoneName: zone ? String(zone.name) : null,
        };
        const previous = droppers.find(
          (dropper) => dropper.monsterId === monster.id,
        );
        if (!previous) droppers.push(row);
        else if (previous.dropRate < row.dropRate) Object.assign(previous, row);
      }
    } else if (method.kind === "vendor") {
      const npc = entity(model, "npcs", method.detail.npc_id);
      if (!npc) continue;
      const inputs = method.costGroups.flatMap((group) => group.inputs);
      const cost =
        inputs.find((input) => input.resource_kind === "item") ??
        inputs.find((input) => input.resource_kind === "gold");
      if (inputs.some((input) => input.withheld)) continue;
      const currency = entity(model, "items", cost?.item_id);
      const output = method.outputs.find((output) => output.item_id === itemId);
      const resultAmount =
        output?.quantity.kind === "exact" ? output.quantity.value : null;
      if (
        !vendors.some(
          (vendor) =>
            vendor.npcId === npc.id &&
            vendor.currencyItemId === (cost?.item_id ?? null) &&
            vendor.price === (cost?.amount ?? 0) &&
            vendor.resultAmount === resultAmount,
        )
      ) {
        vendors.push({
          npcId: npc.id,
          npcName: String(npc.name),
          price: cost?.amount ?? 0,
          resultAmount,
          currencyItemId: cost?.item_id ?? null,
          currencyItemName: currency ? String(currency.name) : null,
        });
      }
    } else if (method.kind === "quest_complete") {
      const quest = entity(model, "quests", method.detail.quest_id);
      if (quest && !questRewards.some((reward) => reward.questId === quest.id))
        questRewards.push({
          questId: quest.id,
          questName: String(quest.name),
          levelRecommended: Number(quest.level_recommended),
        });
    } else if (method.kind === "gather") {
      const resource = entity(
        model,
        "gathering_resources",
        method.detail.resource_id,
      );
      if (
        !resource ||
        gatheringSources.some((gather) => gather.resourceId === resource.id)
      )
        continue;
      const fishing = method.ruleId === "fishing";
      let fishingChanceMin: number | null = null;
      let fishingChanceMax: number | null = null;
      let fishingSourceRole: ItemPopupGatherSource["fishingSourceRole"] = null;
      if (fishing) {
        const [low, high] = await fishingScenarios(model, method);
        const a =
          targetChance(results(model, method, low), itemId, "cast") ?? 0;
        const b =
          targetChance(results(model, method, high), itemId, "cast") ?? 0;
        fishingChanceMin = Math.min(a, b);
        fishingChanceMax = Math.max(a, b);
        const binding = model.rows.facts.acquisition_method_fishing_rules?.find(
          (row) => row.method_id === method.methodId,
        );
        const rule = model.rows.facts.loot_fishing_rules?.find(
          (row) => row.id === binding?.fishing_rule_id,
        );
        if (!rule) throw new Error(`Missing fishing rule ${method.methodId}`);
        const primary =
          model.entriesByPool.get(String(rule.primary_pool_id)) ?? [];
        const trash = model.entriesByPool.get(String(rule.trash_pool_id)) ?? [];
        fishingSourceRole = primary.some((entry) => entry.item_id === itemId)
          ? "primary"
          : trash.some((entry) => entry.item_id === itemId)
            ? "trash"
            : "fallback";
      }
      gatheringSources.push({
        resourceId: resource.id,
        resourceName: String(resource.name),
        resourceType: "resource",
        rate: rates.dropRate,
        isFishingSpot: fishing,
        fishingSourceRole,
        fishingChanceMin,
        fishingChanceMax,
        virtualLocationCount: method.providers.filter(
          (provider) =>
            provider.location?.geometryVisibility === "visible" &&
            provider.location.position,
        ).length,
      });
    } else if (method.kind === "world_chest") {
      const chest = entity(model, "chests", method.detail.chest_id);
      if (!chest || chestSources.some((source) => source.chestId === chest.id))
        continue;
      const zone = entity(model, "zones", chest.zone_id);
      chestSources.push({
        chestId: chest.id,
        chestName: zone ? `Chest (${zone.name})` : "Chest",
        rate: rates.dropRate,
      });
    } else if (method.kind === "recipe") {
      const recipeId =
        method.detail.crafting_recipe_id ??
        method.detail.alchemy_recipe_id ??
        method.detail.scribing_recipe_id;
      if (typeof recipeId !== "string")
        throw new Error(`Missing recipe route ${method.methodId}`);
      if (recipeVariants.get(recipeId) !== 1) continue;
      const inputs = method.costGroups.flatMap((group) => group.inputs);
      if (inputs.some((input) => input.withheld)) continue;
      const output = method.outputs.find((output) => output.item_id === itemId);
      craftingSources.push({
        recipeId,
        resultAmount:
          output?.quantity.kind === "exact"
            ? output.quantity.value
            : Number(method.detail.result_amount),
        materials: inputs.flatMap((input) =>
          input.resource_kind === "item" && input.item_id
            ? [
                {
                  itemId: input.item_id,
                  itemName: String(entity(model, "items", input.item_id)?.name),
                  amount: input.amount,
                },
              ]
            : [],
        ),
      });
    } else if (method.kind === "merge" || method.kind === "fragment") {
      if (
        method.costGroups.some((group) =>
          group.inputs.some((input) => input.withheld),
        )
      )
        continue;
      for (const group of method.costGroups)
        for (const input of group.inputs) {
          if (
            input.resource_kind === "item" &&
            input.item_id &&
            !mergeSources.some((source) => source.itemId === input.item_id)
          )
            mergeSources.push({
              itemId: input.item_id,
              itemName: String(entity(model, "items", input.item_id)?.name),
            });
        }
    } else if (method.kind === "treasure_dig") {
      const map = entity(model, "items", method.detail.map_item_id);
      const location = entity(
        model,
        "treasure_locations",
        method.detail.treasure_location_id,
      );
      const zone = entity(model, "zones", location?.zone_id);
      if (map && zone)
        treasureMapSources.push({
          mapItemId: map.id,
          mapItemName: String(map.name),
          mapItemTooltipHtml:
            typeof map.tooltip_html === "string" ? map.tooltip_html : null,
          zoneName: String(zone.name),
        });
    }
  }
  const use = projectItemUsages(model, itemId).find(
    (use) => use.method?.kind === "treasure_dig",
  );
  const destination = use?.method
    ? entity(
        model,
        "treasure_locations",
        use.method.detail.treasure_location_id,
      )
    : undefined;
  const rewardId = use?.method?.outputs.find(
    (output) => output.item_id && !output.withheld,
  )?.item_id;
  const reward = entity(model, "items", rewardId);
  const zone = entity(model, "zones", destination?.zone_id);
  const [visualAsset] = await query<
    NonNullable<ItemPopupDetails["visualAsset"]>
  >(
    "SELECT public_path,width,height FROM visual_assets WHERE domain='item' AND entity_id=? AND kind='icon'",
    [itemId],
  );
  return {
    id: item.id,
    name: String(item.name),
    quality: Number(item.quality),
    tooltipHtml:
      typeof item.tooltip_html === "string" ? item.tooltip_html : null,
    visualAsset: visualAsset ?? null,
    canFocus: itemMapLocations(model, itemId).length > 0,
    droppers: droppers.sort(
      (a, b) => b.dropRate - a.dropRate || a.level - b.level,
    ),
    altarSources,
    vendors: vendors.sort((a, b) => a.npcName.localeCompare(b.npcName)),
    questRewards,
    gatheringSources,
    chestSources,
    craftingSources,
    mergeSources,
    treasureMapSources,
    treasureDestination:
      destination && zone
        ? {
            treasureLocationId: destination.id,
            zoneId: zone.id,
            zoneName: String(zone.name),
            rewardItemId: rewardId ?? null,
            rewardItemName: reward ? String(reward.name) : null,
            rewardItemTooltipHtml:
              typeof reward?.tooltip_html === "string"
                ? reward.tooltip_html
                : null,
          }
        : null,
  };
}

export async function loadQuestPopupDetails(
  questId: string,
): Promise<QuestPopupDetails | null> {
  return (await loadQuestPopupDetailsBatch([questId])).get(questId) ?? null;
}

export async function loadQuestPopupDetailsBatch(
  questIds: readonly string[],
): Promise<ReadonlyMap<string, QuestPopupDetails>> {
  const ids = [...new Set(questIds)];
  const result = new Map<string, QuestPopupDetails>();
  if (!ids.length) return result;
  const model = await loadBrowserAcquisition({
    kind: "requirements",
    entities: ids.map((id) => ({ kind: "quest", id })),
  });
  const npcsByQuest = new Map<string, QuestPopupNpc[]>();
  const focusableQuests = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = ids.slice(offset, offset + 200);
    const memberships = await query<{
      quest_id: string;
      npc_id: string;
      name: string;
      role: string;
      zone_name: string | null;
      has_position: number;
    }>(
      `SELECT DISTINCT m.quest_id,m.npc_id,n.name,m.role,z.name zone_name,(ns.position_x IS NOT NULL AND ns.position_y IS NOT NULL) has_position FROM npc_quest_memberships m JOIN npcs n ON n.id=m.npc_id LEFT JOIN npc_spawns ns ON ns.npc_id=n.id LEFT JOIN zones z ON z.id=ns.zone_id WHERE m.quest_id IN (${batch.map(() => "?").join(",")}) ORDER BY n.name,z.name,m.role`,
      batch,
    );
    for (const row of memberships) {
      if (row.has_position) focusableQuests.add(row.quest_id);
      const npcs = npcsByQuest.get(row.quest_id) ?? [];
      let npc = npcs.find((n) => n.npcId === row.npc_id);
      if (!npc) {
        npc = {
          npcId: row.npc_id,
          npcName: row.name,
          zoneName: row.zone_name,
          isGiver: false,
          isTurnIn: false,
        };
        npcs.push(npc);
      }
      if (row.role === "offer") npc.isGiver = true;
      if (row.role === "complete") npc.isTurnIn = true;
      npcsByQuest.set(row.quest_id, npcs);
    }
  }
  const childTables: Record<string, string> = {
    item: "quest_objective_items",
    monster: "quest_objective_monsters",
    location: "quest_objective_locations",
    brew: "quest_objective_brews",
  };
  const children = Object.fromEntries(
    Object.entries(childTables).map(([kind, table]) => [
      kind,
      new Map((model.rows.facts[table] ?? []).map((row) => [row.id, row])),
    ]),
  );
  const objectivesByQuest = new Map<string, QuestObjective[]>();
  for (const objective of [...(model.rows.facts.quest_objectives ?? [])].sort(
    (a, b) => Number(a.ordinal) - Number(b.ordinal),
  )) {
    const kind = String(objective.kind);
    // Source: server-scripts/UIQuestTracking.cs:LateUpdate — questLocation and finishQuestLocation only place the tracker mark and arrow in the player's zone, so they are not quest steps.
    if (objective.role === "tracking_location") continue;
    if (objective.withheld || kind === "brew") continue;
    const child = children[kind]?.get(objective.id);
    if (!child)
      throw new Error(`Missing quest objective detail ${objective.id}`);
    const targetId =
      typeof child.item_id === "string"
        ? child.item_id
        : typeof child.monster_id === "string"
          ? child.monster_id
          : null;
    const target = entity(
      model,
      kind === "monster" ? "monsters" : "items",
      targetId,
    );
    const quest = entity(model, "quests", objective.quest_id);
    const zone = entity(model, "zones", child.zone_id);
    const subZone = entity(model, "zone_triggers", child.sub_zone_id);
    const role = String(objective.role);
    const type: QuestObjective["type"] =
      kind === "monster"
        ? "kill"
        : kind === "location"
          ? "discover"
          : role === "gather_counter"
            ? "gather"
            : role === "equipped"
              ? "equip"
              : quest?.remove_items_on_complete
                ? "deliver"
                : "have";
    const objectives = objectivesByQuest.get(String(objective.quest_id)) ?? [];
    objectives.push({
      type,
      targetId,
      targetName: String(
        target?.name ??
          subZone?.name ??
          zone?.name ??
          child.discovered_location ??
          child.tracking_quest_location ??
          "Location",
      ),
      amount: objective.amount === null ? 1 : Number(objective.amount),
      quality: Number(target?.quality ?? 0),
      tooltipHtml:
        typeof target?.tooltip_html === "string" ? target.tooltip_html : null,
      zoneName:
        subZone && subZone.name !== zone?.name
          ? String(zone?.name ?? "")
          : null,
      position:
        !objective.withheld &&
        typeof child.position_x === "number" &&
        typeof child.position_y === "number"
          ? [child.position_x, -child.position_y]
          : undefined,
    });
    objectivesByQuest.set(String(objective.quest_id), objectives);
  }
  for (const questId of ids) {
    const quest = entity(model, "quests", questId);
    if (!quest) continue;
    const rewardItems: QuestRewardItem[] = [];
    const methods = [...model.methodViews.values()].filter(
      (method) =>
        method.kind === "quest_complete" && method.detail.quest_id === questId,
    );
    for (const method of methods)
      for (const output of method.outputs) {
        if (
          !output.item_id ||
          output.withheld ||
          output.delivery === "quest_progress"
        )
          continue;
        const slot = model.rows.facts.quest_reward_slots?.find(
          (row) =>
            row.quest_id === questId && row.ordinal === output.condition_slot,
        );
        if (slot?.class_withheld) continue;
        const classRow = entity(model, "classes", slot?.class_id);
        const classSpecific =
          slot?.slot_kind === "class" ? String(classRow?.name) : null;
        const fields = itemFields(model, output.item_id);
        rewardItems.push({ ...fields, classSpecific });
      }
    const objectives = objectivesByQuest.get(questId) ?? [];
    const npcs = npcsByQuest.get(questId) ?? [];
    if (quest.is_find_npc_quest)
      for (const npc of npcs.filter((npc) => npc.isTurnIn))
        objectives.push({
          type: "find",
          targetId: npc.npcId,
          targetName: npc.npcName,
          amount: 1,
        });
    result.set(questId, {
      id: quest.id,
      name: String(quest.name),
      levelRecommended: Number(quest.level_recommended),
      displayType: String(quest.display_type),
      isMainQuest: Boolean(quest.is_main_quest),
      isEpicQuest: Boolean(quest.is_epic_quest),
      isAdventurerQuest: Boolean(quest.is_adventurer_quest),
      isRepeatable: Boolean(quest.is_repeatable),
      gold: Number(quest.reward_gold ?? 0),
      exp: Number(quest.reward_experience ?? 0),
      canFocus: focusableQuests.has(questId),
      objectives,
      rewardItems,
      npcs,
    });
  }
  return result;
}

export async function loadZonePopupDetails(
  zoneId: string,
): Promise<ZonePopupDetails> {
  const monsters = await query<
    ZonePopupMonster & { is_boss: number; is_elite: number }
  >(
    `SELECT m.id,m.name,COALESCE(MIN(ms.level),m.level) level,m.is_boss,m.is_elite
     FROM monster_spawns ms JOIN monsters m ON m.id=ms.monster_id
     WHERE ms.zone_id=? AND (m.is_boss=1 OR m.is_elite=1)
     GROUP BY m.id ORDER BY level,m.name`,
    [zoneId],
  );
  const altars = await query<ZonePopupAltar>(
    "SELECT id,name FROM altars WHERE zone_id=? ORDER BY name",
    [zoneId],
  );
  const [sage] = await query<ZonePopupRenewalSage>(
    `SELECT n.id,n.name,ns.zone_id zoneId,z.name zoneName,n.gold_required_respawn_dungeon goldCost FROM npcs n JOIN npc_spawns ns ON ns.npc_id=n.id JOIN zones z ON z.id=ns.zone_id JOIN zones dz ON dz.zone_id=n.respawn_dungeon_id WHERE dz.id=? AND n.respawn_dungeon_id!=? ORDER BY n.id,ns.id LIMIT 1`,
    [zoneId, WORLD_BOSS_DUNGEON_ID],
  );
  return {
    bosses: monsters.filter((monster) => monster.is_boss),
    elites: monsters.filter((monster) => monster.is_elite && !monster.is_boss),
    altars,
    renewalSage: sage ?? null,
  };
}
