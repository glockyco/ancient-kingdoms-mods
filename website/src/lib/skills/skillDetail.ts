import type { SkillDetailView, SkillPet } from "$lib/types/skills";
import { parseLinear } from "$lib/utils/parseLinear";

/**
 * Columns describing who casts a skill, as JSON or counts, so a projection can
 * resolve the same mechanics contexts as the skill page without more queries.
 */
// Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — every potion except Bandages applies its buff at 1 + Elixir Endurance rank once that skill is learned.
const SKILL_CASTER_COLUMNS = `(
        SELECT json_group_array(json_object(
          'is_mercenary', p.is_mercenary,
          'is_familiar', p.is_familiar,
          'type_monster', p.type_monster,
          'skill_index', ps.skill_index
        ))
        FROM pet_skills ps
        JOIN pets p ON p.id = ps.pet_id
        WHERE ps.skill_id = s.id
      ) AS caster_pets,
      (SELECT COUNT(*) FROM monster_skills ms WHERE ms.skill_id = s.id) AS caster_monster_count,
      (
        SELECT COUNT(*) FROM npcs n, json_each(n.skill_ids) npc_skill
        WHERE npc_skill.value = s.id
      ) AS caster_npc_count,
      (SELECT COUNT(*) FROM traps t WHERE t.effect_skill_id = s.id) AS caster_trap_count,
      coalesce(json_array_length(s.granted_by_items), 0) AS caster_item_count,
      (
        SELECT json_group_array(json_object(
          'class_required', i.class_required,
          'weapon_category', i.weapon_category
        ))
        FROM json_each(s.granted_by_items) granted
        JOIN items i ON i.id = json_extract(granted.value, '$.item_id')
        WHERE json_extract(granted.value, '$.type') = 'weapon_proc'
      ) AS caster_weapon_procs,
      (
        SELECT json_group_array(DISTINCT i.potion_buff_level)
        FROM items i
        WHERE i.potion_buff_id = s.id
          AND coalesce(i.cooldown_category, '') != 'Bandages'
      ) AS caster_potion_buff_levels`;

/** The skill row with the names and casters `skillDetailFromRow` and `skillCastersFromRow` read. */
export const SKILL_DETAIL_COLUMNS = `s.*,
      ps.name AS prerequisite_skill_name,
      ps2.name AS prerequisite2_skill_name,
      sm.name AS summoned_monster_name,
      pet_lookup.name AS pet_name,
      pet_lookup.is_mercenary AS pet_is_mercenary,
      ${SKILL_CASTER_COLUMNS}`;

export const SKILL_DETAIL_JOINS = `LEFT JOIN skills ps ON ps.id = s.prerequisite_skill_id
    LEFT JOIN skills ps2 ON ps2.id = s.prerequisite2_skill_id
    LEFT JOIN monsters sm ON sm.id = s.summoned_monster_id
    LEFT JOIN pets pet_lookup ON pet_lookup.id = s.pet_id`;

/** A pet that casts the skill, with the fields that choose its mechanics. */
export type SkillCasterPet = Pick<
  SkillPet,
  "is_mercenary" | "is_familiar" | "type_monster" | "skill_index"
>;

/** A weapon whose on-hit effect casts the skill. */
export interface SkillWeaponProc {
  classes: string[] | null;
  weaponCategory: string | null;
}

/** Who casts a skill besides the player classes listed on it. */
export interface SkillCasters {
  pets: SkillCasterPet[];
  monsterCount: number;
  npcCount: number;
  trapCount: number;
  /** Items that cast or apply the skill: scrolls, potions, food, relics and weapons. */
  itemCount: number;
  weaponProcs: SkillWeaponProc[];
  /** The distinct buff levels of the potions, other than Bandages, that apply the skill. */
  potionBuffLevels: number[];
}

