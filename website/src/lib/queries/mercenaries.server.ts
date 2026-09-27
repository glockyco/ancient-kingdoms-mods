import { query } from "$lib/db.server";
import type { MercenaryLink } from "$lib/types/pets";
import { ALL_CLASS_IDS } from "$lib/utils/classes";
import type { Curve } from "$lib/utils/merc-stats";

/**
 * Every mercenary archetype, in the site-wide class order. The mercenary pages
 * link to each other with this list.
 */
export function getMercenaryLinks(): MercenaryLink[] {
  const rows = query<MercenaryLink>(
    `SELECT id, type_monster FROM pets WHERE is_mercenary = 1`,
  );
  const order = (row: MercenaryLink): number => {
    const index = ALL_CLASS_IDS.indexOf(
      row.type_monster.toLowerCase() as (typeof ALL_CLASS_IDS)[number],
    );
    if (index < 0)
      throw new Error(`Mercenary class ${row.type_monster} has no site order`);
    return index;
  };
  return rows.sort((a, b) => order(a) - order(b));
}

export interface Tavern {
  npc_name: string;
  zone_name: string;
  zone_num: number;
  /** Race this recruiter always hires; empty when it states no preference. */
  preferred_race: string;
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

/** Mercenary recruiters with their zone and the race each one hires. */
export function getTaverns(): Tavern[] {
  return query<Tavern>(
    `SELECT DISTINCT n.name AS npc_name, z.name AS zone_name, z.zone_id AS zone_num,
            n.preferred_mercenary_race AS preferred_race
     FROM npcs n
     JOIN npc_spawns s ON s.npc_id = n.id
     JOIN zones z ON z.id = s.zone_id
     WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1
     ORDER BY z.zone_id`,
  );
}
