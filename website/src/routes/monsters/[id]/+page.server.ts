import {
  formatAltarRequirement,
  type AltarThresholds,
} from "$lib/calculation/altar";
import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import type { PageServerLoad, EntryGenerator } from "./$types";
import {
  DB_SOURCE_PATH,
  WORLD_BOSS_DUNGEON_ID,
} from "$lib/constants/constants";
import type {
  MonsterDetailData,
  MonsterInfo,
  MonsterDrop,
  MonsterSkill,
  MonsterSpawnZone,
  MonsterSpawnData,
  SummonSpawnInfo,
  AltarSpawnInfo,
  PlaceholderSpawnInfo,
  MonsterQuest,
  SummonsInfo,
  MonsterSpawnCombatStats,
} from "$lib/types/monsters";
import { monsterDescription } from "$lib/server/meta-description";
import { formatPercent } from "$lib/utils/format";
import { getFactionIdsByName } from "$lib/queries/factions.server";
import { MONSTER_ABILITIES_QUERY } from "$lib/skills/monsterAbilitiesQuery";
import { skillEffectInputs } from "$lib/skills/skillEffects.server";
import { statAtLevel } from "$lib/utils/monster-stats";
import {
  calculateBossLootChance,
  type BossLootDrop,
} from "$lib/calculation/boss-loot";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const monsters = db.prepare("SELECT id FROM monsters").all() as Array<{
    id: string;
  }>;
  db.close();

  return monsters.map((monster) => ({ id: monster.id }));
};

