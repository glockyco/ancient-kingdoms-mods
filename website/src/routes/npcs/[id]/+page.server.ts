import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  NpcDetailPageData,
  NpcInfo,
  NpcRoles,
  NpcQuestOffered,
  NpcItemSold,
  NpcDrop,
  NpcSpawnLocation,
  NpcSkill,
} from "$lib/types/npcs";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database("static/compendium.db", { readonly: true });
  const npcs = db.prepare("SELECT id FROM npcs").all() as Array<{ id: string }>;
  db.close();

  return npcs.map((npc) => ({ id: npc.id }));
};

const defaultRoles: NpcRoles = {
  is_merchant: false,
  is_quest_giver: false,
  can_repair_equipment: false,
  is_bank: false,
  is_skill_master: false,
  is_veteran_master: false,
  is_reset_attributes: false,
  is_soul_binder: false,
  is_inkeeper: false,
  is_taskgiver_adventurer: false,
  is_merchant_adventurer: false,
  is_recruiter_mercenaries: false,
  is_guard: false,
  is_faction_vendor: false,
  is_essence_trader: false,
  is_priestess: false,
  is_augmenter: false,
};

export const load: PageServerLoad = ({ params }): NpcDetailPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const npcRaw = db
    .prepare("SELECT * FROM npcs WHERE id = ?")
    .get(params.id) as Record<string, unknown> | undefined;

  if (!npcRaw) {
    db.close();
    throw error(404, `NPC not found: ${params.id}`);
  }

  // Parse JSON fields - all denormalized with names included
  const roles: NpcRoles = npcRaw.roles
    ? JSON.parse(npcRaw.roles as string)
    : defaultRoles;

  // Quests offered - denormalized with quest names/levels
  const questsOffered: NpcQuestOffered[] = npcRaw.quests_offered
    ? JSON.parse(npcRaw.quests_offered as string)
    : [];

  // Quests completed here - denormalized
  const questsCompletedHere: NpcQuestOffered[] = npcRaw.quests_completed_here
    ? JSON.parse(npcRaw.quests_completed_here as string)
    : [];

  // Items sold - denormalized with item names, quality, faction requirements
  const itemsSold: NpcItemSold[] = npcRaw.items_sold
    ? JSON.parse(npcRaw.items_sold as string)
    : [];

  // Drops - denormalized with item names
  const drops: NpcDrop[] = npcRaw.drops
    ? JSON.parse(npcRaw.drops as string)
    : [];

  // Skills - denormalized with skill names
  const skills: NpcSkill[] = npcRaw.skill_ids
    ? JSON.parse(npcRaw.skill_ids as string)
    : [];

  const welcomeMessages: string[] = npcRaw.welcome_messages
    ? JSON.parse(npcRaw.welcome_messages as string)
    : [];

  const shoutMessages: string[] = npcRaw.shout_messages
    ? JSON.parse(npcRaw.shout_messages as string)
    : [];

  const aggroMessages: string[] = npcRaw.aggro_messages
    ? JSON.parse(npcRaw.aggro_messages as string)
    : [];

  // Get spawn locations
  const spawns = db
    .prepare(
      `
    SELECT DISTINCT
      ns.zone_id,
      z.name as zone_name,
      ns.sub_zone_id,
      zt.name as sub_zone_name
    FROM npc_spawns ns
    JOIN zones z ON z.id = ns.zone_id
    LEFT JOIN zone_triggers zt ON zt.id = ns.sub_zone_id
    WHERE ns.npc_id = ?
    ORDER BY z.name
  `,
    )
    .all(params.id) as NpcSpawnLocation[];

  // Get respawn dungeon name if applicable
  let respawnDungeonName: string | null = null;
  if (npcRaw.respawn_dungeon_id && (npcRaw.respawn_dungeon_id as number) > 0) {
    const dungeonData = db
      .prepare("SELECT name FROM zones WHERE zone_id = ?")
      .get(npcRaw.respawn_dungeon_id) as { name: string } | undefined;
    respawnDungeonName = dungeonData?.name || null;
  }

  const npc: NpcInfo = {
    id: npcRaw.id as string,
    name: npcRaw.name as string,
    faction: npcRaw.faction as string | null,
    race: npcRaw.race as string | null,
    roles,
    respawn_time: (npcRaw.respawn_time as number) || 600,
    respawn_probability: (npcRaw.respawn_probability as number) || 1.0,
    respawn_dungeon_id: (npcRaw.respawn_dungeon_id as number) || 0,
    gold_required_respawn_dungeon:
      (npcRaw.gold_required_respawn_dungeon as number) || 0,
    can_hide_after_spawn: Boolean(npcRaw.can_hide_after_spawn),
    gold_min: (npcRaw.gold_min as number) || 0,
    gold_max: (npcRaw.gold_max as number) || 0,
    probability_drop_gold: (npcRaw.probability_drop_gold as number) || 0,
    see_invisibility: Boolean(npcRaw.see_invisibility),
    is_summonable: Boolean(npcRaw.is_summonable),
    flee_on_low_hp: Boolean(npcRaw.flee_on_low_hp),
    welcome_messages: welcomeMessages,
    shout_messages: shoutMessages,
    aggro_messages: aggroMessages,
    aggro_message_probability:
      (npcRaw.aggro_message_probability as number) || 0,
    summon_message: (npcRaw.summon_message as string) || "",
  };

  db.close();

  return {
    npc,
    questsOffered,
    questsCompletedHere,
    itemsSold,
    spawns,
    drops,
    skills,
    respawnDungeonName,
  };
};
