import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { WeaponItem } from "$lib/utils/combat-sim";

// Re-export so +page.svelte can import WeaponItem from "./+page.server" as planned.
export type { WeaponItem } from "$lib/utils/combat-sim";

export const prerender = true;

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
        tooltip_html,
        CAST(COALESCE(json_extract(stats, '$.damage'), 0) AS INTEGER)       AS damage,
        CAST(COALESCE(json_extract(stats, '$.magic_damage'), 0) AS INTEGER) AS magic_damage,
        CAST(COALESCE(json_extract(stats, '$.strength'), 0) AS INTEGER)     AS strength,
        CAST(COALESCE(json_extract(stats, '$.dexterity'), 0) AS INTEGER)    AS dexterity,
        CAST(COALESCE(json_extract(stats, '$.haste'), 0) AS REAL)           AS haste,
        CAST(COALESCE(json_extract(stats, '$.spell_haste'), 0) AS REAL)     AS spell_haste
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
    tooltip_html: string | null;
    damage: number;
    magic_damage: number;
    strength: number;
    dexterity: number;
    haste: number;
    spell_haste: number;
  }>;

  db.close();

  const weapons: WeaponItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    weapon_category: r.weapon_category,
    weapon_delay: r.weapon_delay,
    damage: r.damage,
    magic_damage: r.magic_damage,
    strength: r.strength,
    dexterity: r.dexterity,
    haste: r.haste,
    spell_haste: r.spell_haste,
    class_required: r.class_required
      ? (JSON.parse(r.class_required) as string[])
      : [],
    item_level: r.item_level,
    quality: r.quality,
    tooltip_html: r.tooltip_html ?? "",
  }));

  return { weapons };
};
