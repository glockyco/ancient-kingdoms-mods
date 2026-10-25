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
import type { Season } from "$lib/data/seasonal-events";
import { monsterDescription } from "$lib/server/meta-description";
import { formatPercent } from "$lib/utils/format";
import { getFactionIdsByName } from "$lib/queries/factions.server";
import { getAchievementsLinkingTo } from "$lib/queries/achievements.server";
import { MONSTER_ABILITIES_QUERY } from "$lib/skills/monsterAbilitiesQuery";
import { skillEffectInputs } from "$lib/skills/skillEffects.server";
import { statAtLevel } from "$lib/utils/monster-stats";
import { loadAcquisition } from "$lib/server/acquisition";
import { evaluateOutputQuantity } from "$lib/acquisition/rules";
import { projectMonsterLoot } from "$lib/acquisition/projections";
import { contextualMonsterDrops } from "$lib/server/world-acquisition";
import { monsterFatecharm } from "$lib/utils/fatecharm";
import {
  formatAltarRequirement,
  type AltarThresholds,
} from "$lib/calculation/altar";
import {
  altarOutcomeSemantics,
  consolidateAltarTiers,
} from "$lib/server/altar-tier-summaries";
import {
  getMonsterRegionalHunts,
  getMonsterRegionalInvasions,
  type RegionalHuntTarget,
  type RegionalInvasion,
} from "$lib/queries/regional-events.server";
import type { LinkedAchievement } from "$lib/types/achievements";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const monsters = db.prepare("SELECT id FROM monsters").all() as Array<{
    id: string;
  }>;
  db.close();

  return monsters.map((monster) => ({ id: monster.id }));
};

export const load: PageServerLoad = async ({
  params,
}): Promise<
  MonsterDetailData & {
    regionalInvasions: RegionalInvasion[];
    regionalHunts: RegionalHuntTarget[];
    achievements: LinkedAchievement[];
  }
