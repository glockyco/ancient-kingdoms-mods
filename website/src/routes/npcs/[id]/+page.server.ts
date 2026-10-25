import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  NpcDetailPageData,
  NpcInfo,
  NpcRoles,
  NpcQuestOffered,
  NpcItemSold,
  NpcSpawnLocation,
  NpcSkill,
} from "$lib/types/npcs";
import {
  WORLD_BOSS_DUNGEON_ID,
  DB_SOURCE_PATH,
} from "$lib/constants/constants";
import { npcDescription } from "$lib/server/meta-description";
import { npcKillReputation } from "$lib/utils/killReputation";
import { distinctSubzoneName, formatNumber } from "$lib/utils/format";
import { getFactionIdsByName } from "$lib/queries/factions.server";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import { loadAcquisition } from "$lib/server/acquisition";
import type { Season } from "$lib/data/seasonal-events";
import { SEASON_ORDER } from "$lib/data/seasonal-events";
import {
  projectMethodSeasons,
  projectQuestSeasons,
} from "$lib/acquisition/projections";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
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
  is_barber: false,
  is_merchant_adventurer: false,
  is_recruiter_mercenaries: false,
  is_guard: false,
  is_faction_vendor: false,
  is_essence_trader: false,
  is_priestess: false,
  is_augmenter: false,
  is_guild_management: false,
  is_renewal_sage: false,
  is_teleporter: false,
  is_villager: false,
};

