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

export interface RegionalEventRegion {
  zone_id: string;
  zone_name: string;
  /** The game's numeric zone, which the code rules for herb and ore requests name. */
  zone_number: number;
  fishing: number;
  cooking_city: string | null;
  cooking_city_name: string | null;
  cooking_animal: string | null;
}

export interface RegionalEventItem {
  region_zone_id: string;
  item_id: string;
  item_name: string;
}

export interface RegionalHuntTarget {
  region_zone_id: string;
  region_name: string;
  monster_id: string;
  monster_name: string;
  max_players: number;
}

export interface RegionalEventDungeon {
  dungeon_zone_id: string;
  dungeon_name: string;
  region_zone_id: string;
  region_name: string;
}

const REGION_SELECT = `
  SELECT r.zone_id, z.name AS zone_name, z.zone_id AS zone_number, r.fishing,
         r.cooking_city, ri.city_name AS cooking_city_name, r.cooking_animal
  FROM regional_event_regions r
  JOIN zones z ON z.id = r.zone_id
  LEFT JOIN regional_invasions ri ON ri.city = r.cooking_city`;

export function getRegionalEventRegions(): RegionalEventRegion[] {
  return query<RegionalEventRegion>(`${REGION_SELECT} ORDER BY z.zone_id`);
}

export function getRegionalEventRegion(
  zoneId: string,
): RegionalEventRegion | null {
  return queryOne<RegionalEventRegion>(`${REGION_SELECT} WHERE r.zone_id = ?`, [
    zoneId,
  ]);
}

export function getRegionalCookingDishes(): RegionalEventItem[] {
  return query<RegionalEventItem>(`
    SELECT d.region_zone_id, d.item_id, i.name AS item_name
    FROM regional_event_cooking_dishes d JOIN items i ON i.id = d.item_id
    ORDER BY d.region_zone_id, i.name
  `);
}

export function getRegionalHuntTargets(): RegionalHuntTarget[] {
  return query<RegionalHuntTarget>(`
    SELECT h.region_zone_id, z.name AS region_name, h.monster_id,
           m.name AS monster_name, h.max_players
    FROM regional_event_hunt_targets h
    JOIN zones z ON z.id = h.region_zone_id
    JOIN monsters m ON m.id = h.monster_id
    ORDER BY z.zone_id, m.name
  `);
}

export function getRegionalEventDungeons(): RegionalEventDungeon[] {
  return query<RegionalEventDungeon>(`
    SELECT d.dungeon_zone_id, dz.name AS dungeon_name,
           d.region_zone_id, rz.name AS region_name
    FROM regional_event_dungeons d
    JOIN zones dz ON dz.id = d.dungeon_zone_id
    JOIN zones rz ON rz.id = d.region_zone_id
    ORDER BY rz.zone_id, dz.name
  `);
}

export interface ItemRegionalCooking {
  region_zone_id: string;
  region_name: string;
  /** The RegionalInvasionCity member, which anchors the city's invasion row. */
  city: string;
  city_name: string;
  role: "dish" | "meat";
}

/** The cooking requests an item counts for as a dish, or feeds as an ingredient. */
export function getItemRegionalCooking(itemId: string): ItemRegionalCooking[] {
  return query<ItemRegionalCooking>(
    `SELECT r.zone_id AS region_zone_id, z.name AS region_name,
            ri.city, ri.city_name, x.role
     FROM (
       SELECT region_zone_id, 'dish' AS role FROM regional_event_cooking_dishes WHERE item_id = ?
       UNION ALL
       SELECT region_zone_id, 'meat' AS role FROM regional_event_cooking_meats WHERE item_id = ?
     ) x
     JOIN regional_event_regions r ON r.zone_id = x.region_zone_id
     JOIN zones z ON z.id = r.zone_id
     JOIN regional_invasions ri ON ri.city = r.cooking_city
     ORDER BY z.zone_id`,
    [itemId, itemId],
  );
}
