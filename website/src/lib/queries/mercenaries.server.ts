import { query } from "$lib/db.server";
import type { Curve } from "$lib/utils/merc-stats";

export interface Tavern {
  npc_name: string;
  zone_name: string;
  zone_num: number;
}

/** Base HP/Mana LinearInt curves for each mercenary class, keyed by type_monster. */
export function getMercenaryCurves(): Record<string, Curve> {
  const rows = query<{
    type_monster: string;
    health_base: number;
    health_per_level: number;
    mana_base: number;
    mana_per_level: number;
  }>(
    `SELECT type_monster, health_base, health_per_level, mana_base, mana_per_level
     FROM pets WHERE is_mercenary = 1`,
  );
  const out: Record<string, Curve> = {};
  for (const r of rows) {
    out[r.type_monster] = {
      hp_base: r.health_base,
      hp_per: r.health_per_level,
      mana_base: r.mana_base,
      mana_per: r.mana_per_level,
    };
  }
  return out;
}

/** Mercenary recruiters with their zone, including numeric zone id for race bias. */
export function getTaverns(): Tavern[] {
  return query<Tavern>(
    `SELECT DISTINCT n.name AS npc_name, z.name AS zone_name, z.zone_id AS zone_num
     FROM npcs n
     JOIN npc_spawns s ON s.npc_id = n.id
     JOIN zones z ON z.id = s.zone_id
     WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1
     ORDER BY z.zone_id`,
  );
}