export const load: PageServerLoad = async ({
  params,
}): Promise<NpcDetailPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

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

  const questMemberships = db
    .prepare(
      `
    SELECT q.*, m.role, m.ordinal FROM npc_quest_memberships m
    JOIN quests q ON q.id = m.quest_id WHERE m.npc_id = ?
    ORDER BY m.role, m.ordinal
  `,
    )
    .all(params.id) as Array<NpcQuestOffered & { role: string }>;
  const classRequirements = db
    .prepare(
      `
    SELECT r.quest_id, c.name FROM quest_class_requirements r
    JOIN classes c ON c.id = r.class_id
    WHERE EXISTS (SELECT 1 FROM npc_quest_memberships m WHERE m.quest_id = r.quest_id AND m.npc_id = ?)
    ORDER BY r.ordinal
  `,
    )
    .all(params.id) as Array<{ quest_id: string; name: string }>;
  for (const quest of questMemberships) {
    quest.class_requirements = classRequirements
      .filter((row) => row.quest_id === quest.id)
      .map((row) => row.name);
  }
  const questsOffered = questMemberships.filter((row) => row.role === "offer");
  const questsCompletedHere = questMemberships.filter(
    (row) => row.role === "complete",
  );
  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const acquisition = await loadAcquisition(execute, {
    kind: "providers",
    providers: [{ kind: "npcs", id: params.id }],
  });
  for (const quest of questMemberships) {
    quest.seasons = projectQuestSeasons(acquisition, quest.id);
  }
  const vendorMethods = [...acquisition.methodViews.values()].filter(
    (method) =>
      method.kind === "vendor" &&
      method.providers.some(
        (provider) =>
          provider.ref.kind === "npcs" && provider.ref.id === params.id,
      ),
  );
  // A vendor row is the offered item, as the trade window shows it. A pack's page lists the contents a purchase delivers.
  const offers = vendorMethods.flatMap((method) => {
    const itemId = String(method.detail.offered_item_id);
    const item = db
      .prepare(
        `
      SELECT i.name, i.quality, i.tooltip_html, i.faction_required_to_buy,
             i.faction_required_tier_name, va.public_path AS visual_public_path
      FROM items i LEFT JOIN visual_assets va
        ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
      WHERE i.id = ?
    `,
      )
      .get(itemId) as {
      name: string;
      quality: number;
      tooltip_html: string | null;
      faction_required_to_buy: number;
      faction_required_tier_name: string | null;
      visual_public_path: string | null;
    };
    const costs = method.costGroups.flatMap((group) => group.inputs);
    const currency = costs.find((input) => input.resource_kind === "item");
    const gold = costs.find((input) => input.resource_kind === "gold");
    const currencyName = currency?.item_id
      ? (
          db
            .prepare("SELECT name FROM items WHERE id = ?")
            .get(currency.item_id) as { name: string }
        ).name
      : null;
    const seasons = projectMethodSeasons(acquisition, method);
    const offer: NpcItemSold = {
      item_id: itemId,
      item_name: item.name,
      quality: item.quality,
      tooltip_html: item.tooltip_html,
      visual_public_path: item.visual_public_path,
      price: currency?.amount ?? gold?.amount ?? 0,
      currency_item_id: currency?.item_id ?? null,
      currency_item_name: currencyName,
      faction_required: item.faction_required_to_buy,
      faction_tier_name: item.faction_required_tier_name,
    };
    return (seasons.length ? seasons : [null]).map((season) => ({
      ...offer,
      season,
    }));
  });
  // The game's sale list can repeat an identical offer, which the page lists once.
  const itemsSold = [
    ...new Map(
      offers.map((offer) => [
        `${offer.item_id}:${offer.currency_item_id}:${offer.price}:${offer.season}`,
        offer,
      ]),
    ).values(),
  ];
  const seasonalStock = (Object.keys(SEASON_ORDER) as Season[])
    .map((season) => ({
      season,
      items: itemsSold.filter((offer) => offer.season === season),
    }))
    .filter((group) => group.items.length > 0);
  const skills = db
    .prepare(
      `
    SELECT s.id, s.name FROM npc_skills ns JOIN skills s ON s.id = ns.skill_id
    WHERE ns.npc_id = ? GROUP BY s.id ORDER BY MIN(ns.skill_index)
  `,
    )
    .all(params.id) as NpcSkill[];

  const welcomeMessages: string[] = npcRaw.welcome_messages
    ? JSON.parse(npcRaw.welcome_messages as string)
    : [];

  const shoutMessages: string[] = npcRaw.shout_messages
    ? JSON.parse(npcRaw.shout_messages as string)
    : [];

  const aggroMessages: string[] = npcRaw.aggro_messages
    ? JSON.parse(npcRaw.aggro_messages as string)
    : [];

  const improveFaction: string[] = npcRaw.improve_faction
    ? JSON.parse(npcRaw.improve_faction as string)
    : [];

  const decreaseFaction: string[] = npcRaw.decrease_faction
    ? JSON.parse(npcRaw.decrease_faction as string)
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
  for (const spawn of spawns)
    spawn.sub_zone_name =
      distinctSubzoneName(spawn.zone_name, spawn.sub_zone_name) ?? null;

  // Get respawn dungeon info if applicable
  let respawnDungeonName: string | null = null;
  let respawnDungeonZoneId: string | null = null;
  let worldBosses: Array<{
    id: string;
    name: string;
    level: number;
    zone_id: string | null;
    zone_name: string | null;
  }> = [];
  const respawnDungeonId = npcRaw.respawn_dungeon_id as number;
  if (respawnDungeonId === WORLD_BOSS_DUNGEON_ID) {
    respawnDungeonName = "World Bosses";
    respawnDungeonZoneId = null;
    // Get all world bosses
    worldBosses = db
      .prepare(
        `
        SELECT m.id, m.name, m.level, z.id as zone_id, z.name as zone_name
        FROM monsters m
        LEFT JOIN monster_spawns ms ON ms.monster_id = m.id
        LEFT JOIN zones z ON z.id = ms.zone_id
        WHERE m.is_world_boss = 1
        GROUP BY m.id
        ORDER BY m.level, m.name
      `,
      )
      .all() as Array<{
      id: string;
      name: string;
      level: number;
      zone_id: string | null;
      zone_name: string | null;
    }>;
  } else if (respawnDungeonId > 0) {
    const dungeonData = db
      .prepare("SELECT id, name FROM zones WHERE zone_id = ?")
      .get(respawnDungeonId) as { id: string; name: string } | undefined;
    respawnDungeonName = dungeonData?.name || null;
    respawnDungeonZoneId = dungeonData?.id || null;
  }

  // Get teleport routes from spawns
  const teleportRows = db
    .prepare(
      `
      SELECT
        ns.zone_id as from_zone_id,
        fz.name as from_zone_name,
        ns.teleport_zone_id as to_zone_id,
        tz.name as to_zone_name,
        ns.teleport_price as price
      FROM npc_spawns ns
      JOIN zones fz ON fz.id = ns.zone_id
      JOIN zones tz ON tz.id = ns.teleport_zone_id
      WHERE ns.npc_id = ? AND ns.teleport_zone_id IS NOT NULL
      ORDER BY fz.name
    `,
    )
    .all(params.id) as Array<{
    from_zone_id: string;
    from_zone_name: string;
    to_zone_id: string;
    to_zone_name: string;
    price: number;
  }>;
  const teleportRoutes = teleportRows.map((r) => ({
    fromZoneId: r.from_zone_id,
    fromZoneName: r.from_zone_name,
    toZoneId: r.to_zone_id,
    toZoneName: r.to_zone_name,
    price: r.price || 0,
  }));

  const npc: NpcInfo = {
    id: npcRaw.id as string,
    name: npcRaw.name as string,
    faction: npcRaw.faction as string | null,
    race: npcRaw.race as string | null,
    roles,

    // Base stats
    level: (npcRaw.level as number) || 1,
    health: (npcRaw.health as number) || 0,
    mana: (npcRaw.mana as number) || 0,

    // Combat stats
    damage: (npcRaw.damage as number) || 0,
    magic_damage: (npcRaw.magic_damage as number) || 0,
    defense: (npcRaw.defense as number) || 0,
    magic_resist: (npcRaw.magic_resist as number) || 0,
    poison_resist: (npcRaw.poison_resist as number) || 0,
    fire_resist: (npcRaw.fire_resist as number) || 0,
    cold_resist: (npcRaw.cold_resist as number) || 0,
    disease_resist: (npcRaw.disease_resist as number) || 0,
    block_chance: (npcRaw.block_chance as number) || 0,
    critical_chance: (npcRaw.critical_chance as number) || 0,
    accuracy: (npcRaw.accuracy as number) || 0,

    // Stat scaling
    health_base: (npcRaw.health_base as number) || 0,
    health_per_level: (npcRaw.health_per_level as number) || 0,
    mana_base: (npcRaw.mana_base as number) || 0,
    mana_per_level: (npcRaw.mana_per_level as number) || 0,
    damage_base: (npcRaw.damage_base as number) || 0,
    damage_per_level: (npcRaw.damage_per_level as number) || 0,
    magic_damage_base: (npcRaw.magic_damage_base as number) || 0,
    magic_damage_per_level: (npcRaw.magic_damage_per_level as number) || 0,
    defense_base: (npcRaw.defense_base as number) || 0,
    defense_per_level: (npcRaw.defense_per_level as number) || 0,
    magic_resist_base: (npcRaw.magic_resist_base as number) || 0,
    magic_resist_per_level: (npcRaw.magic_resist_per_level as number) || 0,
    poison_resist_base: (npcRaw.poison_resist_base as number) || 0,
    poison_resist_per_level: (npcRaw.poison_resist_per_level as number) || 0,
    fire_resist_base: (npcRaw.fire_resist_base as number) || 0,
    fire_resist_per_level: (npcRaw.fire_resist_per_level as number) || 0,
    cold_resist_base: (npcRaw.cold_resist_base as number) || 0,
    cold_resist_per_level: (npcRaw.cold_resist_per_level as number) || 0,
    disease_resist_base: (npcRaw.disease_resist_base as number) || 0,
    disease_resist_per_level: (npcRaw.disease_resist_per_level as number) || 0,

    // Combat flags
    invincible: Boolean(npcRaw.invincible),
    see_invisibility: Boolean(npcRaw.see_invisibility),
    is_summonable: Boolean(npcRaw.is_summonable),
    flee_on_low_hp: Boolean(npcRaw.flee_on_low_hp),
    season: npcRaw.season as Season | null,
    is_notable: Boolean(npcRaw.is_notable),

    // Respawn and behavior
    respawn_time: (npcRaw.respawn_time as number | null) ?? 600,
    respawn_probability: (npcRaw.respawn_probability as number | null) ?? 1.0,
    respawn_dungeon_id: (npcRaw.respawn_dungeon_id as number) || 0,
    gold_required_respawn_dungeon:
      (npcRaw.gold_required_respawn_dungeon as number) || 0,
    can_hide_after_spawn: Boolean(npcRaw.can_hide_after_spawn),

    // Loot
    gold_min: (npcRaw.gold_min as number) || 0,
    gold_max: (npcRaw.gold_max as number) || 0,
    probability_drop_gold: (npcRaw.probability_drop_gold as number) || 0,

    // Messages
    welcome_messages: welcomeMessages,
    shout_messages: shoutMessages,
    aggro_messages: aggroMessages,
    aggro_message_probability:
      (npcRaw.aggro_message_probability as number) || 0,
    summon_message: (npcRaw.summon_message as string) || "",

    // Faction changes (when killed)
    improve_faction: improveFaction,
    decrease_faction: decreaseFaction,
  };

  const visualAsset =
    (db
      .prepare(
        `SELECT public_path, width, height, source_field, source_type
         FROM visual_assets
         WHERE domain = 'npc' AND entity_id = ? AND kind = 'primary'`,
      )
      .get(params.id) as EntityVisualAsset | undefined) ?? null;
  // Source: server-scripts/SummonMonster.cs:AreAllPlaceholdersDead,Update.
  const summonTriggers = db
    .prepare(
      `
    SELECT st.id AS trigger_id, z.id AS zone_id, z.name AS zone_name,
      m.id AS monster_id, m.name AS monster_name, COUNT(*) AS count
    FROM summon_triggers st
    JOIN npc_spawns target ON target.id = st.summoned_npc_spawn_id
    JOIN zones z ON z.id = st.zone_id
    JOIN summon_trigger_placeholders p ON p.trigger_id = st.id
    JOIN monster_spawns ms ON ms.id = p.spawn_id
    JOIN monsters m ON m.id = ms.monster_id
    WHERE target.npc_id = ?
    GROUP BY st.id, m.id
    ORDER BY z.name, m.name
  `,
    )
    .all(params.id) as NpcDetailPageData["summonTriggers"];

  db.close();

  const zoneNames = [...new Set(spawns.map((spawn) => spawn.zone_name))];
  const description = npcDescription(
    {
      name: npc.name,
      season: npc.season,
      faction: npc.faction,
      roles,
      questCount: questsOffered.length,
      level: npc.level,
      sub_zone_name: spawns.length === 1 ? spawns[0].sub_zone_name : null,
      kill_reputation_summary: npcKillReputation(npc)
        .map(
          (effect) =>
            `Killing this NPC ${effect.direction === "improve" ? "grants" : "costs"} ${formatNumber(effect.amount_min)} reputation with ${effect.factions.join(" and ")}.`,
        )
        .join(" "),
    },
    zoneNames,
  );

  return {
    npc,
    factionIds: getFactionIdsByName(),
    description,
    questsOffered,
    questsCompletedHere,
    itemsSold: itemsSold.filter((offer) => offer.season === null),
    seasonalStock,
    drops: [],
    spawns,
    summonTriggers,
    skills,
    respawnDungeonName,
    respawnDungeonZoneId,
    worldBosses,
    teleportRoutes,
    visualAsset,
  };
};
