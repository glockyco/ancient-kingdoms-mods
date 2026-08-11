import { query, queryOne } from "$lib/db.server";
import type { NpcRoles } from "$lib/types/npcs";
import {
  questReputationGain,
  type ReputationTier,
} from "$lib/utils/reputation";

export interface FactionListView {
  id: string;
  name: string;
  member_count: number;
  monster_source_count: number;
  quest_source_count: number;
  house_count: number;
  gated_item_count: number;
}

export interface FactionMonsterRow {
  id: string;
  name: string;
  visual_public_path: string | null;
  level_min: number;
  level_max: number;
  health: number;
  is_boss: boolean;
  is_elite: boolean;
  is_fabled: boolean;
  improve_faction: string[];
  decrease_faction: string[];
}

export interface FactionNpcKillRow {
  id: string;
  name: string;
  visual_public_path: string | null;
  level: number;
  improve_faction: string[];
  decrease_faction: string[];
}

export interface FactionMemberRow {
  id: string;
  name: string;
  visual_public_path: string | null;
  level: number;
  roles: NpcRoles;
}

export interface FactionChestRow {
  id: string;
  name: string;
  visual_public_path: string | null;
  zone_id: string | null;
  zone_name: string | null;
}

export interface FactionQuestGrantRow {
  id: string;
  name: string;
  level_recommended: number;
  gain: number;
}

export interface FactionVendorRow {
  id: string;
  name: string;
  visual_public_path: string | null;
}

export interface FactionGatedItemRow {
  id: string;
  name: string;
  visual_public_path: string | null;
  tooltip_html: string | null;
  vendor_visual_public_path: string | null;
  faction_required_to_buy: number;
  faction_required_tier_name: string | null;
  vendor_id: string;
  vendor_name: string;
}

export interface FactionHouseRow {
  id: string;
  name: string;
  base_price: number;
  faction_required: number;
  zone_id: string | null;
  zone_name: string | null;
}

export interface FactionQuestRequirementRow {
  id: string;
  name: string;
  required_value: number;
  giver_id: string | null;
  giver_name: string | null;
}

export interface FactionDetail {
  id: string;
  name: string;
  monstersImprove: FactionMonsterRow[];
  monstersDecrease: FactionMonsterRow[];
  npcKillsImprove: FactionNpcKillRow[];
  npcKillsDecrease: FactionNpcKillRow[];
  chests: FactionChestRow[];
  questGrants: FactionQuestGrantRow[];
  members: FactionMemberRow[];
  vendors: FactionVendorRow[];
  gatedItems: FactionGatedItemRow[];
  houses: FactionHouseRow[];
  questRequirements: FactionQuestRequirementRow[];
}

/**
 * Every cross-table faction column stores the faction's display name, not its
 * id — including `houses.faction_id`. Only `factions.id` and the route slug use
 * the id, so each section query below is parameterised by name.
 */
export function getFactionsList(): FactionListView[] {
  return query<FactionListView>(
    `SELECT f.id, f.name,
      (SELECT COUNT(*) FROM npcs n WHERE n.faction = f.name) AS member_count,
      (SELECT COUNT(*) FROM monsters m
         JOIN json_each(m.improve_faction) je ON je.value = f.name
       WHERE m.is_dummy = 0) AS monster_source_count,
      (SELECT COUNT(*) FROM quests q
         JOIN npcs n ON n.id = q.start_npc_id
       WHERE n.faction = f.name AND q.is_adventurer_quest = 0) AS quest_source_count,
      (SELECT COUNT(*) FROM houses h WHERE h.faction_id = f.name) AS house_count,
      (SELECT COUNT(DISTINCT i.id) FROM items i
         JOIN item_sources_vendor v ON v.item_id = i.id
         JOIN npcs n ON n.id = v.npc_id
       WHERE n.faction = f.name AND i.faction_required_to_buy > 0) AS gated_item_count
    FROM factions f
    ORDER BY f.name`,
  );
}

