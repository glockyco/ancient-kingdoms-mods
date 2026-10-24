import { query, queryOne } from "$lib/db.server";

export interface RegionalEventSettings {
  enabled: number;
  activity_duration_minutes: number;
  prosperity_duration_minutes: number;
}

export interface RegionalInvasion {
  id: string;
  city: string;
  city_name: string;
  zone_id: string;
  zone_name: string;
  health_multiplier: number;
  minimum_level: number;
  maximum_level: number;
}

export interface RegionalInvasionAttacker {
  invasion_id: string;
  ordinal: number;
  monster_id: string;
  monster_name: string;
}

export function getRegionalEventSettings(): RegionalEventSettings {
  const settings = queryOne<RegionalEventSettings>(
    "SELECT enabled, activity_duration_minutes, prosperity_duration_minutes FROM regional_event_settings WHERE id = 1",
  );
  if (!settings) throw new Error("Regional event settings are missing");
  return settings;
}

export function getRegionalInvasions(): RegionalInvasion[] {
  return query<RegionalInvasion>(`
    SELECT ri.*, z.name AS zone_name
    FROM regional_invasions ri JOIN zones z ON z.id = ri.zone_id
    ORDER BY z.zone_id, ri.city_name
  `);
}

export function getRegionalInvasionAttackers(): RegionalInvasionAttacker[] {
  return query<RegionalInvasionAttacker>(`
    SELECT ria.*, m.name AS monster_name
    FROM regional_invasion_attackers ria JOIN monsters m ON m.id = ria.monster_id
    ORDER BY ria.invasion_id, ria.ordinal
  `);
}

export function getMonsterRegionalInvasions(
  monsterId: string,
): RegionalInvasion[] {
  return query<RegionalInvasion>(
    `SELECT ri.*, z.name AS zone_name
     FROM regional_invasions ri JOIN zones z ON z.id = ri.zone_id
     WHERE EXISTS (
       SELECT 1 FROM regional_invasion_attackers ria
       WHERE ria.invasion_id = ri.id AND ria.monster_id = ?
     )
     ORDER BY z.zone_id, ri.city_name`,
    [monsterId],
  );
}
