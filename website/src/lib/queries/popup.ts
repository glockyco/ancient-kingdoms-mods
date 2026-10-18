import { query } from "$lib/db";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";
import {
  loadBrowserAcquisition,
  itemMapLocations,
  mapMethodIsVisible,
} from "$lib/map/acquisition";
import {
  projectAcquisitionNames,
  projectItemSources,
  projectItemUsages,
  projectMonsterLoot,
  projectProviderMethods,
} from "$lib/acquisition/projections";
import type {
  AcquisitionModel,
  DirectLocation,
  ItemSourceView,
  ItemUseView,
  MethodView,
  ProviderRef,
  RequirementEntityRef,
  RequirementRoot,
} from "$lib/acquisition/types";

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

export interface PopupItem {
  id: string;
  name: string;
  quality: number;
  tooltipHtml: string | null;
  iconPath: string | null;
}
export interface PopupAcquisition {
  model: AcquisitionModel;
  methods: readonly MethodView[];
  items: Readonly<Record<string, PopupItem>>;
  names: Readonly<Record<string, string>>;
  requirements: readonly RequirementRoot[];
}
async function presentation(
  model: AcquisitionModel,
  methods: readonly MethodView[],
  requirements: readonly RequirementRoot[] = [],
): Promise<PopupAcquisition> {
  const items: Record<string, PopupItem> = {};
  const names = projectAcquisitionNames(model);
  const paths = await loadMapItemIconPaths(
    (model.rows.entities.items ?? []).map((row) => row.id),
  );
  for (const row of model.rows.entities.items ?? [])
    items[row.id] = {
      id: row.id,
      name: String(row.name),
      quality: Number(row.quality ?? 0),
      tooltipHtml:
        typeof row.tooltip_html === "string" ? row.tooltip_html : null,
      iconPath: paths[row.id],
    };
  return {
    model,
    methods: methods.filter(mapMethodIsVisible),
    items,
    names,
    requirements,
  };
}
export async function loadMapItems(
  ids: Iterable<string>,
): Promise<Readonly<Record<string, PopupItem>>> {
  const unique = [...new Set(ids)];
  const paths = await loadMapItemIconPaths(unique);
  const result: Record<string, PopupItem> = {};
  for (let offset = 0; offset < unique.length; offset += 200) {
    const batch = unique.slice(offset, offset + 200);
    const rows = await query<{
      id: string;
      name: string;
      quality: number;
      tooltip_html: string | null;
    }>(
      `SELECT id,name,quality,tooltip_html FROM items WHERE id IN (${batch.map(() => "?").join(",")})`,
      batch,
    );
    for (const row of rows)
      result[row.id] = {
        id: row.id,
        name: row.name,
        quality: row.quality,
        tooltipHtml: row.tooltip_html,
        iconPath: paths[row.id],
      };
  }
  return result;
}
export interface PopupRenewalSage {
  npcId: string;
  npcName: string;
  zoneId: string;
  zoneName: string;
  cost: number;
}
export type MonsterPopupVisualAsset = Pick<
  EntityVisualAsset,
  "width" | "height"
