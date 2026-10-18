import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { RespawnInfo } from "$lib/types/respawn";
import { loadAcquisition } from "$lib/server/acquisition";

export interface SlayerTarget extends RespawnInfo {
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
  source_monster_id: string | null;
  source_monster_name: string | null;
  source_spawn_probability: number | null;
  source_altar_id: string | null;
  source_altar_name: string | null;
  source_altar_wave: number | null;
  source_altar_activation_item_id: string | null;
  source_altar_activation_item_name: string | null;
  source_summon_kill_monster_id: string | null;
  source_summon_kill_monster_name: string | null;
  source_summon_kill_count: number | null;
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
    const profession = db
      .prepare(
        `
      SELECT p.id, p.name, p.description, p.category, p.max_level,
        p.achievement_id, a.name AS achievement_name
      FROM professions p JOIN achievements a ON a.id = p.achievement_id
      WHERE p.id = 'slayer'
    `,
      )
      .get() as SlayerPageData["profession"];
    // Source: server-scripts/Database.cs:CalculateSlayerLevelForAccount.
    const monsters = db
      .prepare(
        `
      SELECT m.id, m.name, m.level_min, m.level_max, m.is_boss, m.is_fabled,
        m.is_elite, m.is_world_boss, m.death_time, m.respawn_time,
        m.respawn_probability, m.spawn_time_start, m.spawn_time_end,
        v.public_path AS visual_public_path
      FROM monsters m LEFT JOIN visual_assets v
        ON v.domain = 'monster' AND v.entity_id = m.id AND v.kind = 'primary'
      WHERE m.is_dummy = 0 AND (m.is_boss = 1 OR m.is_elite = 1)
      ORDER BY m.level_min, m.name
    `,
      )
      .all() as Monster[];
    const monsterById = new Map(
      monsters.map((monster) => [monster.id, monster]),
    );
    const model = await loadAcquisition(
      async (sql, params) =>
        db.prepare(sql).all(...params) as Record<string, unknown>[],
      { kind: "monsters", monsterIds: monsters.map((monster) => monster.id) },
    );
    const guards = db
      .prepare(
        `
      SELECT t.summoned_monster_spawn_id AS spawn_id,
        m.id AS monster_id, m.name, p.withheld
      FROM summon_triggers t
      LEFT JOIN summon_trigger_placeholders p ON p.trigger_id = t.id
      LEFT JOIN monster_spawns s ON s.id = p.spawn_id
      LEFT JOIN monsters m ON m.id = s.monster_id
      WHERE t.summoned_monster_spawn_id IS NOT NULL
      ORDER BY t.id, p.placeholder_order
    `,
      )
      .all() as {
      spawn_id: string;
      monster_id: string | null;
      name: string | null;
      withheld: number | null;
    }[];
    const guardsBySpawn = new Map<string, typeof guards>();
    for (const guard of guards) {
      const group = guardsBySpawn.get(guard.spawn_id) ?? [];
      if (guard.withheld !== null) group.push(guard);
      guardsBySpawn.set(guard.spawn_id, group);
    }

    const targets = new Map<string, SlayerTarget>();
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
        const parentSpawnId = method.detail.parent_monster_spawn_id;
        const parentSpawn =
          typeof parentSpawnId === "string"
            ? model.entities.get("monster_spawns")?.get(parentSpawnId)
            : undefined;
        const parent = parentSpawn
          ? model.entities.get("monsters")?.get(String(parentSpawn.monster_id))
          : undefined;
        const altarId =
          typeof method.detail.altar_id === "string"
            ? method.detail.altar_id
            : null;
        const altar = altarId
          ? model.entities.get("altars")?.get(altarId)
          : undefined;
        const guardGroup =
          provider.ref.kind === "monster_spawns"
            ? guardsBySpawn.get(provider.ref.id)
            : undefined;
        const spawnType = altarId
          ? "altar"
          : parentSpawnId
            ? "placeholder"
            : guardGroup
              ? "summon"
              : "regular";
        const wave =
          typeof method.detail.wave_number === "number"
            ? method.detail.wave_number
            : null;
        // Altar tiers change rewards, not the target's physical location or spawn requirement.
        const key = JSON.stringify([
          monster.id,
          provider.ref.kind,
          provider.ref.id,
          parentSpawnId ?? null,
          wave,
        ]);
        if (targets.has(key)) continue;
        const location = provider.location;
        const zone = location?.zoneId
          ? model.entities.get("zones")?.get(location.zoneId)
          : undefined;
        const position =
          location?.geometryVisibility === "visible" ? location.position : null;
        const sameGuardType =
          guardGroup !== undefined &&
          guardGroup.length > 0 &&
          guardGroup.every(
            (guard) =>
              !guard.withheld && guard.monster_id === guardGroup[0].monster_id,
          );
        const activationId =
          typeof altar?.required_activation_item_id === "string"
            ? altar.required_activation_item_id
            : null;
        targets.set(key, {
          ...monster,
          is_boss: Boolean(monster.is_boss),
          is_fabled: Boolean(monster.is_fabled),
          is_elite: Boolean(monster.is_elite),
          is_world_boss: Boolean(monster.is_world_boss),
          spawn_type: spawnType,
          special_spawn_type: spawnType === "regular" ? null : spawnType,
          no_respawn: !method.detail.respawn,
          zone_id: location?.zoneId ?? null,
          zone_name: zone ? String(zone.name) : "",
          is_dungeon: Boolean(zone?.is_dungeon),
          position_x: position?.x ?? null,
          position_y: position?.y ?? null,
          source_monster_id: parent?.id ?? null,
          source_monster_name: parent ? String(parent.name) : null,
          source_spawn_probability:
            typeof parent?.placeholder_spawn_probability === "number"
              ? parent.placeholder_spawn_probability
              : null,
          source_altar_id: altarId,
          source_altar_name: altar ? String(altar.name) : null,
          source_altar_wave: wave,
          source_altar_activation_item_id: activationId,
          source_altar_activation_item_name:
            typeof altar?.required_activation_item_name === "string"
              ? altar.required_activation_item_name
              : null,
          source_summon_kill_monster_id: sameGuardType
            ? guardGroup![0].monster_id
            : null,
          source_summon_kill_monster_name: sameGuardType
            ? guardGroup![0].name
            : null,
          source_summon_kill_count: guardGroup?.length ?? null,
        });
      }
    }
    return {
      profession,
      targets: [...targets.values()].sort(
        (a, b) => a.level_min - b.level_min || a.name.localeCompare(b.name),
      ),
    };
  } finally {
    db.close();
  }
}