export interface FactionNavItem {
  id: string;
  name: string;
}

/** Every faction, for the sibling navigation on a detail page. */
export function getFactionNav(): FactionNavItem[] {
  return query<FactionNavItem>("SELECT id, name FROM factions ORDER BY name");
}

/**
 * Display name to route id, for pages that only hold a faction's name and want
 * to link to `/factions/[id]`. Names not in the table are simply absent.
 */
export function getFactionIdsByName(): Record<string, string> {
  const rows = query<FactionNavItem>("SELECT id, name FROM factions");
  return Object.fromEntries(rows.map((row) => [row.name, row.id]));
}

interface ReputationTierRow extends Omit<ReputationTier, "is_hostile"> {
  is_hostile: number;
}

export function getReputationTiers(): ReputationTier[] {
  return query<ReputationTierRow>(
    `SELECT id, name, min_value, max_value, is_hostile
     FROM reputation_tiers
     ORDER BY id`,
  ).map((tier) => ({ ...tier, is_hostile: Boolean(tier.is_hostile) }));
}

interface RawMonsterRow extends Omit<
  FactionMonsterRow,
  "improve_faction" | "decrease_faction"
> {
  improve_faction: string;
  decrease_faction: string;
}

function getMonsters(
  factionName: string,
  direction: "improve" | "decrease",
): FactionMonsterRow[] {
  const column =
    direction === "improve" ? "m.improve_faction" : "m.decrease_faction";
  return query<RawMonsterRow>(
    `SELECT m.id, m.name, va.public_path AS visual_public_path,
            m.level_min, m.level_max, m.health,
            m.is_boss, m.is_elite, m.is_fabled,
            m.improve_faction, m.decrease_faction
     FROM monsters m
     LEFT JOIN visual_assets va
       ON va.domain = 'monster' AND va.entity_id = m.id AND va.kind = 'primary'
     JOIN json_each(${column}) je ON je.value = ?
     WHERE m.is_dummy = 0
     ORDER BY m.level_max DESC, m.name`,
    [factionName],
  ).map((row) => ({
    ...row,
    is_boss: Boolean(row.is_boss),
    is_elite: Boolean(row.is_elite),
    is_fabled: Boolean(row.is_fabled),
    improve_faction: JSON.parse(row.improve_faction) as string[],
    decrease_faction: JSON.parse(row.decrease_faction) as string[],
  }));
}

interface RawNpcKillRow extends Omit<
  FactionNpcKillRow,
  "improve_faction" | "decrease_faction"
> {
  improve_faction: string;
  decrease_faction: string;
}

function getNpcKills(
  factionName: string,
  direction: "improve" | "decrease",
): FactionNpcKillRow[] {
  const column =
    direction === "improve" ? "n.improve_faction" : "n.decrease_faction";
  return query<RawNpcKillRow>(
    `SELECT n.id, n.name, va.public_path AS visual_public_path,
            n.level, n.improve_faction, n.decrease_faction
     FROM npcs n
     LEFT JOIN visual_assets va
       ON va.domain = 'npc' AND va.entity_id = n.id AND va.kind = 'primary'
     JOIN json_each(${column}) je ON je.value = ?
     ORDER BY n.level DESC, n.name`,
    [factionName],
  ).map((row) => ({
    ...row,
    improve_faction: JSON.parse(row.improve_faction) as string[],
    decrease_faction: JSON.parse(row.decrease_faction) as string[],
  }));
}

interface RawMemberRow extends Omit<FactionMemberRow, "roles"> {
  roles: string;
}

