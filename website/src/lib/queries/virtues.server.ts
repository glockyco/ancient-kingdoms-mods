import { query, queryOne } from "$lib/db.server";
import { escortStats, type VirtueId } from "$lib/calculation/virtues";

export interface VirtueRank {
  rank: number;
  points: number;
  /** NULL at rank 0, which shows the shared rank 0 label. */
  title: string | null;
  effect: string;
  humility_multiplier: number;
}

export interface VirtueView {
  id: VirtueId;
  name: string;
  summary: string;
  blessing_skill_id: string;
  ranks: VirtueRank[];
}

export interface VirtueRules {
  rank_zero_label: string;
  escort_points: number;
  return_points: number;
}

/** Every virtue in the game's order, with its ranks. */
export function loadVirtues(): VirtueView[] {
  const ranks = query<VirtueRank & { virtue_id: VirtueId }>(
    `SELECT r.virtue_id, r.rank, rr.points, r.title, r.effect, rr.humility_multiplier
     FROM virtue_ranks r JOIN virtue_rank_rules rr ON rr.rank = r.rank
     ORDER BY r.virtue_id, r.rank`,
  );
  return query<Omit<VirtueView, "ranks">>(
    "SELECT id, name, summary, blessing_skill_id FROM virtues ORDER BY sort_order",
  ).map((virtue) => ({
    ...virtue,
    ranks: ranks.filter((rank) => rank.virtue_id === virtue.id),
  }));
}

export function loadVirtueRules(): VirtueRules {
  const rules = queryOne<VirtueRules>(
    "SELECT rank_zero_label, escort_points, return_points FROM virtue_rules",
  );
  if (!rules) throw new Error("Missing virtue_rules");
  return rules;
}

/** The Humility multiplier of each rank, which the blessing summaries read. */
export function loadHumilityMultipliers(): number[] {
  return query<{ humility_multiplier: number }>(
    "SELECT humility_multiplier FROM virtue_rank_rules ORDER BY rank",
  ).map((row) => row.humility_multiplier);
}

export interface ShrineView {
  id: string;
  virtue_id: VirtueId;
  name: string;
  zone_id: string;
  zone_name: string;
  /** Null where the zone's positions are suppressed. */
  x: number | null;
  y: number | null;
  map_path: string | null;
}

export function loadShrines(): ShrineView[] {
  return query<ShrineView>(
    `SELECT s.id, s.virtue_id, s.name, s.zone_id, z.name AS zone_name,
       s.position_x AS x, s.position_y AS y, va.public_path AS map_path
     FROM virtue_shrines s
     JOIN zones z ON z.id = s.zone_id
     LEFT JOIN visual_assets va
       ON va.domain = 'virtue_shrine' AND va.entity_id = s.id AND va.kind = 'map'
     ORDER BY z.name`,
  );
}

export interface ValorQuarry {
  id: string;
  name: string;
  is_boss: number;
  level: number;
  zone_id: string;
  zone_name: string;
  portrait_path: string | null;
}

// Source: server-scripts/Player.cs:AssignValorTarget — a living elite or boss in a dungeon zone.
// Source: server-scripts/VirtueRules.cs:IsEligibleMonster — no dummies or Forgotten Altar event monsters.
/** Each dungeon elite and boss once per level and dungeon it spawns at. */
export function loadValorQuarries(): ValorQuarry[] {
  return query<ValorQuarry>(
    `SELECT DISTINCT m.id, m.name, m.is_boss, s.level, z.id AS zone_id,
       z.name AS zone_name, va.public_path AS portrait_path
     FROM monster_spawns s
     JOIN monsters m ON m.id = s.monster_id
     JOIN zones z ON z.id = s.zone_id
     LEFT JOIN visual_assets va
       ON va.domain = 'monster' AND va.entity_id = m.id AND va.kind = 'portrait'
     WHERE z.is_dungeon = 1 AND (m.is_boss = 1 OR m.is_elite = 1)
       AND m.is_dummy = 0 AND m.is_forgotten_altar_event = 0 AND m.season IS NULL
     ORDER BY s.level, m.name, z.name`,
  );
}

export interface DungeonEscort {
  zone_id: string;
  zone_name: string;
  level: number;
  health: number;
}

// Source: server-scripts/VirtueEscortStats.cs:TryForDungeon — the dungeon's monsters that are not bosses, elites, fabled, dummies, passive or summoned.
/** The stranded adventurer of each dungeon, or of one dungeon. */
export function loadDungeonEscorts(zoneId?: string): DungeonEscort[] {
  const spawns = query<{
    zone_id: string;
    zone_name: string;
    level: number;
    health_base: number;
    health_per_level: number;
    health_multiplier: number;
  }>(
    `SELECT z.id AS zone_id, z.name AS zone_name, s.level,
       m.health_base, m.health_per_level, m.health_multiplier
     FROM monster_spawns s
     JOIN monsters m ON m.id = s.monster_id
     JOIN zones z ON z.id = s.zone_id
     WHERE z.is_dungeon = 1 AND (? IS NULL OR z.id = ?)
       AND m.is_boss = 0 AND m.is_elite = 0 AND m.is_fabled = 0
       AND m.is_dummy = 0 AND m.no_aggro_monster = 0 AND m.is_summonable = 0`,
    [zoneId ?? null, zoneId ?? null],
  );
  const byZone = new Map<string, typeof spawns>();
  for (const spawn of spawns) {
    byZone.set(spawn.zone_id, [...(byZone.get(spawn.zone_id) ?? []), spawn]);
  }
  return [...byZone.values()]
    .flatMap((zoneSpawns) => {
      const stats = escortStats(zoneSpawns);
      return stats
        ? [
            {
              zone_id: zoneSpawns[0].zone_id,
              zone_name: zoneSpawns[0].zone_name,
              ...stats,
            },
          ]
        : [];
    })
    .sort(
      (a, b) => a.level - b.level || a.zone_name.localeCompare(b.zone_name),
    );
}
