import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { RespawnInfo } from "$lib/types/respawn";
import type {
  AcquisitionQuery,
  MethodView,
  RequirementRoot,
} from "$lib/acquisition/types";
import { loadAcquisition } from "$lib/server/acquisition";
import {
  altarOutcomeSemantics,
  consolidateAltarTiers,
  isAltarTierRoot,
} from "$lib/server/altar-tier-summaries";
import { projectAcquisitionNames } from "$lib/acquisition/projections";

export interface SlayerTarget extends RespawnInfo {
  contextId: string;
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  is_boss: boolean;
  is_fabled: boolean;
  is_elite: boolean;
  is_world_boss: boolean;
  visual_public_path: string | null;
  spawn_type: "regular" | "summon" | "altar" | "placeholder";
  zone_id: string | null;
  zone_name: string;
  is_dungeon: boolean;
  position_x: number | null;
  position_y: number | null;
  parent: { id: string; name: string; probability: number | null } | null;
  altar: { id: string; name: string; wave: number | null } | null;
  guards: {
    id: string;
    monsterId: string | null;
    name: string | null;
    withheld: boolean;
  }[];
  requirements: readonly RequirementRoot[];
  altarVariants: readonly MethodView[];
}

export interface SlayerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  targets: SlayerTarget[];
  acquisitionNames: Readonly<Record<string, string>>;
}

type Monster = Pick<
  SlayerTarget,
  | "id"
  | "name"
  | "level_min"
  | "level_max"
  | "is_boss"
  | "is_fabled"
  | "is_elite"
  | "is_world_boss"
  | "visual_public_path"
  | "death_time"
  | "respawn_time"
  | "respawn_probability"
  | "spawn_time_start"
  | "spawn_time_end"
>;