export function getFactionDetail(id: string): FactionDetail | null {
  const faction = queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM factions WHERE id = ?",
    [id],
  );
  if (!faction) return null;

  const name = faction.name;

  const members = query<RawMemberRow>(
    `SELECT n.id, n.name, va.public_path AS visual_public_path,
            n.level, n.roles
     FROM npcs n
     LEFT JOIN visual_assets va
       ON va.domain = 'npc' AND va.entity_id = n.id AND va.kind = 'primary'
     WHERE n.faction = ?
     ORDER BY n.name`,
    [name],
  ).map((row) => ({ ...row, roles: JSON.parse(row.roles) as NpcRoles }));

  const vendors = query<FactionVendorRow>(
    `SELECT n.id, n.name, va.public_path AS visual_public_path
     FROM npcs n
     LEFT JOIN visual_assets va
       ON va.domain = 'npc' AND va.entity_id = n.id AND va.kind = 'primary'
     WHERE n.faction = ? AND json_extract(n.roles, '$.is_faction_vendor') = 1
     ORDER BY n.name`,
    [name],
  );

  const chests = query<FactionChestRow>(
    `SELECT c.id, c.name, va.public_path AS visual_public_path,
            c.zone_id, z.name AS zone_name
     FROM chests c
     LEFT JOIN visual_assets va
       ON va.domain = 'chest' AND va.entity_id = c.id AND va.kind = 'primary'
     LEFT JOIN zones z ON z.id = c.zone_id
     WHERE c.decrease_faction = ?
     ORDER BY z.name, c.name`,
    [name],
  );

  const questGrants = query<Omit<FactionQuestGrantRow, "gain">>(
    `SELECT q.id, q.name, q.level_recommended
     FROM quests q
     JOIN npcs n ON n.id = q.start_npc_id
     WHERE n.faction = ? AND q.is_adventurer_quest = 0
     ORDER BY q.level_recommended, q.name`,
    [name],
  ).map((quest) => ({
    ...quest,
    gain: questReputationGain(quest.level_recommended),
  }));

  const gatedItems = query<FactionGatedItemRow>(
    `SELECT DISTINCT i.id, i.name, iva.public_path AS visual_public_path,
            i.tooltip_html, i.faction_required_to_buy,
            i.faction_required_tier_name, n.id AS vendor_id,
            n.name AS vendor_name, nva.public_path AS vendor_visual_public_path
     FROM items i
     LEFT JOIN visual_assets iva
       ON iva.domain = 'item' AND iva.entity_id = i.id AND iva.kind = 'icon'
     JOIN item_sources_vendor v ON v.item_id = i.id
     JOIN npcs n ON n.id = v.npc_id
     LEFT JOIN visual_assets nva
       ON nva.domain = 'npc' AND nva.entity_id = n.id AND nva.kind = 'primary'
     WHERE n.faction = ? AND i.faction_required_to_buy > 0
     ORDER BY i.faction_required_to_buy DESC, i.name`,
    [name],
  );

  const houses = query<FactionHouseRow>(
    `SELECT h.id, h.name, h.base_price, h.faction_required, h.zone_id,
            COALESCE(h.zone_name, z.name) AS zone_name
     FROM houses h
     LEFT JOIN zones z ON z.id = h.zone_id
     WHERE h.faction_id = ?
     ORDER BY h.base_price`,
    [name],
  );

  const questRequirements = query<FactionQuestRequirementRow>(
    `SELECT q.id, q.name,
            json_extract(je.value, '$.faction_value') AS required_value,
            n.id AS giver_id, n.name AS giver_name
     FROM quests q
     JOIN json_each(q.faction_requirements) je
     LEFT JOIN npcs n ON n.id = q.start_npc_id
     WHERE json_extract(je.value, '$.faction') = ?
     ORDER BY required_value DESC, q.name`,
    [name],
  );

  return {
    id: faction.id,
    name,
    monstersImprove: getMonsters(name, "improve"),
    monstersDecrease: getMonsters(name, "decrease"),
    npcKillsImprove: getNpcKills(name, "improve"),
    npcKillsDecrease: getNpcKills(name, "decrease"),
    chests,
    questGrants,
    members,
    vendors,
    gatedItems,
    houses,
    questRequirements,
  };
}