> => {
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

  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const acquisition = await loadAcquisition(execute, {
    kind: "monsters",
    monsterIds: [params.id],
  });
  const loot = projectMonsterLoot(acquisition, params.id);
  const locationName = (domain: string, id: string | null | undefined) => {
    const name = id ? acquisition.entities.get(domain)?.get(id)?.name : null;
    return typeof name === "string" ? name : null;
  };
  const respawnVaries =
    new Set(loot.contexts.map((method) => method.detail.respawn)).size > 1;
  const experienceVaries =
    new Set(loot.contexts.map((method) => method.detail.exp_multiplier)).size >
    1;
  const lootContextLabels = Object.fromEntries(
    loot.contexts.map((method) => {
      const zones = [
        ...new Set(
          method.providers.flatMap((provider) => {
            const name = locationName("zones", provider.location?.zoneId);
            return name ? [name] : [];
          }),
        ),
      ];
      const labels = [...zones];
      if (method.ruleId === "altar_final_loot") {
        const altarName =
          typeof method.detail.altar_id === "string"
            ? locationName("altars", method.detail.altar_id)
            : null;
        labels.push(
          altarName ? `${altarName}, final wave` : "Final altar wave",
        );
      } else if (method.ruleId === "placeholder_loot") {
        labels.push("After the parent monster dies");
      } else if (method.ruleId === "lootless") {
        labels.push("No loot");
      }
      if (respawnVaries)
        labels.push(
          method.detail.respawn === 1 ? "Respawning" : "Does not respawn",
        );
      if (experienceVaries)
        labels.push(
          `${Number(method.detail.exp_multiplier) * 100}% experience`,
        );
      return [method.methodId, labels.join(" · ")];
    }),
  );
  const methodsById = new Map(
    loot.contexts.map((method) => [method.methodId, method]),
  );
  const contextLabels = [...new Set(Object.values(lootContextLabels))];
  const lootCommonContext =
    contextLabels.length === 1 ? contextLabels[0] : null;
  const contextualDrops = contextualMonsterDrops(
    db,
    loot.contexts,
    acquisition,
  ).map((drop) => {
    const method = methodsById.get(drop.method_id)!;
    const result = method.probabilityResults.find(
      (result) =>
        result.target.kind === "item" && result.target.itemId === drop.item_id,
    );
    const labels = lootCommonContext
      ? []
      : [lootContextLabels[method.methodId]];
    const conditional = method.outputs.find(
      (output) =>
        output.item_id === drop.item_id && output.condition_slot !== null,
    );
    if (conditional && typeof method.detail.altar_id === "string") {
      const tier = (["common", "magic", "epic", "legendary"] as const)[
        conditional.condition_slot!
      ];
      const altar = db
        .prepare(
          "SELECT magic_reward_threshold, epic_reward_threshold, legendary_reward_threshold FROM altars WHERE id = ?",
        )
        .get(method.detail.altar_id) as AltarThresholds;
      const progression = db
        .prepare("SELECT max_level FROM progression_rules WHERE id = 1")
        .get() as { max_level: number };
      labels.push(formatAltarRequirement(tier, altar, progression.max_level));
    }
    return {
      ...drop,
      note: labels.filter(Boolean).join(" · ") || null,
      chance_event: result?.event ?? "eligible_kill",
    };
  });
  const drops = consolidateAltarTiers(
    contextualDrops,
    (drop) => methodsById.get(drop.method_id)!,
    (drop) => {
      const method = methodsById.get(drop.method_id)!;
      return {
        outcome: altarOutcomeSemantics(
          method,
          method.outputs.filter((output) => output.item_id === drop.item_id),
          method.probabilityResults.filter(
            (result) =>
              result.target.kind === "item" &&
              result.target.itemId === drop.item_id,
          ),
        ),
        item: drop.item_id,
        chance: drop.rate,
        fatecharmChance: drop.per_kill_chance_with_fatecharm,
        event: drop.chance_event,
        note: drop.note,
      };
    },
  ).map(({ value }) => value);
  const aggroMessages: string[] = monsterRaw.aggro_messages
    ? JSON.parse(monsterRaw.aggro_messages as string)
    : [];
  const improveFaction: string[] = monsterRaw.improve_faction
    ? JSON.parse(monsterRaw.improve_faction as string)
    : [];
  const decreaseFaction: string[] = monsterRaw.decrease_faction
    ? JSON.parse(monsterRaw.decrease_faction as string)
    : [];

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
    season: monsterRaw.season as Season | null,
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
  const goldQuantities = loot.contexts.flatMap((method) =>
    method.outputs
      .filter((output) => output.resource_kind === "gold")
      .flatMap((output) => {
        const quantity = evaluateOutputQuantity(output);
        return quantity.kind === "exact"
          ? [{ min: quantity.value, max: quantity.value }]
          : quantity.kind === "range" && quantity.max !== null
            ? [{ min: quantity.min, max: quantity.max }]
            : [];
      }),
  );
  monster.gold_min = goldQuantities.length
    ? Math.min(...goldQuantities.map((quantity) => quantity.min))
    : 0;
  monster.gold_max = goldQuantities.length
    ? Math.max(...goldQuantities.map((quantity) => quantity.max))
    : 0;

  // Get all spawn locations with source info
  const spawnsRaw = db
    .prepare(
      `
    WITH summon_guards AS (
      SELECT st.id, st.summoned_monster_spawn_id, guard.monster_id,
        monster.name AS monster_name, COUNT(*) AS kill_count
      FROM summon_triggers st
      JOIN summon_trigger_placeholders p ON p.trigger_id = st.id
      JOIN monster_spawns guard ON guard.id = p.spawn_id
      JOIN monsters monster ON monster.id = guard.monster_id
      GROUP BY st.id, guard.monster_id
    )
    SELECT z.id AS zone_id, z.name AS zone_name, ms.level,
      ms.health, ms.damage, ms.magic_damage, ms.defense, ms.magic_resist,
      ms.poison_resist, ms.fire_resist, ms.cold_resist, ms.disease_resist,
      ms.sub_zone_id, zt.name AS sub_zone_name,
      CASE WHEN st.id IS NULL THEN 'regular' ELSE 'summon' END AS spawn_type,
      NULL AS source_monster_id, NULL AS source_monster_name, NULL AS source_spawn_probability,
      NULL AS source_altar_id, NULL AS source_altar_name, NULL AS source_altar_wave,
      NULL AS source_altar_activation_item_id, NULL AS source_altar_activation_item_name,
      sg.monster_id AS source_summon_kill_monster_id,
      sg.monster_name AS source_summon_kill_monster_name,
      sg.kill_count AS source_summon_kill_count
    FROM monster_spawns ms JOIN zones z ON z.id = ms.zone_id
    LEFT JOIN zone_triggers zt ON zt.id = ms.sub_zone_id
    LEFT JOIN summon_triggers st ON st.summoned_monster_spawn_id = ms.id
    LEFT JOIN summon_guards sg ON sg.id = st.id
    WHERE ms.monster_id = ?
    UNION ALL
    SELECT DISTINCT z.id, z.name, json_extract(member.value, '$.base_level'),
      0, 0, 0, 0, 0, 0, 0, 0, 0, a.sub_zone_id, zt.name, 'altar',
      NULL, NULL, NULL, a.id, a.name, k.wave_number,
      a.required_activation_item_id, a.required_activation_item_name,
      NULL, NULL, NULL
    FROM acquisition_kill_details k JOIN altars a ON a.id = k.altar_id
    JOIN zones z ON z.id = a.zone_id LEFT JOIN zone_triggers zt ON zt.id = a.sub_zone_id
    JOIN json_each(a.waves) wave ON CAST(wave.key AS INTEGER) = k.wave_number
    JOIN json_each(wave.value, '$.monsters') member ON CAST(member.key AS INTEGER) = k.wave_member_index
    WHERE k.monster_id = ?
    UNION ALL
    SELECT DISTINCT z.id, z.name, target.level,
      0, 0, 0, 0, 0, 0, 0, 0, 0, parent.sub_zone_id, zt.name, 'placeholder',
      origin.id, origin.name, origin.placeholder_spawn_probability,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    FROM acquisition_kill_details k
    JOIN monster_spawns parent ON parent.id = k.parent_monster_spawn_id
    JOIN monsters origin ON origin.id = parent.monster_id
    JOIN monsters target ON target.id = k.monster_id
    JOIN zones z ON z.id = parent.zone_id LEFT JOIN zone_triggers zt ON zt.id = parent.sub_zone_id
    WHERE k.monster_id = ? AND k.event_kind = 'placeholder'
  `,
    )
    .all(params.id, params.id, params.id) as Array<{
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
      const summonKey = `${spawn.zone_id}:${spawn.source_summon_kill_monster_id}:${spawn.source_summon_kill_count}`;
      if (!summonByZone.has(summonKey)) {
        summonByZone.set(summonKey, {
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
  // Most spawns first, as the Spawns table sorts, so the description names the main zone first.
  spawns.regular = Array.from(regularByZone.values())
    .sort(
      (a, b) =>
        b.spawn_count - a.spawn_count || a.zone_name.localeCompare(b.zone_name),
    )
    .map((spawn) => {
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
  const templateHasDrops = (loot.definitionPool?.entries.length ?? 0) > 0;
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
    // Source: server-scripts/SummonSkillMonsters.cs:Apply — combat summons also have no loot.
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
        a.level - b.level ||
        a.zone_names[0].localeCompare(b.zone_names[0]) ||
        b.spawn_count - a.spawn_count,
    );

  const quests = db
    .prepare(
      `
    SELECT q.id, q.name, q.level_required, q.level_recommended,
      q.is_main_quest, q.is_epic_quest, q.is_adventurer_quest, q.is_repeatable,
      'Kill' AS display_type, o.amount, NULL AS item_id, NULL AS item_name, NULL AS quality
    FROM quest_objectives o JOIN quest_objective_monsters target ON target.id = o.id
    JOIN quests q ON q.id = o.quest_id WHERE target.monster_id = ?
    UNION ALL
    SELECT q.id, q.name, q.level_required, q.level_recommended,
      q.is_main_quest, q.is_epic_quest, q.is_adventurer_quest, q.is_repeatable,
      q.display_type, o.amount, i.id AS item_id, i.name AS item_name, i.quality
    FROM quest_objectives o JOIN quest_objective_items target ON target.id = o.id
    JOIN items i ON i.id = target.item_id JOIN quests q ON q.id = o.quest_id
    WHERE target.item_id IN (SELECT DISTINCT value FROM json_each(?))
    ORDER BY level_recommended, name
  `,
    )
    .all(
      params.id,
      JSON.stringify([...new Set(drops.map((drop) => drop.item_id))]),
    ) as MonsterQuest[];

  // Get what killing this monster can summon (reverse lookup)
  const summons = db
    .prepare(
      `
    SELECT
      COALESCE(target_monster.id, target_npc.id) AS summoned_monster_id,
      COALESCE(target_monster.name, target_npc.name) AS summoned_monster_name,
      st.summoned_entity_type,
      COUNT(*) AS kill_count,
      z.id AS zone_id, z.name AS zone_name,
      NULL AS sub_zone_id, NULL AS sub_zone_name
    FROM summon_triggers st
    LEFT JOIN monster_spawns target_ms ON target_ms.id = st.summoned_monster_spawn_id
    LEFT JOIN monsters target_monster ON target_monster.id = target_ms.monster_id
    LEFT JOIN npc_spawns target_ns ON target_ns.id = st.summoned_npc_spawn_id
    LEFT JOIN npcs target_npc ON target_npc.id = target_ns.npc_id
    JOIN summon_trigger_placeholders p ON p.trigger_id = st.id
    JOIN monster_spawns guard ON guard.id = p.spawn_id
    JOIN zones z ON z.id = st.zone_id
    WHERE guard.monster_id = ? AND st.summoned_target_withheld = 0
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
      season: monster.season,
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
    regionalInvasions: getMonsterRegionalInvasions(params.id),
    regionalHunts: getMonsterRegionalHunts(params.id),
    achievements: getAchievementsLinkingTo(`/monsters/${params.id}`),
    factionIds: getFactionIdsByName(),
    description,
    drops,
    fatecharms: [
      ...new Map(
        loot.contexts.flatMap((method) => {
          const item = monsterFatecharm(acquisition, method);
          return item ? [[item.id, item] as const] : [];
        }),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
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
