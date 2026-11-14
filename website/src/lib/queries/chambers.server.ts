import { error } from "@sveltejs/kit";
import type Database from "better-sqlite3";
import type { ChambersOverview } from "$lib/components/chambers/model";
import { entityImageUrl } from "$lib/utils/entityImage";

interface DefinitionRow {
  id: string;
  zone_id: string;
  keeper_npc_id: string;
  room_count: number;
  run_duration_seconds: number;
  minimum_level: number;
  wave_count: number;
  maximum_hunt_targets: number;
  maximum_clear_targets: number;
  puzzle_penalty_guards: number;
  combat_experience_multiplier: number;
  final_trial: string;
}

/** The monster's primary image, or null when it has none. */
interface MonsterRow {
  id: string;
  name: string;
  visual_public_path: string | null;
}

/**
 * The Chambers of Chaos definition with its keeper, monster pool, encounter groups,
 * captures and reward range. With a zone id it returns null for a zone that is not
 * a Chambers zone, and without one it requires exactly one definition.
 */
export function loadChambersOverview(
  db: Database.Database,
  zoneId?: string,
): ChambersOverview | null {
  const definitions = (
    zoneId === undefined
      ? db.prepare("SELECT * FROM chambers_definitions").all()
      : db
          .prepare("SELECT * FROM chambers_definitions WHERE zone_id = ?")
          .all(zoneId)
  ) as DefinitionRow[];
  if (zoneId !== undefined && definitions.length === 0) return null;
  if (definitions.length !== 1)
    error(500, `Expected one Chambers definition, found ${definitions.length}`);
  const [chambers] = definitions;

  const keeper = db
    .prepare(
      `SELECT n.id, n.name, va.public_path AS visual_public_path,
              z.id AS zone_id, z.name AS zone_name, t.name AS sub_zone_name
         FROM npcs n
         LEFT JOIN visual_assets va
           ON va.domain = 'npc' AND va.entity_id = n.id AND va.kind = 'primary'
         LEFT JOIN npc_spawns s ON s.npc_id = n.id
         LEFT JOIN zones z ON z.id = s.zone_id
         LEFT JOIN zone_triggers t ON t.id = s.sub_zone_id
        WHERE n.id = ?`,
    )
    .get(chambers.keeper_npc_id) as
    | {
        id: string;
        name: string;
        visual_public_path: string | null;
        zone_id: string | null;
        zone_name: string | null;
        sub_zone_name: string | null;
      }
    | undefined;
  if (!keeper) error(500, `Missing Chambers keeper ${chambers.keeper_npc_id}`);

  const monsters = db
    .prepare(
      `SELECT m.id, m.name, va.public_path AS visual_public_path
         FROM chambers_pool_monsters p
         JOIN monsters m ON m.id = p.monster_id
         LEFT JOIN visual_assets va
           ON va.domain = 'monster' AND va.entity_id = m.id AND va.kind = 'primary'
        WHERE p.definition_id = ?
        ORDER BY p.ordinal`,
    )
    .all(chambers.id) as MonsterRow[];
  const monsterById = new Map(monsters.map((row) => [row.id, row]));
  const groups = (
    db
      .prepare(
        `SELECT name, guards_monster_id, support_monster_id
           FROM chambers_encounter_groups WHERE definition_id = ? ORDER BY ordinal`,
      )
      .all(chambers.id) as {
      name: string;
      guards_monster_id: string;
      support_monster_id: string | null;
    }[]
  ).map((row) => {
    const guards = monsterById.get(row.guards_monster_id);
    const support = row.support_monster_id
      ? monsterById.get(row.support_monster_id)
      : null;
    if (!guards || (row.support_monster_id && !support))
      error(
        500,
        `Encounter group ${row.name} names a monster outside the pool`,
      );
    return { name: row.name, guards, support: support ?? null };
  });

  const bands = db
    .prepare(
      `SELECT MIN(minimum_quantity) AS minimum, MAX(maximum_quantity) AS maximum
         FROM chambers_reward_bands WHERE definition_id = ?`,
    )
    .get(chambers.id) as { minimum: number; maximum: number };

  const captures = db
    .prepare(
      `SELECT kind, width, height FROM visual_assets
        WHERE domain = 'zone' AND entity_id = ?
          AND kind IN ('shot', 'illustration_2', 'illustration_3')`,
    )
    .all(chambers.zone_id) as { kind: string; width: number; height: number }[];

  return {
    definition: {
      id: chambers.id,
      zoneId: chambers.zone_id,
      roomCount: chambers.room_count,
      runDurationSeconds: chambers.run_duration_seconds,
      minimumLevel: chambers.minimum_level,
      waveCount: chambers.wave_count,
      maximumHuntTargets: chambers.maximum_hunt_targets,
      maximumClearTargets: chambers.maximum_clear_targets,
      puzzlePenaltyGuards: chambers.puzzle_penalty_guards,
      combatExperienceMultiplier: chambers.combat_experience_multiplier,
      finalTrial: chambers.final_trial,
    },
    keeper,
    monsters,
    groups,
    rewardRange: { minimum: bands.minimum, maximum: bands.maximum },
    captures: captures.map((row) => ({
      kind: row.kind,
      src: entityImageUrl("zone", chambers.zone_id, row.kind),
      width: row.width,
      height: row.height,
    })),
  };
}

/** The Chambers zone whose guardian pool holds this monster, or null. */
export function loadMonsterChambers(
  db: Database.Database,
  monsterId: string,
): { zoneId: string; zoneName: string } | null {
  return (
    (db
      .prepare(
        `SELECT z.id AS zoneId, z.name AS zoneName
           FROM chambers_pool_monsters p
           JOIN chambers_definitions d ON d.id = p.definition_id
           JOIN zones z ON z.id = d.zone_id
          WHERE p.monster_id = ?`,
      )
      .get(monsterId) as { zoneId: string; zoneName: string } | undefined) ??
    null
  );
}
