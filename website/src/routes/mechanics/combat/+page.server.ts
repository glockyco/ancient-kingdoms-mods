import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

export interface WeaponItem {
  id: string;
  name: string;
  weapon_category: string;
  weapon_delay: number;
  damage: number;
  strength: number;
  dexterity: number;
  haste: number;
  class_required: string[];
  item_level: number;
  quality: number;
}

export interface CombatPageData {
  weapons: WeaponItem[];
}

export const load: PageServerLoad = (): CombatPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const rows = db
    .prepare(
      `
      SELECT
        id,
        name,
        weapon_category,
        weapon_delay,
        item_level,
        quality,
        class_required,
        CAST(COALESCE(json_extract(stats, '$.damage'), 0) AS INTEGER)    AS damage,
        CAST(COALESCE(json_extract(stats, '$.strength'), 0) AS INTEGER)  AS strength,
        CAST(COALESCE(json_extract(stats, '$.dexterity'), 0) AS INTEGER) AS dexterity,
        CAST(COALESCE(json_extract(stats, '$.haste'), 0) AS REAL)        AS haste
      FROM items
      WHERE weapon_category IN ('Bow','WeaponDagger','WeaponSword','WeaponSword2H','WeaponWand')
        AND weapon_delay > 0
      ORDER BY item_level DESC
    `,
    )
    .all() as Array<{
    id: string;
    name: string;
    weapon_category: string;
    weapon_delay: number;
    item_level: number;
    quality: number;
    class_required: string;
    damage: number;
    strength: number;
    dexterity: number;
    haste: number;
  }>;

  db.close();

  const weapons: WeaponItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    weapon_category: r.weapon_category,
    weapon_delay: r.weapon_delay,
    damage: r.damage,
    strength: r.strength,
    dexterity: r.dexterity,
    haste: r.haste,
    class_required: r.class_required
      ? (JSON.parse(r.class_required) as string[])
      : [],
    item_level: r.item_level,
    quality: r.quality,
  }));

  return { weapons };
};