export const load: PageServerLoad = ({ params }): MonsterDetailData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  // Get monster basic data with placeholder name
  const monsterRaw = db
    .prepare(
      `
    SELECT
      m.*,
      pm.name as placeholder_monster_name
    FROM monsters m
    LEFT JOIN monsters pm ON pm.id = m.placeholder_monster_id
    WHERE m.id = ?
  `,
    )
    .get(params.id) as
    | (Record<string, unknown> & { placeholder_monster_name: string | null })
    | undefined;

  if (!monsterRaw) {
    db.close();
    throw error(404, `Monster not found: ${params.id}`);
  }

  // Source: server-scripts/Monster.cs:Start,EventEntityTooFarToFollow — a regular monster placed in a dungeon never checks its chase limit; bosses and elites always do.
  const placements = db
    .prepare(
      `SELECT COALESCE(SUM(z.is_dungeon = 1), 0) AS dungeon,
         COALESCE(SUM(z.is_dungeon = 0), 0) AS open
       FROM monster_spawns ms JOIN zones z ON z.id = ms.zone_id
       WHERE ms.monster_id = ?`,
    )
    .get(params.id) as { dungeon: number; open: number };
  const chaseLimitScope: MonsterInfo["chase_limit_scope"] =
    monsterRaw.is_boss || monsterRaw.is_elite || placements.dungeon === 0
      ? "everywhere"
      : placements.open === 0
        ? "nowhere"
        : "outside_dungeons";

  // Parse JSON fields
  const drops: MonsterDrop[] = monsterRaw.drops
    ? JSON.parse(monsterRaw.drops as string)
    : [];
  const progression = db
    .prepare("SELECT max_level FROM progression_rules WHERE id = 1")
    .get() as { max_level: number } | undefined;
  if (!progression) throw new Error("Missing progression_rules.max_level");
  for (const drop of drops) {
    if (drop.altar_id) {
      if (!drop.altar_reward_tier)
        throw new Error(
          `Missing monsters.drops.altar_reward_tier for ${params.id}`,
        );
      const altar = db
        .prepare(
          "SELECT magic_reward_threshold, epic_reward_threshold, legendary_reward_threshold FROM altars WHERE id = ?",
        )
        .get(drop.altar_id) as AltarThresholds | undefined;
      if (!altar)
        throw new Error(`Missing monsters.drops.altar_id: ${drop.altar_id}`);
      drop.note = formatAltarRequirement(
        drop.altar_reward_tier,
        altar,
        progression.max_level,
      );
    }
  }
  const aggroMessages: string[] = monsterRaw.aggro_messages
    ? JSON.parse(monsterRaw.aggro_messages as string)
    : [];
  const improveFaction: string[] = monsterRaw.improve_faction
    ? JSON.parse(monsterRaw.improve_faction as string)
    : [];
  const decreaseFaction: string[] = monsterRaw.decrease_faction
    ? JSON.parse(monsterRaw.decrease_faction as string)
    : [];

  // Resolve drop item names, bestiary flag, and tooltip from items table
  if (drops.length > 0) {
    const itemIds = drops.map((d) => d.item_id);
    const placeholders = itemIds.map(() => "?").join(",");
    const itemInfo = db
      .prepare(
        `SELECT
          i.id,
          i.name,
          i.is_bestiary_drop,
          i.tooltip_html,
          va.public_path AS visual_public_path
        FROM items i
        LEFT JOIN visual_assets va
          ON va.domain = 'item'
         AND va.entity_id = i.id
         AND va.kind = 'icon'
        WHERE i.id IN (${placeholders})`,
      )
      .all(...itemIds) as Array<{
      id: string;
      name: string;
      is_bestiary_drop: boolean;
      tooltip_html: string | null;
      visual_public_path: string | null;
    }>;
    const infoMap = new Map(itemInfo.map((i) => [i.id, i]));

    for (const drop of drops) {
      const info = infoMap.get(drop.item_id);
      drop.item_name = info?.name || drop.item_id;
      drop.is_bestiary = info?.is_bestiary_drop ?? false;
      drop.tooltip_html = info?.tooltip_html ?? null;
      drop.visual_public_path = info?.visual_public_path ?? null;
    }
  }

  const monster: MonsterInfo = {
    id: monsterRaw.id as string,
    name: monsterRaw.name as string,
    level: monsterRaw.level as number,
    level_min: (monsterRaw.level_min as number) || (monsterRaw.level as number),
    level_max: (monsterRaw.level_max as number) || (monsterRaw.level as number),
    health: monsterRaw.health as number,
    type_name: monsterRaw.type_name as string | null,
    class_name: monsterRaw.class_name as string | null,
    zone_bestiary: (monsterRaw.zone_bestiary as string | null) || null,
    is_boss: Boolean(monsterRaw.is_boss),
    is_world_boss: Boolean(monsterRaw.is_world_boss),
    is_fabled: Boolean(monsterRaw.is_fabled),
    is_elite: Boolean(monsterRaw.is_elite),
    is_hunt: Boolean(monsterRaw.is_hunt),
    is_summonable: Boolean(monsterRaw.is_summonable),
    damage: (monsterRaw.damage as number) || 0,
    magic_damage: (monsterRaw.magic_damage as number) || 0,
    defense: (monsterRaw.defense as number) || 0,
    magic_resist: (monsterRaw.magic_resist as number) || 0,
    poison_resist: (monsterRaw.poison_resist as number) || 0,
    fire_resist: (monsterRaw.fire_resist as number) || 0,
    cold_resist: (monsterRaw.cold_resist as number) || 0,
    disease_resist: (monsterRaw.disease_resist as number) || 0,
    block_chance: (monsterRaw.block_chance as number) || 0,
    critical_chance: (monsterRaw.critical_chance as number) || 0,
    accuracy: (monsterRaw.accuracy as number) || 0,
    // Stat scaling fields
    health_base: (monsterRaw.health_base as number) || 0,
    health_per_level: (monsterRaw.health_per_level as number) || 0,
    health_multiplier: (monsterRaw.health_multiplier as number) || 1,
    health_regen_base: (monsterRaw.health_regen_base as number) || 0,
    damage_base: (monsterRaw.damage_base as number) || 0,
    damage_per_level: (monsterRaw.damage_per_level as number) || 0,
    magic_damage_base: (monsterRaw.magic_damage_base as number) || 0,
    magic_damage_per_level: (monsterRaw.magic_damage_per_level as number) || 0,
    defense_base: (monsterRaw.defense_base as number) || 0,
    defense_per_level: (monsterRaw.defense_per_level as number) || 0,
    magic_resist_base: (monsterRaw.magic_resist_base as number) || 0,
    magic_resist_per_level: (monsterRaw.magic_resist_per_level as number) || 0,
    poison_resist_base: (monsterRaw.poison_resist_base as number) || 0,
    poison_resist_per_level:
      (monsterRaw.poison_resist_per_level as number) || 0,
    fire_resist_base: (monsterRaw.fire_resist_base as number) || 0,
    fire_resist_per_level: (monsterRaw.fire_resist_per_level as number) || 0,
    cold_resist_base: (monsterRaw.cold_resist_base as number) || 0,
    cold_resist_per_level: (monsterRaw.cold_resist_per_level as number) || 0,
    disease_resist_base: (monsterRaw.disease_resist_base as number) || 0,
    disease_resist_per_level:
      (monsterRaw.disease_resist_per_level as number) || 0,
    block_chance_base: (monsterRaw.block_chance_base as number) || 0,
    block_chance_per_level: (monsterRaw.block_chance_per_level as number) || 0,
    critical_chance_base: (monsterRaw.critical_chance_base as number) || 0,
    critical_chance_per_level:
      (monsterRaw.critical_chance_per_level as number) || 0,
    accuracy_base: (monsterRaw.accuracy_base as number) || 0,
    accuracy_per_level: (monsterRaw.accuracy_per_level as number) || 0,
    // Mana scaling
    mana: (monsterRaw.mana as number) || 0,
    mana_base: (monsterRaw.mana_base as number) || 0,
    mana_per_level: (monsterRaw.mana_per_level as number) || 0,
    // Movement and detection
    speed: (monsterRaw.speed as number) || 0,
    aggro_range: (monsterRaw.aggro_range as number) || 0,
    follow_distance: (monsterRaw.follow_distance as number) || 0,
    chase_limit_scope: chaseLimitScope,
    gold_min: monsterRaw.gold_min as number | null,
    gold_max: monsterRaw.gold_max as number | null,
    probability_drop_gold: (monsterRaw.probability_drop_gold as number) || 0,
    exp_multiplier: (monsterRaw.exp_multiplier as number) || 1,
    base_exp: (monsterRaw.base_exp as number) || 0,
    does_respawn: Boolean(monsterRaw.does_respawn),
    death_time: (monsterRaw.death_time as number) || 0,
    respawn_time: (monsterRaw.respawn_time as number) || 0,
    respawn_probability: (monsterRaw.respawn_probability as number) ?? 1,
    spawn_time_start: (monsterRaw.spawn_time_start as number) || 0,
    spawn_time_end: (monsterRaw.spawn_time_end as number) || 0,
    placeholder_monster_id: monsterRaw.placeholder_monster_id as string | null,
    placeholder_monster_name: monsterRaw.placeholder_monster_name,
    placeholder_spawn_probability:
      (monsterRaw.placeholder_spawn_probability as number) || 0,
    see_invisibility: Boolean(monsterRaw.see_invisibility),
    is_immune_debuffs: Boolean(monsterRaw.is_immune_debuffs),
    fear_immune: Boolean(monsterRaw.fear_immune),
    yell_friends: Boolean(monsterRaw.yell_friends),
    flee_on_low_hp: Boolean(monsterRaw.flee_on_low_hp),
    no_aggro_monster: Boolean(monsterRaw.no_aggro_monster),
    has_aura: Boolean(monsterRaw.has_aura),
    aggro_messages: aggroMessages,
    aggro_message_probability:
      (monsterRaw.aggro_message_probability as number) || 0,
    lore_boss: monsterRaw.lore_boss as string | null,
    improve_faction: improveFaction,
    decrease_faction: decreaseFaction,
  };

  // Get all spawn locations with source info
  const spawnsRaw = db
    .prepare(
      `
    SELECT
      z.id as zone_id,
      z.name as zone_name,
      ms.level,
      ms.health,
      ms.damage,
      ms.magic_damage,
      ms.defense,
      ms.magic_resist,
      ms.poison_resist,
      ms.fire_resist,
      ms.cold_resist,
      ms.disease_resist,
      ms.sub_zone_id,
      zt.name as sub_zone_name,
      ms.spawn_type,
      ms.source_monster_id,
      ms.source_monster_name,
      ms.source_spawn_probability,
      ms.source_altar_id,
      ms.source_altar_name,
      ms.source_altar_wave,
      ms.source_altar_activation_item_id,
      ms.source_altar_activation_item_name,
      ms.source_summon_kill_monster_id,
      ms.source_summon_kill_monster_name,
      ms.source_summon_kill_count
    FROM monster_spawns ms
    JOIN zones z ON z.id = ms.zone_id
    LEFT JOIN zone_triggers zt ON zt.id = ms.sub_zone_id
    WHERE ms.monster_id = ?
  `,
    )
    .all(params.id) as Array<{
    zone_id: string;
    zone_name: string;
    level: number | null;
    health: number;
    damage: number;
    magic_damage: number;
    defense: number;
    magic_resist: number;
    poison_resist: number;
    fire_resist: number;
    cold_resist: number;
    disease_resist: number;
    sub_zone_id: string | null;
    sub_zone_name: string | null;
    spawn_type: string;
    source_monster_id: string | null;
    source_monster_name: string | null;
    source_spawn_probability: number | null;
    source_altar_id: string | null;
    source_altar_name: string | null;
    source_altar_wave: number | null;
    source_altar_activation_item_id: string | null;
    source_altar_activation_item_name: string | null;
    source_summon_kill_monster_id: string | null;
    source_summon_kill_monster_name: string | null;
    source_summon_kill_count: number | null;
  }>;

  // Group spawns by type
  const spawns: MonsterSpawnData = {
    regular: [],
    summon: [],
    altar: [],
    placeholder: null,
  };

  // Aggregate regular spawns by zone, tracking sub-zones and level range
  const regularByZone = new Map<
    string,
    MonsterSpawnZone & { sub_zone_ids: Set<string | null> }
  >();
  // Aggregate summon spawns by zone (all summon spawns in a zone have same kill req)
  const summonByZone = new Map<string, SummonSpawnInfo>();
  // Aggregate altar spawns by altar (collect wave numbers)
  const altarByAltar = new Map<string, AltarSpawnInfo>();
  // Placeholder spawns - take first one (usually only one)
  let placeholderInfo: PlaceholderSpawnInfo | null = null;

  const spawnCombatStatsByKey = new Map<
    string,
    MonsterSpawnCombatStats & { zoneNameSet: Set<string> }
  >();
  function addSpawnCombatStats(
    stats: MonsterSpawnCombatStats,
    zoneName: string,
  ): void {
    const key = `${stats.level}|${stats.health}|${stats.damage}|${stats.magic_damage}|${stats.defense}|${stats.magic_resist}|${stats.poison_resist}|${stats.fire_resist}|${stats.cold_resist}|${stats.disease_resist}`;
    const existing = spawnCombatStatsByKey.get(key);
    if (existing) {
      existing.spawn_count += stats.spawn_count;
      existing.zoneNameSet.add(zoneName);
      return;
    }

    spawnCombatStatsByKey.set(key, {
      ...stats,
      zone_names: [zoneName],
      zoneNameSet: new Set([zoneName]),
    });
  }

  function hasExportedSpawnCombatStats(
    spawn: (typeof spawnsRaw)[number],
  ): boolean {
    return (
      spawn.health > 0 ||
      spawn.damage !== 0 ||
      spawn.magic_damage !== 0 ||
      spawn.defense !== 0 ||
      spawn.magic_resist !== 0 ||
      spawn.poison_resist !== 0 ||
      spawn.fire_resist !== 0 ||
      spawn.cold_resist !== 0 ||
      spawn.disease_resist !== 0
    );
  }

  for (const spawn of spawnsRaw) {
    const spawnLevel = spawn.level || monster.level;
    const useExportedSpawnStats = hasExportedSpawnCombatStats(spawn);
    addSpawnCombatStats(
      {
        level: spawnLevel,
        zone_names: [],
        spawn_count: 1,
        health:
          useExportedSpawnStats && spawn.health > 0
            ? spawn.health
            : statAtLevel(
                monster.health_base,
                monster.health_per_level,
                spawnLevel,
              ),
        damage: useExportedSpawnStats
          ? spawn.damage
          : statAtLevel(
              monster.damage_base,
              monster.damage_per_level,
              spawnLevel,
            ),
        magic_damage: useExportedSpawnStats
          ? spawn.magic_damage
          : statAtLevel(
              monster.magic_damage_base,
              monster.magic_damage_per_level,
              spawnLevel,
            ),
        defense: useExportedSpawnStats
          ? spawn.defense
          : statAtLevel(
              monster.defense_base,
              monster.defense_per_level,
              spawnLevel,
            ),
        magic_resist: useExportedSpawnStats
          ? spawn.magic_resist
          : statAtLevel(
              monster.magic_resist_base,
              monster.magic_resist_per_level,
              spawnLevel,
            ),
        poison_resist: useExportedSpawnStats
          ? spawn.poison_resist
          : statAtLevel(
              monster.poison_resist_base,
              monster.poison_resist_per_level,
              spawnLevel,
            ),
        fire_resist: useExportedSpawnStats
          ? spawn.fire_resist
          : statAtLevel(
              monster.fire_resist_base,
              monster.fire_resist_per_level,
              spawnLevel,
            ),
        cold_resist: useExportedSpawnStats
          ? spawn.cold_resist
          : statAtLevel(
              monster.cold_resist_base,
              monster.cold_resist_per_level,
              spawnLevel,
            ),
        disease_resist: useExportedSpawnStats
          ? spawn.disease_resist
          : statAtLevel(
              monster.disease_resist_base,
              monster.disease_resist_per_level,
              spawnLevel,
            ),
      },
      spawn.zone_name,
    );

    if (spawn.spawn_type === "regular") {
      // Use level from spawn, fallback to monster's canonical level
      const level = spawn.level || monster.level;
      const existing = regularByZone.get(spawn.zone_id);
      if (existing) {
        existing.spawn_count++;
        existing.level_min = Math.min(existing.level_min, level);
        existing.level_max = Math.max(existing.level_max, level);
        existing.sub_zone_ids.add(spawn.sub_zone_id);
        if (spawn.sub_zone_name) {
          existing.sub_zone_name = spawn.sub_zone_name;
        }
      } else {
        regularByZone.set(spawn.zone_id, {
          zone_id: spawn.zone_id,
          zone_name: spawn.zone_name,
          level_min: level,
          level_max: level,
          spawn_count: 1,
          spawn_type: "regular",
          sub_zone_ids: new Set([spawn.sub_zone_id]),
          sub_zone_name: spawn.sub_zone_name,
        });
      }
    } else if (
      spawn.spawn_type === "summon" &&
      spawn.source_summon_kill_monster_id
    ) {
      if (!summonByZone.has(spawn.zone_id)) {
        summonByZone.set(spawn.zone_id, {
          zone_id: spawn.zone_id,
          zone_name: spawn.zone_name,
          sub_zone_id: spawn.sub_zone_id,
          sub_zone_name: spawn.sub_zone_name,
          kill_monster_id: spawn.source_summon_kill_monster_id,
          kill_monster_name: spawn.source_summon_kill_monster_name || "",
          kill_count: spawn.source_summon_kill_count || 0,
        });
      }
    } else if (spawn.spawn_type === "altar" && spawn.source_altar_id) {
      const existing = altarByAltar.get(spawn.source_altar_id);
      if (existing) {
        if (
          spawn.source_altar_wave !== null &&
          !existing.waves.includes(spawn.source_altar_wave)
        ) {
          existing.waves.push(spawn.source_altar_wave);
        }
      } else {
        altarByAltar.set(spawn.source_altar_id, {
          altar_id: spawn.source_altar_id,
          altar_name: spawn.source_altar_name || "",
          zone_id: spawn.zone_id,
          zone_name: spawn.zone_name,
          waves:
            spawn.source_altar_wave !== null ? [spawn.source_altar_wave] : [],
          activation_item_id: spawn.source_altar_activation_item_id,
          activation_item_name: spawn.source_altar_activation_item_name,
        });
      }
    } else if (spawn.spawn_type === "placeholder" && spawn.source_monster_id) {
      if (!placeholderInfo) {
        placeholderInfo = {
          zone_id: spawn.zone_id,
          zone_name: spawn.zone_name,
          source_monster_id: spawn.source_monster_id,
          source_monster_name: spawn.source_monster_name || "",
          spawn_probability: spawn.source_spawn_probability || 1.0,
        };
      }
    }
  }

  // Get zone IDs with regular spawns
  const zoneIdsWithRegularSpawns = Array.from(regularByZone.keys());
  const subZoneCounts = new Map<string, number>();
  if (zoneIdsWithRegularSpawns.length > 0) {
    const placeholders = zoneIdsWithRegularSpawns.map(() => "?").join(",");
    const subZoneCountsRaw = db
      .prepare(
        `SELECT z.id as zone_text_id, COUNT(DISTINCT zt.id) as count
         FROM zones z
         JOIN zone_triggers zt ON zt.zone_id = z.zone_id
         WHERE z.id IN (${placeholders})
         GROUP BY z.id`,
      )
      .all(...zoneIdsWithRegularSpawns) as Array<{
      zone_text_id: string;
      count: number;
    }>;
    for (const row of subZoneCountsRaw) {
      subZoneCounts.set(row.zone_text_id, row.count);
    }
  }

  // Convert maps to arrays, filtering sub_zone_name based on criteria
  spawns.regular = Array.from(regularByZone.values()).map((spawn) => {
    const zoneSubZoneCount = subZoneCounts.get(spawn.zone_id) || 0;
    const monsterSubZoneCount = spawn.sub_zone_ids.size;
    // Only show sub-zone if zone has >1 sub-zones AND monster spawns in exactly 1
    const showSubZone =
      zoneSubZoneCount > 1 &&
      monsterSubZoneCount === 1 &&
      !spawn.sub_zone_ids.has(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sub_zone_ids, ...rest } = spawn;
    return {
      ...rest,
      sub_zone_name: showSubZone ? spawn.sub_zone_name : null,
    };
  });
  spawns.summon = Array.from(summonByZone.values()).sort((a, b) =>
    a.zone_name.localeCompare(b.zone_name),
  );
  spawns.altar = Array.from(altarByAltar.values()).sort((a, b) =>
    a.altar_name.localeCompare(b.altar_name),
  );
  // Sort wave numbers
  for (const altar of spawns.altar) {
    altar.waves.sort((a, b) => a - b);
  }
  spawns.placeholder = placeholderInfo;
  // Sources: server-scripts/DefaultEvent.cs:SummonMonsters;
  // server-scripts/AvatarEvent.cs:SummonMonsters. Classify actual wave placements,
  // not monster names, since the same template can also appear outside an altar.
  if (typeof monsterRaw.loot_inputs !== "string") {
    throw new Error(`Missing monsters.loot_inputs for ${params.id}`);
  }
  const lootInputs = JSON.parse(monsterRaw.loot_inputs) as BossLootDrop[];
  const templateHasDrops = lootInputs.length > 0;
  if (monster.is_boss) {
    const fatecharmContext = db
      .prepare(
        `
      SELECT EXISTS (
        SELECT 1 FROM monster_spawns ms
        JOIN zones z ON z.id = ms.zone_id AND z.is_dungeon = 1 AND z.zone_id > 0
        JOIN items charm ON charm.luck_token_zone_id = ms.zone_id AND charm.luck_token_bonus > 0
        WHERE ms.monster_id = ?
      ) AS eligible
    `,
      )
      .get(params.id) as { eligible: number };
    const hasFatecharm = Boolean(fatecharmContext.eligible);
    const isLootOutcome = (itemId: string) =>
      lootInputs.some(
        (input) =>
          (input.item_id === itemId && input.random_items === undefined) ||
          input.random_items?.some((item) => item.item_id === itemId),
      );
    const seen = new Set<string>();
    const groupedDrops = drops.filter((drop) => {
      if (drop.altar_id || drop.note || !isLootOutcome(drop.item_id))
        return true;
      if (seen.has(drop.item_id)) return false;
      seen.add(drop.item_id);
      return true;
    });
    for (const drop of groupedDrops) {
      if (drop.altar_id || !isLootOutcome(drop.item_id)) continue;
      const neededQuestItemIds = new Set([drop.item_id]);
      drop.per_kill_chance = calculateBossLootChance(lootInputs, drop.item_id, {
        neededQuestItemIds,
      });
      if (hasFatecharm) {
        drop.per_kill_chance_with_fatecharm = calculateBossLootChance(
          lootInputs,
          drop.item_id,
          { neededQuestItemIds, fatecharm: true },
        );
      }
    }
    drops.splice(0, drops.length, ...groupedDrops);
  }
  const altarPlacements = db
    .prepare(
      `
    SELECT a.type,
      CAST(w.key AS INTEGER) = json_array_length(a.waves) - 1 AS is_final,
      a.reward_common_id IS NOT NULL AND a.reward_magic_id IS NOT NULL
        AND a.reward_epic_id IS NOT NULL AND a.reward_legendary_id IS NOT NULL AS has_rewards
    FROM altars a, json_each(a.waves) w, json_each(w.value, '$.monsters') wm
    WHERE json_extract(wm.value, '$.monster_id') = ?
  `,
    )
    .all(params.id) as Array<{
    type: string;
    is_final: number;
    has_rewards: number;
  }>;
  const combatSummoners = db
    .prepare(
      `
    SELECT DISTINCT m.id AS monster_id, m.name AS monster_name,
      s.id AS skill_id, s.name AS skill_name,
      s.summon_count_per_cast AS count_per_cast, s.max_active_summons AS max_active
    FROM monster_skills ms
    JOIN monsters m ON m.id = ms.monster_id
    JOIN skills s ON s.id = ms.skill_id
    WHERE s.summoned_monster_id = ? AND s.summon_count_per_cast <> 0
    ORDER BY m.name, s.name
  `,
    )
    .all(params.id) as MonsterDetailData["combatSummoners"];
  const hasOtherLootSpawns =
    spawns.regular.length > 0 ||
    spawns.summon.length > 0 ||
    spawns.placeholder !== null;
  const hasOtherSpawns = hasOtherLootSpawns || combatSummoners.length > 0;
  const altarContext: MonsterDetailData["altarContext"] = {
    only_altar_spawns: altarPlacements.length > 0 && !hasOtherSpawns,
    only_nonfinal_waves:
      altarPlacements.length > 0 &&
      !hasOtherLootSpawns &&
      altarPlacements.every((p) => !p.is_final),
    // Source: server-scripts/SummonSkillMonsters.cs:Apply - combat summons also have no loot.
    only_lootless_spawns:
      !hasOtherLootSpawns &&
      (altarPlacements.length > 0 || combatSummoners.length > 0) &&
      altarPlacements.every((p) => !p.is_final),
    only_avatar_altars:
      altarPlacements.length > 0 &&
      !hasOtherSpawns &&
      altarPlacements.every((p) => p.type === "avatar"),
    has_nonfinal_waves: altarPlacements.some((p) => !p.is_final),
    has_avatar_altars: altarPlacements.some((p) => p.type === "avatar"),
    has_scaled_final_gold:
      monster.is_elite &&
      templateHasDrops &&
      altarPlacements.some(
        (p) => p.type === "forgotten" && p.is_final && p.has_rewards,
      ),
  };
  if (altarContext.only_lootless_spawns) {
    drops.splice(0, drops.length);
    monster.gold_min = 0;
    monster.gold_max = 0;
    monster.probability_drop_gold = 0;
  }

  const spawnCombatStats = Array.from(spawnCombatStatsByKey.values())
    .map(({ zoneNameSet, ...stats }) => ({
      ...stats,
      zone_names: Array.from(zoneNameSet).sort((a, b) => a.localeCompare(b)),
    }))
    .sort(
      (a, b) =>
        a.level - b.level || a.zone_names[0].localeCompare(b.zone_names[0]),
    );

  // Get quests that require killing this monster
  const killQuestsRaw = db
    .prepare(
      `
    SELECT
      id,
      name,
      level_required,
      level_recommended,
      is_main_quest,
      is_epic_quest,
      is_adventurer_quest,
      is_repeatable,
      kill_target_1_id,
      kill_amount_1,
      kill_target_2_id,
      kill_amount_2
    FROM quests
    WHERE kill_target_1_id = ? OR kill_target_2_id = ?
    ORDER BY level_recommended
  `,
    )
    .all(params.id, params.id) as Array<{
    id: string;
    name: string;
    level_required: number;
    level_recommended: number;
    is_main_quest: number;
    is_epic_quest: number;
    is_adventurer_quest: number;
    is_repeatable: number;
    kill_target_1_id: string | null;
    kill_amount_1: number;
    kill_target_2_id: string | null;
    kill_amount_2: number;
  }>;

  const quests: MonsterQuest[] = killQuestsRaw.map((q) => ({
    id: q.id,
    name: q.name,
    level_required: q.level_required,
    level_recommended: q.level_recommended,
    display_type: "Kill",
    amount:
      q.kill_target_1_id === params.id ? q.kill_amount_1 : q.kill_amount_2,
    is_main_quest: Boolean(q.is_main_quest),
    is_epic_quest: Boolean(q.is_epic_quest),
    is_adventurer_quest: Boolean(q.is_adventurer_quest),
    is_repeatable: Boolean(q.is_repeatable),
  }));

  // Get quests that require items dropped by this monster
  // item_usages_quest already tracks every quest-item relationship
  const dropItemIds = drops.map((d) => d.item_id);
  const questIdsSeen = new Set(quests.map((q) => q.id));

  if (dropItemIds.length > 0) {
    const placeholders = dropItemIds.map(() => "?").join(",");
    const itemsWithQuests = db
      .prepare(
        `
      SELECT DISTINCT i.id, i.name,
        (SELECT json_group_array(json_object('quest_id', iuq.quest_id, 'quest_name', q.name, 'purpose', iuq.purpose, 'amount', iuq.amount))
         FROM item_usages_quest iuq
         JOIN quests q ON iuq.quest_id = q.id
         WHERE iuq.item_id = i.id) as needed_for_quests
      FROM items i
      WHERE i.id IN (${placeholders})
        AND EXISTS (SELECT 1 FROM item_usages_quest WHERE item_id = i.id)
    `,
      )
      .all(...dropItemIds) as Array<{
      id: string;
      name: string;
      needed_for_quests: string;
    }>;

    // Collect all quest IDs we need to fetch
    const questIdsToFetch = new Set<string>();
    const questInfoMap = new Map<
      string,
      { itemId: string; itemName: string; amount: number; purpose: string }
    >();

    for (const item of itemsWithQuests) {
      const neededFor = JSON.parse(item.needed_for_quests) as Array<{
        quest_id: string;
        quest_name: string;
        level_required: number;
        level_recommended: number;
        purpose: string;
        amount: number;
        is_repeatable: boolean;
        class_restrictions: string[] | null;
      }>;

      for (const questRef of neededFor) {
        if (!questIdsSeen.has(questRef.quest_id)) {
          questIdsToFetch.add(questRef.quest_id);
          // Store item info for this quest (first item wins if multiple drops needed)
          if (!questInfoMap.has(questRef.quest_id)) {
            questInfoMap.set(questRef.quest_id, {
              itemId: item.id,
              itemName: item.name,
              amount: questRef.amount,
              purpose: questRef.purpose,
            });
          }
        }
      }
    }

    // Fetch full quest data for quests we found
    if (questIdsToFetch.size > 0) {
      const questPlaceholders = Array.from(questIdsToFetch)
        .map(() => "?")
        .join(",");
      const itemQuestsRaw = db
        .prepare(
          `
        SELECT
          id,
          name,
          level_required,
          level_recommended,
          display_type,
          is_main_quest,
          is_epic_quest,
          is_adventurer_quest,
          is_repeatable
        FROM quests
        WHERE id IN (${questPlaceholders})
        ORDER BY level_recommended
      `,
        )
        .all(...questIdsToFetch) as Array<{
        id: string;
        name: string;
        level_required: number;
        level_recommended: number;
        display_type: string;
        is_main_quest: number;
        is_epic_quest: number;
        is_adventurer_quest: number;
        is_repeatable: number;
      }>;

      for (const q of itemQuestsRaw) {
        const itemInfo = questInfoMap.get(q.id);
        if (!itemInfo) continue;

        questIdsSeen.add(q.id);
        quests.push({
          id: q.id,
          name: q.name,
          level_required: q.level_required,
          level_recommended: q.level_recommended,
          display_type: itemInfo.purpose,
          amount: itemInfo.amount,
          item_id: itemInfo.itemId,
          item_name: itemInfo.itemName,
          is_main_quest: Boolean(q.is_main_quest),
          is_epic_quest: Boolean(q.is_epic_quest),
          is_adventurer_quest: Boolean(q.is_adventurer_quest),
          is_repeatable: Boolean(q.is_repeatable),
        });
      }

      // Sort by level_recommended after combining
      quests.sort((a, b) => a.level_recommended - b.level_recommended);
    }
  }

  // Get what killing this monster can summon (reverse lookup)
  const summons = db
    .prepare(
      `
    SELECT
      st.summoned_entity_id AS summoned_monster_id,
      st.summoned_entity_name AS summoned_monster_name,
      st.summoned_entity_type,
      COUNT(*) AS kill_count,
      z.id AS zone_id, z.name AS zone_name,
      NULL AS sub_zone_id, NULL AS sub_zone_name
    FROM summon_triggers st
    JOIN summon_trigger_placeholders p ON p.trigger_id = st.id
    JOIN monster_spawns guard ON guard.id = p.spawn_id
    JOIN zones z ON z.id = st.zone_id
    WHERE guard.monster_id = ?
    GROUP BY st.id
  `,
    )
    .all(params.id) as SummonsInfo[];

  // Query renewal sages for world bosses (must be before db.close())
  let renewalSages: Array<{
    id: string;
    name: string;
    zoneId: string | null;
    zoneName: string | null;
    cost: number;
  }> = [];
  if (monster.is_world_boss) {
    const sageRows = db
      .prepare(
        `
        SELECT
          n.id,
          n.name,
          ns.zone_id,
          z.name as zone_name,
          n.gold_required_respawn_dungeon as cost
        FROM npcs n
        LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
        LEFT JOIN zones z ON z.id = ns.zone_id
        WHERE n.respawn_dungeon_id = ?
        ORDER BY z.name, n.name
        `,
      )
      .all(WORLD_BOSS_DUNGEON_ID) as Array<{
      id: string;
      name: string;
      zone_id: string | null;
      zone_name: string | null;
      cost: number;
    }>;
    renewalSages = sageRows.map((r) => ({
      id: r.id,
      name: r.name,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      cost: r.cost,
    }));
  }

  // Get monster skills/abilities
  const abilityRows = db
    .prepare(MONSTER_ABILITIES_QUERY)
    .all(params.id) as Omit<MonsterSkill, "effect_input">[];
  const effectInputs = skillEffectInputs(
    abilityRows.map((row) => ({ id: row.id, runtimeLevel: row.runtime_level })),
  );
  const skills: MonsterSkill[] = abilityRows.map((row, index) => ({
    ...row,
    effect_input: effectInputs[index],
  }));

  const visualAsset =
    (db
      .prepare(
        `
      SELECT public_path, width, height, source_field, source_type
      FROM visual_assets
      WHERE domain = 'monster' AND entity_id = ? AND kind = 'primary'
    `,
      )
      .get(params.id) as EntityVisualAsset | undefined) ?? null;

  db.close();

  // Generate meta description
  const zoneNames = spawns.regular.map((s) => s.zone_name);
  const altarSpawn =
    spawns.altar.length > 0
      ? {
          altar_name: spawns.altar[0].altar_name,
          zone_name: spawns.altar[0].zone_name,
        }
      : null;
  const summonSpawn = spawns.summon[0] ?? null;
  const metadataDrops = drops.filter((drop) => !drop.altar_id);
  const topMetadataDrop = metadataDrops[0];
  const metadataItemCount = new Set(metadataDrops.map((drop) => drop.item_id))
    .size;

  const description = monsterDescription(
    {
      name: monster.name,
      level_min: monster.level_min,
      level_max: monster.level_max,
      is_boss: monster.is_boss,
      is_elite: monster.is_elite,
      is_fabled: monster.is_fabled,
      is_hunt: monster.is_hunt,
      type_name: monster.type_name,
      health:
        spawnCombatStats.length === 1 ? spawnCombatStats[0].health : undefined,
      does_respawn:
        spawns.regular.length > 0 ? monster.does_respawn : undefined,
      death_time: monster.death_time,
      respawn_time:
        spawns.regular.length > 0 &&
        monster.does_respawn &&
        monster.respawn_probability === 1 &&
        monster.spawn_time_start === monster.spawn_time_end
          ? monster.respawn_time
          : undefined,
      drop_summary: topMetadataDrop
        ? `Drops ${topMetadataDrop.item_name}${topMetadataDrop.per_kill_chance != null ? ` (${formatPercent(topMetadataDrop.per_kill_chance, { decimals: 2 })} per kill)` : ""}${metadataItemCount > 1 ? ` and ${metadataItemCount - 1} other items` : ""}.`
        : null,
      triggered_origins: [
        ...(spawns.placeholder
          ? [
              {
                monster_name: spawns.placeholder.source_monster_name,
                zone_name: spawns.placeholder.zone_name,
                trigger: "death" as const,
              },
            ]
          : []),
        ...combatSummoners.map((summoner) => ({
          monster_name: summoner.monster_name,
          trigger: "summon" as const,
        })),
      ],
    },
    zoneNames,
    altarSpawn,
    summonSpawn,
  );

  return {
    monster,
    factionIds: getFactionIdsByName(),
    description,
    drops,
    combatSummoners,
    altarContext,
    spawns,
    spawnCombatStats,
    quests,
    skills,
    summons,
    visualAsset,
    renewalSages,
  };
};