export async function getSlayerPageData(
  dbPath = DB_SOURCE_PATH,
): Promise<SlayerPageData> {
  const db = new Database(dbPath, { readonly: true });
  try {
    const execute: AcquisitionQuery = async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[];
    const profession = db
      .prepare(
        `SELECT p.id, p.name, p.description, p.category, p.max_level, p.achievement_id, a.name AS achievement_name FROM professions p JOIN achievements a ON a.id = p.achievement_id WHERE p.id = 'slayer'`,
      )
      .get() as SlayerPageData["profession"];
    // Source: server-scripts/Database.cs:CalculateSlayerLevelForAccount.
    const monsters = db
      .prepare(
        `SELECT m.id, m.name, m.level_min, m.level_max, m.is_boss, m.is_fabled, m.is_elite, m.is_world_boss, m.death_time, m.respawn_time, m.respawn_probability, m.spawn_time_start, m.spawn_time_end, v.public_path AS visual_public_path FROM monsters m LEFT JOIN visual_assets v ON v.domain = 'monster' AND v.entity_id = m.id AND v.kind = 'primary' WHERE m.is_dummy = 0 AND (m.is_boss = 1 OR m.is_elite = 1) ORDER BY m.level_min, m.name`,
      )
      .all() as Monster[];
    const monsterById = new Map(
      monsters.map((monster) => [monster.id, monster]),
    );
    const model = await loadAcquisition(execute, {
      kind: "monsters",
      monsterIds: monsters.map((monster) => monster.id),
    });
    const triggers = db
      .prepare(
        `SELECT t.id, t.summoned_monster_spawn_id AS spawn_id FROM summon_triggers t JOIN monster_spawns s ON s.id = t.summoned_monster_spawn_id JOIN monsters m ON m.id = s.monster_id WHERE m.is_dummy = 0 AND (m.is_boss = 1 OR m.is_elite = 1) ORDER BY t.id`,
      )
      .all() as { id: string; spawn_id: string }[];
    const triggerModel = await loadAcquisition(execute, {
      kind: "requirements",
      entities: triggers.map((trigger) => ({
        kind: "summon_trigger",
        id: trigger.id,
      })),
    });
    const triggersBySpawn = new Map<string, string[]>();
    for (const trigger of triggers) {
      const ids = triggersBySpawn.get(trigger.spawn_id) ?? [];
      ids.push(trigger.id);
      triggersBySpawn.set(trigger.spawn_id, ids);
    }
    const guards = db
      .prepare(
        `SELECT p.id, p.trigger_id, m.id AS monsterId, m.name, p.withheld FROM summon_trigger_placeholders p JOIN summon_triggers t ON t.id = p.trigger_id JOIN monster_spawns target ON target.id = t.summoned_monster_spawn_id JOIN monsters target_monster ON target_monster.id = target.monster_id LEFT JOIN monster_spawns s ON s.id = p.spawn_id LEFT JOIN monsters m ON m.id = s.monster_id WHERE target_monster.is_dummy = 0 AND (target_monster.is_boss = 1 OR target_monster.is_elite = 1) ORDER BY p.trigger_id, p.placeholder_order`,
      )
      .all() as (SlayerTarget["guards"][number] & { trigger_id: string })[];
    const guardsByTrigger = new Map<string, SlayerTarget["guards"]>();
    for (const guard of guards) {
      const list = guardsByTrigger.get(guard.trigger_id) ?? [];
      list.push({
        id: guard.id,
        monsterId: guard.monsterId,
        name: guard.name,
        withheld: Boolean(guard.withheld),
      });
      guardsByTrigger.set(guard.trigger_id, list);
    }
    const contexts: Array<{ target: SlayerTarget; method: MethodView }> = [];
    for (const method of model.methodViews.values()) {
      if (method.kind !== "kill") continue;
      const monster = monsterById.get(String(method.detail.monster_id));
      if (!monster) continue;
      for (const provider of method.providers) {
        if (
          provider.ref.kind !== "monster_spawns" &&
          provider.ref.kind !== "altars"
        )
          continue;
        const spawn =
          provider.ref.kind === "monster_spawns"
            ? model.entities.get("monster_spawns")?.get(provider.ref.id)
            : undefined;
        const parentSpawnId = method.detail.parent_monster_spawn_id;
        const parentSpawn =
          typeof parentSpawnId === "string"
            ? model.entities.get("monster_spawns")?.get(parentSpawnId)
            : undefined;
        const parentMonster = parentSpawn
          ? model.entities.get("monsters")?.get(String(parentSpawn.monster_id))
          : undefined;
        const altarId =
          typeof method.detail.altar_id === "string"
            ? method.detail.altar_id
            : null;
        const altar = altarId
          ? model.entities.get("altars")?.get(altarId)
          : undefined;
        const triggerIds = spawn ? (triggersBySpawn.get(spawn.id) ?? []) : [];
        const spawnType = altarId
          ? "altar"
          : parentSpawnId
            ? "placeholder"
            : triggerIds.length
              ? "summon"
              : "regular";
        const location = provider.location;
        const zone = location?.zoneId
          ? model.entities.get("zones")?.get(location.zoneId)
          : undefined;
        const position =
          location?.geometryVisibility === "visible" ? location.position : null;
        const target: SlayerTarget = {
          ...monster,
          contextId: `${method.methodId}:${provider.ref.kind}:${provider.ref.id}`,
          is_boss: Boolean(monster.is_boss),
          is_fabled: Boolean(monster.is_fabled),
          is_elite: Boolean(monster.is_elite),
          is_world_boss: Boolean(monster.is_world_boss),
          spawn_type: spawnType,
          special_spawn_type: spawnType === "regular" ? null : spawnType,
          no_respawn: !method.detail.respawn,
          zone_id: location?.zoneId ?? null,
          zone_name: zone ? String(zone.name) : "Unpublished location",
          is_dungeon: Boolean(zone?.is_dungeon),
          position_x: position?.x ?? null,
          position_y: position?.y ?? null,
          parent: parentMonster
            ? {
                id: parentMonster.id,
                name: String(parentMonster.name),
                probability:
                  typeof parentMonster.placeholder_spawn_probability ===
                  "number"
                    ? parentMonster.placeholder_spawn_probability
                    : null,
              }
            : null,
          altar: altar
            ? {
                id: altar.id,
                name: String(altar.name),
                wave:
                  typeof method.detail.wave_number === "number"
                    ? method.detail.wave_number
                    : null,
              }
            : null,
          guards: triggerIds.flatMap((id) => guardsByTrigger.get(id) ?? []),
          requirements: [
            ...method.requirements,
            ...(method.setupMethod?.requirements ?? []),
            ...triggerIds.flatMap(
              (id) =>
                triggerModel.requirements.get(`summon_trigger:${id}`) ?? [],
            ),
          ],
          altarVariants: altar ? [method] : [],
        };
        contexts.push({ target, method });
      }
    }
    const targets = consolidateAltarTiers(
      contexts,
      ({ method }) => method,
      ({ target, method }) => {
        const conditionalItems = new Set(
          method.outputs.flatMap((output) =>
            output.condition_slot !== null && output.item_id
              ? [output.item_id]
              : [],
          ),
        );
        return {
          target: {
            ...target,
            contextId: null,
            altarVariants: null,
            requirements: target.requirements.filter(
              (root) => !isAltarTierRoot(root),
            ),
          },
          outcome: altarOutcomeSemantics(
            method,
            method.outputs.filter((output) => output.condition_slot === null),
            method.probabilityResults.filter(
              (result) =>
                result.target.kind === "gold" ||
                !conditionalItems.has(result.target.itemId),
            ),
          ),
        };
      },
    ).map(({ value, acrossTiers, variants }) =>
      acrossTiers
        ? {
            ...value.target,
            requirements: value.target.requirements.filter(
              (root) => !isAltarTierRoot(root),
            ),
            altarVariants: variants.map(({ method }) => method),
          }
        : value.target,
    );
    targets.sort(
      (a, b) =>
        a.level_min - b.level_min ||
        a.name.localeCompare(b.name) ||
        a.contextId.localeCompare(b.contextId),
    );
    return {
      profession,
      targets,
      acquisitionNames: {
        ...projectAcquisitionNames(model),
        ...projectAcquisitionNames(triggerModel),
      },
    };
  } finally {
    db.close();
  }
}