> & {
  publicPath: EntityVisualAsset["public_path"];
  sourceType: EntityVisualAsset["source_type"];
};
export interface MonsterPopupDetails extends PopupAcquisition {
  renewalSages: PopupRenewalSage[];
  health: number;
  damage: number;
  magicDamage: number;
  visualAsset: MonsterPopupVisualAsset | null;
}
export async function loadMonsterPopupDetails(
  monsterId: string,
  level: number,
  spawnId: string | null = null,
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
  const triggerRequirements = spawnId
    ? [...(model.entities.get("summon_triggers")?.values() ?? [])]
        .filter((trigger) => trigger.summoned_monster_spawn_id === spawnId)
        .flatMap(
          (trigger) =>
            model.requirements.get(`summon_trigger:${trigger.id}`) ?? [],
        )
    : [];
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
    ...(await presentation(model, methods, triggerRequirements)),
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
export interface PopupQuestInfo {
  id: string;
  name: string;
  levelRecommended: number;
  role: "offer" | "complete";
}
export interface PopupWorldBoss {
  id: string;
  name: string;
  level: number;
}
export interface NpcPopupDetails extends PopupAcquisition {
  quests: PopupQuestInfo[];
  skills: { id: string; name: string; index: number }[];
  worldBosses: PopupWorldBoss[];
  subZones: string[];
  visualAsset: MonsterPopupVisualAsset | null;
}
export async function loadNpcPopupDetails(
  npcId: string,
  isWorldBossReset = false,
): Promise<NpcPopupDetails> {
  const model = await loadBrowserAcquisition({
    kind: "providers",
    providers: [{ kind: "npcs", id: npcId }],
  });
  const [visual] = await query<{
    public_path: string;
    width: number;
    height: number;
    source_type: string;
  }>(
    `SELECT public_path,width,height,source_type FROM visual_assets WHERE domain='npc' AND entity_id=? AND kind='primary'`,
    [npcId],
  );
  const quests = await query<{
    id: string;
    name: string;
    levelRecommended: number;
    role: "offer" | "complete";
  }>(
    `SELECT q.id,q.name,q.level_recommended levelRecommended,m.role FROM npc_quest_memberships m JOIN quests q ON q.id=m.quest_id WHERE m.npc_id=? ORDER BY m.role,m.ordinal`,
    [npcId],
  );
  const skills = await query<{ id: string; name: string; index: number }>(
    `SELECT s.id,s.name,ns.skill_index 'index' FROM npc_skills ns JOIN skills s ON s.id=ns.skill_id WHERE ns.npc_id=? ORDER BY ns.skill_index`,
    [npcId],
  );
  const subZones = await query<{ name: string }>(
    `SELECT DISTINCT zt.name FROM npc_spawns ns JOIN zone_triggers zt ON zt.id=ns.sub_zone_id WHERE ns.npc_id=? ORDER BY zt.name`,
    [npcId],
  );
  return {
    ...(await presentation(
      model,
      projectProviderMethods(model, { kind: "npcs", id: npcId }),
    )),
    quests,
    skills,
    worldBosses: isWorldBossReset
      ? await query<PopupWorldBoss>(
          `SELECT id,name,level FROM monsters WHERE is_world_boss=1 ORDER BY level,name`,
        )
      : [],
    subZones: subZones.map((z) => z.name),
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
export type ChestPopupDetails = PopupAcquisition;
export type GatheringPopupDetails = PopupAcquisition;
export type AltarPopupDetails = PopupAcquisition;
export async function loadProviderPopupDetails(
  provider: ProviderRef,
): Promise<PopupAcquisition> {
  const model = await loadBrowserAcquisition({
    kind: "providers",
    providers: [provider],
  });
  return presentation(model, projectProviderMethods(model, provider));
}
export async function loadRequirementPopupDetails(
  kind: RequirementEntityRef["kind"],
  id: string,
): Promise<PopupAcquisition> {
  const model = await loadBrowserAcquisition({
    kind: "requirements",
    entities: [{ kind, id }],
  });
  return presentation(model, [], model.requirements.get(`${kind}:${id}`) ?? []);
}
export async function loadChestPopupDetails(
  chestId: string,
): Promise<ChestPopupDetails> {
  return loadProviderPopupDetails({ kind: "chests", id: chestId });
}
export async function loadGatheringPopupDetails(
  resourceSpawnId: string,
): Promise<GatheringPopupDetails> {
  return loadProviderPopupDetails({
    kind: "resource_spawns",
    id: resourceSpawnId,
  });
}
export async function loadAltarPopupDetails(
  altarId: string,
): Promise<AltarPopupDetails> {
  return loadProviderPopupDetails({ kind: "altars", id: altarId });
}
export interface AltarBasicInfo {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
}
export async function loadAltarBasicInfo(
  altarId: string,
): Promise<AltarBasicInfo | null> {
  const [altar] = await query<AltarBasicInfo>(
    `SELECT a.id,a.name,a.zone_id zoneId,z.name zoneName FROM altars a LEFT JOIN zones z ON z.id=a.zone_id WHERE a.id=?`,
    [altarId],
  );
  return altar ?? null;
}
export interface ItemPopupDetails extends PopupAcquisition {
  id: string;
  name: string;
  quality: number;
  sources: ItemSourceView;
  usages: readonly ItemUseView[];
  locations: readonly DirectLocation[];
}
export async function loadItemPopupDetails(
  itemId: string,
): Promise<ItemPopupDetails | null> {
  const model = await loadBrowserAcquisition({
    kind: "items",
    itemIds: [itemId],
  });
  const item = model.entities.get("items")?.get(itemId);
  if (!item) return null;
  const canonical = projectItemSources(model, itemId);
  const methods = canonical.methods.filter(mapMethodIsVisible);
  const hints = methods.flatMap((method) =>
    method.sourceLevelHint === null ? [] : [method.sourceLevelHint],
  );
  const sources: ItemSourceView = {
    ...canonical,
    methods,
    hasKnownSource: methods.length > 0,
    sourceLevelHint: hints.length ? Math.min(...hints) : null,
    inspection: {
      ...canonical.inspection,
      offeredAssets:
        canonical.inspection.offeredAssets.filter(mapMethodIsVisible),
    },
  };
  return {
    ...(await presentation(
      model,
      sources.methods,
      model.requirements.get(`item:${itemId}`) ?? [],
    )),
    id: item.id,
    name: String(item.name),
    quality: Number(item.quality ?? 0),
    sources,
    usages: projectItemUsages(model, itemId).filter(
      (use) => !use.method || mapMethodIsVisible(use.method),
    ),
    locations: itemMapLocations(model, itemId),
  };
}
export interface QuestPopupNpc {
  npcId: string;
  npcName: string;
  zoneName: string | null;
  isGiver: boolean;
  isTurnIn: boolean;
}
export interface QuestObjective {
  id: string;
  kind: "item" | "monster" | "location" | "brew";
  role: string;
  targetId: string | null;
  targetName: string;
  amount: number | null;
  quality: number;
  tooltipHtml: string | null;
  position?: [number, number];
  zoneName: string | null;
  withheld: boolean;
}
export interface QuestPopupDetails extends PopupAcquisition {
  id: string;
  name: string;
  levelRecommended: number;
  displayType: string;
  isMainQuest: boolean;
  isEpicQuest: boolean;
  isAdventurerQuest: boolean;
  isRepeatable: boolean;
  gold: number;
  exp: number;
  objectives: QuestObjective[];
  npcs: QuestPopupNpc[];
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
  const base = await presentation(model, []);
  const objectivesByQuest = new Map<string, QuestObjective[]>();
  const childTables: Record<string, string> = {
    item: "quest_objective_items",
    monster: "quest_objective_monsters",
    location: "quest_objective_locations",
    brew: "quest_objective_brews",
  };
  const children = new Map(
    Object.entries(childTables).map(([kind, table]) => [
      kind,
      new Map((model.rows.facts[table] ?? []).map((row) => [row.id, row])),
    ]),
  );
  for (const objective of [...(model.rows.facts.quest_objectives ?? [])].sort(
    (a, b) => Number(a.ordinal) - Number(b.ordinal),
  )) {
    const kind = String(objective.kind) as QuestObjective["kind"];
    const child = children.get(kind)?.get(objective.id);
    if (!child)
      throw new Error(
        `acquisition: quest objective ${objective.id}: missing ${kind} detail`,
      );
    const targetId =
      typeof child.item_id === "string"
        ? child.item_id
        : typeof child.monster_id === "string"
          ? child.monster_id
          : typeof child.sub_zone_id === "string"
            ? child.sub_zone_id
            : typeof child.zone_id === "string"
              ? child.zone_id
              : null;
    const target = targetId
      ? model.entities
          .get(
            kind === "monster"
              ? "monsters"
              : kind === "location"
                ? child.sub_zone_id
                  ? "zone_triggers"
                  : "zones"
                : "items",
          )
          ?.get(targetId)
      : null;
    const questId = String(objective.quest_id);
    const objectives = objectivesByQuest.get(questId) ?? [];
    objectives.push({
      id: objective.id,
      kind,
      role: String(objective.role),
      targetId,
      targetName: objective.withheld
        ? "Unpublished target"
        : String(target?.name ?? child.discovered_location ?? "Location"),
      amount: objective.amount === null ? null : Number(objective.amount),
      quality: Number(target?.quality ?? 0),
      tooltipHtml:
        typeof target?.tooltip_html === "string" ? target.tooltip_html : null,
      position:
        !objective.withheld &&
        typeof child.position_x === "number" &&
        typeof child.position_y === "number"
          ? [child.position_x, -child.position_y]
          : undefined,
      zoneName:
        typeof child.zone_id === "string"
          ? String(model.entities.get("zones")?.get(child.zone_id)?.name ?? "")
          : null,
      withheld: Boolean(objective.withheld),
    });
    objectivesByQuest.set(questId, objectives);
  }
  const npcsByQuest = new Map<string, QuestPopupNpc[]>();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = ids.slice(offset, offset + 200);
    const memberships = await query<{
      quest_id: string;
      npc_id: string;
      name: string;
      role: string;
      zone_name: string | null;
    }>(
      `SELECT DISTINCT m.quest_id,m.npc_id,n.name,m.role,z.name zone_name FROM npc_quest_memberships m JOIN npcs n ON n.id=m.npc_id LEFT JOIN npc_spawns ns ON ns.npc_id=n.id LEFT JOIN zones z ON z.id=ns.zone_id WHERE m.quest_id IN (${batch.map(() => "?").join(",")}) ORDER BY n.name,z.name,m.role`,
      batch,
    );
    for (const row of memberships) {
      const npcs = npcsByQuest.get(row.quest_id) ?? [];
      let npc = npcs.find(
        (n) => n.npcId === row.npc_id && n.zoneName === row.zone_name,
      );
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
  const methodsByQuest = new Map<string, MethodView[]>();
  for (const method of base.model.methodViews.values()) {
    if (method.kind !== "quest_accept" && method.kind !== "quest_complete")
      continue;
    if (!mapMethodIsVisible(method)) continue;
    const questId = String(method.detail.quest_id);
    const methods = methodsByQuest.get(questId) ?? [];
    methods.push(method);
    methodsByQuest.set(questId, methods);
  }
  for (const questId of ids) {
    const quest = model.entities.get("quests")?.get(questId);
    if (!quest) continue;
    result.set(questId, {
      ...base,
      methods: methodsByQuest.get(questId) ?? [],
      requirements: model.requirements.get(`quest:${questId}`) ?? [],
      id: quest.id,
      name: String(quest.name),
      levelRecommended: Number(quest.level_recommended ?? 0),
      displayType: String(quest.display_type ?? ""),
      isMainQuest: Boolean(quest.is_main_quest),
      isEpicQuest: Boolean(quest.is_epic_quest),
      isAdventurerQuest: Boolean(quest.is_adventurer_quest),
      isRepeatable: Boolean(quest.is_repeatable),
      gold: Number(quest.reward_gold ?? 0),
      exp: Number(quest.reward_experience ?? 0),
      objectives: objectivesByQuest.get(questId) ?? [],
      npcs: npcsByQuest.get(questId) ?? [],
    });
  }
  return result;
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
export async function loadZonePopupDetails(
  zoneId: string,
): Promise<ZonePopupDetails> {
  const spawns = await query<{ id: string }>(
    `SELECT id FROM monster_spawns WHERE zone_id=?`,
    [zoneId],
  );
  const altars = await query<ZonePopupAltar>(
    `SELECT id,name FROM altars WHERE zone_id=? ORDER BY name`,
    [zoneId],
  );
  const providers: ProviderRef[] = [
    ...spawns.map((spawn): ProviderRef => ({
      kind: "monster_spawns",
      id: spawn.id,
    })),
    ...altars.map((altar): ProviderRef => ({ kind: "altars", id: altar.id })),
  ];
  const model = await loadBrowserAcquisition({ kind: "providers", providers });
  const byMonster = new Map<
    string,
    ZonePopupMonster & { isBoss: boolean; isElite: boolean }
  >();
  for (const method of model.methodViews.values()) {
    if (method.kind !== "kill") continue;
    const monster = model.entities
      .get("monsters")
      ?.get(String(method.detail.monster_id));
    if (!monster || (!monster.is_boss && !monster.is_elite)) continue;
    const levels = method.providers.flatMap((provider) => {
      const spawn =
        provider.ref.kind === "monster_spawns"
          ? model.entities.get("monster_spawns")?.get(provider.ref.id)
          : undefined;
      return spawn?.monster_id === monster.id && typeof spawn.level === "number"
        ? [spawn.level]
        : [];
    });
    const level = levels.length ? Math.min(...levels) : Number(monster.level);
    const existing = byMonster.get(monster.id);
    if (existing && existing.level <= level) continue;
    byMonster.set(monster.id, {
      id: monster.id,
      name: String(monster.name),
      level,
      isBoss: Boolean(monster.is_boss),
      isElite: Boolean(monster.is_elite),
    });
  }
  const monsters = [...byMonster.values()].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
  );
  const [sage] = await query<ZonePopupRenewalSage>(
    `SELECT n.id,n.name,ns.zone_id zoneId,z.name zoneName,n.gold_required_respawn_dungeon goldCost FROM npcs n JOIN npc_spawns ns ON ns.npc_id=n.id JOIN zones z ON z.id=ns.zone_id JOIN zones dz ON dz.zone_id=n.respawn_dungeon_id WHERE dz.id=? AND n.respawn_dungeon_id!=? ORDER BY n.id,ns.id LIMIT 1`,
    [zoneId, WORLD_BOSS_DUNGEON_ID],
  );
  return {
    bosses: monsters.filter((m) => m.isBoss),
    elites: monsters.filter((m) => m.isElite && !m.isBoss),
    altars,
    renewalSage: sage ?? null,
  };
}