/** Parse a JSON array column the skill detail columns produce. */
function jsonArray(row: Record<string, unknown>, column: string): unknown[] {
  const raw = row[column];
  if (typeof raw !== "string") {
    throw new Error(`Skill row lacks the ${column} column`);
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Skill column ${column} is not a JSON array`);
  }
  return parsed;
}

function count(row: Record<string, unknown>, column: string): number {
  const value = row[column];
  if (typeof value !== "number") {
    throw new Error(`Skill row lacks the ${column} column`);
  }
  return value;
}

function record(value: unknown, column: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Skill column ${column} holds a non-object entry`);
  }
  return value as Record<string, unknown>;
}

/** The casters `SKILL_DETAIL_COLUMNS` selected for a skill row. */
export function skillCastersFromRow(
  row: Record<string, unknown>,
): SkillCasters {
  return {
    pets: jsonArray(row, "caster_pets").map((entry) => {
      const pet = record(entry, "caster_pets");
      return {
        is_mercenary: Boolean(pet.is_mercenary),
        is_familiar: Boolean(pet.is_familiar),
        type_monster:
          typeof pet.type_monster === "string" ? pet.type_monster : null,
        skill_index: Number(pet.skill_index),
      };
    }),
    monsterCount: count(row, "caster_monster_count"),
    npcCount: count(row, "caster_npc_count"),
    trapCount: count(row, "caster_trap_count"),
    itemCount: count(row, "caster_item_count"),
    weaponProcs: jsonArray(row, "caster_weapon_procs").map((entry) => {
      const item = record(entry, "caster_weapon_procs");
      return {
        classes:
          typeof item.class_required === "string"
            ? (JSON.parse(item.class_required) as string[])
            : null,
        weaponCategory:
          typeof item.weapon_category === "string"
            ? item.weapon_category
            : null,
      };
    }),
    potionBuffLevels: jsonArray(row, "caster_potion_buff_levels").map(
      (level) => {
        if (typeof level !== "number") {
          throw new Error(
            "Skill column caster_potion_buff_levels is not numeric",
          );
        }
        return level;
      },
    ),
  };
}

/** The skill page's view of a row selected with `SKILL_DETAIL_COLUMNS`. */
export function skillDetailFromRow(
  skillRaw: Record<string, unknown>,
): SkillDetailView {
  const playerClasses: string[] = skillRaw.player_classes
    ? (JSON.parse(skillRaw.player_classes as string) as string[]).sort()
    : [];
  return {
    id: skillRaw.id as string,
    name: skillRaw.name as string,
    skill_type: skillRaw.skill_type as string,
    tier: (skillRaw.tier as number) || 0,
    max_level: (skillRaw.max_level as number) || 1,
    level_required: (skillRaw.level_required as number) || 0,
    required_skill_points: (skillRaw.required_skill_points as number) || 1,
    required_spent_points: (skillRaw.required_spent_points as number) || 0,
    player_classes: playerClasses,
    tooltip_template: skillRaw.tooltip_template as string | null,

    // Prerequisites
    prerequisite_skill_id: skillRaw.prerequisite_skill_id as string | null,
    prerequisite_skill_name: skillRaw.prerequisite_skill_name as string | null,
    prerequisite_level: (skillRaw.prerequisite_level as number) || 0,
    prerequisite2_skill_id: skillRaw.prerequisite2_skill_id as string | null,
    prerequisite2_skill_name: skillRaw.prerequisite2_skill_name as
      string | null,
    prerequisite2_level: (skillRaw.prerequisite2_level as number) || 0,

    // Weapon requirements
    required_weapon_category: skillRaw.required_weapon_category as
      string | null,
    required_weapon_category2: skillRaw.required_weapon_category2 as
      string | null,

    // Flags
    is_spell: Boolean(skillRaw.is_spell),
    is_veteran: Boolean(skillRaw.is_veteran),
    is_pet_skill: Boolean(skillRaw.is_pet_skill),
    is_mercenary_skill: Boolean(skillRaw.is_mercenary_skill),
    is_scroll: Boolean(skillRaw.is_scroll),
    is_relic: Boolean(skillRaw.is_relic),
    base_skill: Boolean(skillRaw.base_skill),
    learn_default: Boolean(skillRaw.learn_default),
    allow_dungeon: Boolean(skillRaw.allow_dungeon ?? true),
    followup_default_attack: Boolean(skillRaw.followup_default_attack),

    // Costs and timing
    mana_cost: parseLinear(skillRaw.mana_cost),
    energy_cost: parseLinear(skillRaw.energy_cost),
    cooldown: parseLinear(skillRaw.cooldown),
    cast_time: parseLinear(skillRaw.cast_time),
    cast_range: parseLinear(skillRaw.cast_range),
    channel_pulses: Number(skillRaw.channel_pulses ?? 0),
    health_cost_percent: parseLinear(skillRaw.health_cost_percent),
    mana_restored_percent: parseLinear(skillRaw.mana_restored_percent),
    healing_percent: parseLinear(skillRaw.healing_percent),
    healing_percent_per_intelligence: Number(
      skillRaw.healing_percent_per_intelligence ?? 0,
    ),
    is_necromancer_blood_pact: Boolean(skillRaw.is_necromancer_blood_pact),
    is_necromancer_death_bloom: Boolean(skillRaw.is_necromancer_death_bloom),
    is_necromancer_pet_buff: Boolean(skillRaw.is_necromancer_pet_buff),
    is_necromancer_reaper_form: Boolean(skillRaw.is_necromancer_reaper_form),

    // Damage
    damage: parseLinear(skillRaw.damage),
    damage_percent: parseLinear(skillRaw.damage_percent),
    damage_type: skillRaw.damage_type as SkillDetailView["damage_type"],
    damage_over_time_type:
      skillRaw.damage_over_time_type as SkillDetailView["damage_over_time_type"],
    damage_shield_type:
      skillRaw.damage_shield_type as SkillDetailView["damage_shield_type"],
    lifetap_percent: parseLinear(skillRaw.lifetap_percent),
    aggro: parseLinear(skillRaw.aggro),
    break_armor_prob: (skillRaw.break_armor_prob as number) || 0,
    is_assassination_skill: Boolean(skillRaw.is_assassination_skill),
    is_manaburn_skill: Boolean(skillRaw.is_manaburn_skill),

    // Healing
    heals_health: parseLinear(skillRaw.heals_health),
    heals_mana: parseLinear(skillRaw.heals_mana),
    charmed_damage_percent: parseLinear(skillRaw.charmed_damage_percent),
    can_heal_self: Boolean(skillRaw.can_heal_self),
    can_heal_others: Boolean(skillRaw.can_heal_others),

    // Crowd control (LinearValue — stored as JSON TEXT in DB)
    stun_chance: parseLinear(skillRaw.stun_chance),
    stun_time: parseLinear(skillRaw.stun_time),
    fear_chance: parseLinear(skillRaw.fear_chance),
    fear_time: parseLinear(skillRaw.fear_time),
    knockback_chance: parseLinear(skillRaw.knockback_chance),
    knockback_distance: Number(skillRaw.knockback_distance ?? 0),

    // Buff duration
    duration_base: (skillRaw.duration_base as number) || 0,
    duration_per_level: (skillRaw.duration_per_level as number) || 0,

    // Buff targeting
    can_buff_self: Boolean(skillRaw.can_buff_self),
    can_buff_others: Boolean(skillRaw.can_buff_others),
    buff_category: skillRaw.buff_category as string | null,
    also_buff_active_pet: Boolean(skillRaw.also_buff_active_pet),
    scales_with_intelligence: Boolean(skillRaw.scales_with_intelligence),
    lifetap_healing_percent_bonus: parseLinear(
      skillRaw.lifetap_healing_percent_bonus,
    ),

    // Buff stat bonuses
    health_max_bonus: parseLinear(skillRaw.health_max_bonus),
    health_max_percent_bonus: parseLinear(skillRaw.health_max_percent_bonus),
    mana_max_bonus: parseLinear(skillRaw.mana_max_bonus),
    mana_max_percent_bonus: parseLinear(skillRaw.mana_max_percent_bonus),
    energy_max_bonus: parseLinear(skillRaw.energy_max_bonus),
    defense_bonus: parseLinear(skillRaw.defense_bonus),
    ward_bonus: parseLinear(skillRaw.ward_bonus),
    magic_resist_bonus: parseLinear(skillRaw.magic_resist_bonus),
    damage_bonus: parseLinear(skillRaw.damage_bonus),
    damage_percent_bonus: parseLinear(skillRaw.damage_percent_bonus),
    magic_damage_bonus: parseLinear(skillRaw.magic_damage_bonus),
    magic_damage_percent_bonus: parseLinear(
      skillRaw.magic_damage_percent_bonus,
    ),
    haste_bonus: parseLinear(skillRaw.haste_bonus),
    spell_haste_bonus: parseLinear(skillRaw.spell_haste_bonus),
    speed_bonus: parseLinear(skillRaw.speed_bonus),
    critical_chance_bonus: parseLinear(skillRaw.critical_chance_bonus),
    critical_resist_bonus: parseLinear(skillRaw.critical_resist_bonus),
    accuracy_bonus: parseLinear(skillRaw.accuracy_bonus),
    block_chance_bonus: parseLinear(skillRaw.block_chance_bonus),
    fear_resist_chance_bonus: parseLinear(skillRaw.fear_resist_chance_bonus),
    fear_resist_chance_bonus_cap: Number(
      skillRaw.fear_resist_chance_bonus_cap ?? 0,
    ),
    damage_shield: parseLinear(skillRaw.damage_shield),
    cooldown_reduction_percent: parseLinear(
      skillRaw.cooldown_reduction_percent,
    ),
    heal_on_hit_percent: parseLinear(skillRaw.heal_on_hit_percent),

    // Regen bonuses
    healing_per_second_bonus: parseLinear(skillRaw.healing_per_second_bonus),
    health_percent_per_second_bonus: parseLinear(
      skillRaw.health_percent_per_second_bonus,
    ),
    mana_per_second_bonus: parseLinear(skillRaw.mana_per_second_bonus),
    mana_percent_per_second_bonus: parseLinear(
      skillRaw.mana_percent_per_second_bonus,
    ),
    energy_per_second_bonus: parseLinear(skillRaw.energy_per_second_bonus),
    energy_percent_per_second_bonus: parseLinear(
      skillRaw.energy_percent_per_second_bonus,
    ),

    // Resist bonuses
    poison_resist_bonus: parseLinear(skillRaw.poison_resist_bonus),
    fire_resist_bonus: parseLinear(skillRaw.fire_resist_bonus),
    cold_resist_bonus: parseLinear(skillRaw.cold_resist_bonus),
    disease_resist_bonus: parseLinear(skillRaw.disease_resist_bonus),

    // Attribute bonuses
    strength_bonus: parseLinear(skillRaw.strength_bonus),
    intelligence_bonus: parseLinear(skillRaw.intelligence_bonus),
    dexterity_bonus: parseLinear(skillRaw.dexterity_bonus),
    constitution_bonus: parseLinear(skillRaw.constitution_bonus),
    wisdom_bonus: parseLinear(skillRaw.wisdom_bonus),
    charisma_bonus: parseLinear(skillRaw.charisma_bonus),

    // Special flags
    is_resurrect_skill: Boolean(skillRaw.is_resurrect_skill),
    is_balance_health: Boolean(skillRaw.is_balance_health),
    is_invisibility: Boolean(skillRaw.is_invisibility),
    ignores_see_invisibility: Boolean(skillRaw.ignores_see_invisibility),
    is_undead_illusion: Boolean(skillRaw.is_undead_illusion),
    illusion_race: (skillRaw.illusion_race as string | null) ?? null,
    is_mana_shield: Boolean(skillRaw.is_mana_shield),
    is_cleanse: Boolean(skillRaw.is_cleanse),
    is_dispel: Boolean(skillRaw.is_dispel),
    is_teleport: Boolean(skillRaw.is_teleport),
    is_blindness: Boolean(skillRaw.is_blindness),
    is_enrage: Boolean(skillRaw.is_enrage),
    is_double_exp_spell: Boolean(skillRaw.is_double_exp_spell),
    scales_with_charisma: Boolean(skillRaw.scales_with_charisma),
    damage_over_time_bonus_per_charisma_point: Number(
      skillRaw.damage_over_time_bonus_per_charisma_point ?? 0,
    ),
    is_bard_song: Boolean(skillRaw.is_bard_song),
    is_bard_charm: Boolean(skillRaw.is_bard_charm),
    is_bard_final_cadence: Boolean(skillRaw.is_bard_final_cadence),
    is_bard_virtuosity: Boolean(skillRaw.is_bard_virtuosity),
    additional_damage_percent_per_song: Number(
      skillRaw.additional_damage_percent_per_song ?? 0,
    ),
    is_permanent: Boolean(skillRaw.is_permanent),
    is_only_for_magic_classes: Boolean(skillRaw.is_only_for_magic_classes),
    remain_after_death: Boolean(skillRaw.remain_after_death),
    is_decrease_resists_skill: Boolean(skillRaw.is_decrease_resists_skill),

    // Debuff type flags
    is_poison_debuff: Boolean(skillRaw.is_poison_debuff),
    is_fire_debuff: Boolean(skillRaw.is_fire_debuff),
    is_cold_debuff: Boolean(skillRaw.is_cold_debuff),
    is_disease_debuff: Boolean(skillRaw.is_disease_debuff),
    is_melee_debuff: Boolean(skillRaw.is_melee_debuff),
    is_magic_debuff: Boolean(skillRaw.is_magic_debuff),
    poison_disease_scales_with_intelligence: Boolean(
      skillRaw.poison_disease_scales_with_intelligence,
    ),
    damage_over_time_bonus_per_intelligence_point: Number(
      skillRaw.damage_over_time_bonus_per_intelligence_point ?? 0,
    ),
    prob_ignore_cleanse: (skillRaw.prob_ignore_cleanse as number) || 0,

    // Passive mechanics
    additional_active_bard_songs: Number(
      skillRaw.additional_active_bard_songs ?? 0,
    ),
    unlimited_active_bard_songs: Boolean(skillRaw.unlimited_active_bard_songs),
    bard_song_duration_bonus_per_level: Number(
      skillRaw.bard_song_duration_bonus_per_level ?? 0,
    ),
    extra_gather_item_chance: Number(skillRaw.extra_gather_item_chance ?? 0),
    food_and_drink_buff_duration_bonus_per_level: Number(
      skillRaw.food_and_drink_buff_duration_bonus_per_level ?? 0,
    ),
    damage_over_time_execute_bonus: parseLinear(
      skillRaw.damage_over_time_execute_bonus,
    ),

    // Summon fields
    summoned_monster_id: skillRaw.summoned_monster_id as string | null,
    summoned_monster_name: skillRaw.summoned_monster_name as string | null,
    summoned_monster_level: skillRaw.summoned_monster_level as number | null,
    summon_count_per_cast: skillRaw.summon_count_per_cast as number | null,
    max_active_summons: skillRaw.max_active_summons as number | null,
    pet_id: skillRaw.pet_id as string | null,
    pet_is_mercenary: Boolean(skillRaw.pet_is_mercenary),
    pet_name: skillRaw.pet_name as string | null,
    is_familiar: Boolean(skillRaw.is_familiar),

    // AoE fields
    affects_random_target: Boolean(skillRaw.affects_random_target),
    area_projectile: Boolean(skillRaw.area_projectile),
    area_object_size: (skillRaw.area_object_size as number) || 0,
    area_objects_to_spawn: (skillRaw.area_objects_to_spawn as number) || 0,
  };
}
