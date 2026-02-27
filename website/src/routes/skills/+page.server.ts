import { query } from "$lib/db.server";
import type { PageServerLoad } from "./$types";
import type { SkillListView } from "$lib/types/skills";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import type { Skill } from "$lib/utils/formatSkillEffect";

export const prerender = true;

interface SkillRow {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string | null;
  is_spell: number;
  is_veteran: number;
  is_pet_skill: number;
  is_mercenary_skill: number;
  // Fields needed by formatSkillEffect (stored as JSON TEXT or number in DB)
  damage_type: string | null;
  damage: string | null;
  damage_percent: string | null;
  lifetap_percent: string | null;
  knockback_chance: string | null;
  stun_chance: string | null;
  stun_time: string | null;
  fear_chance: string | null;
  fear_time: string | null;
  aggro: string | null;
  is_assassination_skill: number;
  is_manaburn_skill: number;
  break_armor_prob: number;
  heals_health: string | null;
  heals_mana: string | null;
  is_resurrect_skill: number;
  is_balance_health: number;
  health_max_bonus: string | null;
  health_max_percent_bonus: string | null;
  mana_max_bonus: string | null;
  mana_max_percent_bonus: string | null;
  energy_max_bonus: string | null;
  defense_bonus: string | null;
  ward_bonus: string | null;
  magic_resist_bonus: string | null;
  poison_resist_bonus: string | null;
  fire_resist_bonus: string | null;
  cold_resist_bonus: string | null;
  disease_resist_bonus: string | null;
  damage_bonus: string | null;
  damage_percent_bonus: string | null;
  magic_damage_bonus: string | null;
  magic_damage_percent_bonus: string | null;
  haste_bonus: string | null;
  spell_haste_bonus: string | null;
  speed_bonus: string | null;
  critical_chance_bonus: string | null;
  accuracy_bonus: string | null;
  block_chance_bonus: string | null;
  fear_resist_chance_bonus: string | null;
  damage_shield: string | null;
  cooldown_reduction_percent: string | null;
  heal_on_hit_percent: string | null;
  healing_per_second_bonus: string | null;
  health_percent_per_second_bonus: string | null;
  mana_per_second_bonus: string | null;
  mana_percent_per_second_bonus: string | null;
  energy_per_second_bonus: string | null;
  energy_percent_per_second_bonus: string | null;
  strength_bonus: string | null;
  intelligence_bonus: string | null;
  dexterity_bonus: string | null;
  constitution_bonus: string | null;
  wisdom_bonus: string | null;
  charisma_bonus: string | null;
  duration_base: number;
  is_invisibility: number;
  is_mana_shield: number;
  is_cleanse: number;
  is_dispel: number;
  is_blindness: number;
  is_enrage: number;
  is_poison_debuff: number;
  is_disease_debuff: number;
  is_fire_debuff: number;
  is_cold_debuff: number;
  is_magic_debuff: number;
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_prefab_name: string | null;
  pet_id: string | null;
  is_familiar: number;
  affects_random_target: number;
  area_object_size: number;
  area_objects_to_spawn: number;
}

interface PetSkillRow {
  skill_id: string;
  is_mercenary: number;
}

export interface SkillsPageData {
  skills: SkillListView[];
}

export const load: PageServerLoad = (): SkillsPageData => {
  const rows = query<SkillRow>(
    `SELECT
      s.id,
      s.name,
      s.skill_type,
      s.tier,
      s.max_level,
      s.level_required,
      s.player_classes,
      s.is_spell,
      s.is_veteran,
      s.is_pet_skill,
      s.is_mercenary_skill,
      s.damage_type,
      s.damage,
      s.damage_percent,
      s.lifetap_percent,
      s.knockback_chance,
      s.stun_chance,
      s.stun_time,
      s.fear_chance,
      s.fear_time,
      s.aggro,
      s.is_assassination_skill,
      s.is_manaburn_skill,
      s.break_armor_prob,
      s.heals_health,
      s.heals_mana,
      s.is_resurrect_skill,
      s.is_balance_health,
      s.health_max_bonus,
      s.health_max_percent_bonus,
      s.mana_max_bonus,
      s.mana_max_percent_bonus,
      s.energy_max_bonus,
      s.defense_bonus,
      s.ward_bonus,
      s.magic_resist_bonus,
      s.poison_resist_bonus,
      s.fire_resist_bonus,
      s.cold_resist_bonus,
      s.disease_resist_bonus,
      s.damage_bonus,
      s.damage_percent_bonus,
      s.magic_damage_bonus,
      s.magic_damage_percent_bonus,
      s.haste_bonus,
      s.spell_haste_bonus,
      s.speed_bonus,
      s.critical_chance_bonus,
      s.accuracy_bonus,
      s.block_chance_bonus,
      s.fear_resist_chance_bonus,
      s.damage_shield,
      s.cooldown_reduction_percent,
      s.heal_on_hit_percent,
      s.healing_per_second_bonus,
      s.health_percent_per_second_bonus,
      s.mana_per_second_bonus,
      s.mana_percent_per_second_bonus,
      s.energy_per_second_bonus,
      s.energy_percent_per_second_bonus,
      s.strength_bonus,
      s.intelligence_bonus,
      s.dexterity_bonus,
      s.constitution_bonus,
      s.wisdom_bonus,
      s.charisma_bonus,
      s.duration_base,
      s.is_invisibility,
      s.is_mana_shield,
      s.is_cleanse,
      s.is_dispel,
      s.is_blindness,
      s.is_enrage,
      s.is_poison_debuff,
      s.is_disease_debuff,
      s.is_fire_debuff,
      s.is_cold_debuff,
      s.is_magic_debuff,
      s.summoned_monster_id,
      sm.name as summoned_monster_name,
      s.summoned_monster_level,
      s.summon_count_per_cast,
      s.max_active_summons,
      s.pet_prefab_name,
      pet_lookup.id as pet_id,
      s.is_familiar,
      s.affects_random_target,
      s.area_object_size,
      s.area_objects_to_spawn
    FROM skills s
    LEFT JOIN monsters sm ON sm.id = s.summoned_monster_id
    LEFT JOIN pets pet_lookup ON lower(pet_lookup.name) = lower(s.pet_prefab_name)
    ORDER BY s.tier ASC, s.name ASC`,
  );

  // Separate query for pet/mercenary relationships — plain object lookup, not Map
  // (Map is not serializable through SvelteKit's data passing)
  const petSkillRows = query<PetSkillRow>(
    `SELECT DISTINCT ps.skill_id, p.is_mercenary
    FROM pet_skills ps
    JOIN pets p ON p.id = ps.pet_id`,
  );

  const usedByMercenaries = new Set<string>();
  const usedByPets = new Set<string>();
  for (const row of petSkillRows) {
    if (row.is_mercenary) {
      usedByMercenaries.add(row.skill_id);
    } else {
      usedByPets.add(row.skill_id);
    }
  }

  const skills: SkillListView[] = rows.map((row) => {
    const playerClasses: string[] = row.player_classes
      ? JSON.parse(row.player_classes)
      : [];

    // Pass raw DB values to formatSkillEffect — it accepts string | LinearValue | null
    const skillForEffect: Skill = {
      id: row.id,
      skill_type: row.skill_type,
      damage_type: row.damage_type,
      max_level: row.max_level,
      damage: row.damage,
      damage_percent: row.damage_percent,
      lifetap_percent: row.lifetap_percent,
      knockback_chance: row.knockback_chance,
      stun_chance: row.stun_chance,
      stun_time: row.stun_time,
      fear_chance: row.fear_chance,
      fear_time: row.fear_time,
      aggro: row.aggro,
      is_assassination_skill: Boolean(row.is_assassination_skill),
      is_manaburn_skill: Boolean(row.is_manaburn_skill),
      break_armor_prob: row.break_armor_prob,
      heals_health: row.heals_health,
      heals_mana: row.heals_mana,
      is_resurrect_skill: Boolean(row.is_resurrect_skill),
      is_balance_health: Boolean(row.is_balance_health),
      health_max_bonus: row.health_max_bonus,
      health_max_percent_bonus: row.health_max_percent_bonus,
      mana_max_bonus: row.mana_max_bonus,
      mana_max_percent_bonus: row.mana_max_percent_bonus,
      energy_max_bonus: row.energy_max_bonus,
      defense_bonus: row.defense_bonus,
      ward_bonus: row.ward_bonus,
      magic_resist_bonus: row.magic_resist_bonus,
      poison_resist_bonus: row.poison_resist_bonus,
      fire_resist_bonus: row.fire_resist_bonus,
      cold_resist_bonus: row.cold_resist_bonus,
      disease_resist_bonus: row.disease_resist_bonus,
      damage_bonus: row.damage_bonus,
      damage_percent_bonus: row.damage_percent_bonus,
      magic_damage_bonus: row.magic_damage_bonus,
      magic_damage_percent_bonus: row.magic_damage_percent_bonus,
      haste_bonus: row.haste_bonus,
      spell_haste_bonus: row.spell_haste_bonus,
      speed_bonus: row.speed_bonus,
      critical_chance_bonus: row.critical_chance_bonus,
      accuracy_bonus: row.accuracy_bonus,
      block_chance_bonus: row.block_chance_bonus,
      fear_resist_chance_bonus: row.fear_resist_chance_bonus,
      damage_shield: row.damage_shield,
      cooldown_reduction_percent: row.cooldown_reduction_percent,
      heal_on_hit_percent: row.heal_on_hit_percent,
      healing_per_second_bonus: row.healing_per_second_bonus,
      health_percent_per_second_bonus: row.health_percent_per_second_bonus,
      mana_per_second_bonus: row.mana_per_second_bonus,
      mana_percent_per_second_bonus: row.mana_percent_per_second_bonus,
      energy_per_second_bonus: row.energy_per_second_bonus,
      energy_percent_per_second_bonus: row.energy_percent_per_second_bonus,
      strength_bonus: row.strength_bonus,
      intelligence_bonus: row.intelligence_bonus,
      dexterity_bonus: row.dexterity_bonus,
      constitution_bonus: row.constitution_bonus,
      wisdom_bonus: row.wisdom_bonus,
      charisma_bonus: row.charisma_bonus,
      duration_base: row.duration_base,
      is_invisibility: Boolean(row.is_invisibility),
      is_mana_shield: Boolean(row.is_mana_shield),
      is_cleanse: Boolean(row.is_cleanse),
      is_dispel: Boolean(row.is_dispel),
      is_blindness: Boolean(row.is_blindness),
      is_enrage: Boolean(row.is_enrage),
      is_poison_debuff: Boolean(row.is_poison_debuff),
      is_disease_debuff: Boolean(row.is_disease_debuff),
      is_fire_debuff: Boolean(row.is_fire_debuff),
      is_cold_debuff: Boolean(row.is_cold_debuff),
      is_magic_debuff: Boolean(row.is_magic_debuff),
      summoned_monster_id: row.summoned_monster_id,
      summoned_monster_name: row.summoned_monster_name,
      summoned_monster_level: row.summoned_monster_level,
      summon_count_per_cast: row.summon_count_per_cast,
      max_active_summons: row.max_active_summons,
      pet_name: row.pet_prefab_name,
      is_familiar: Boolean(row.is_familiar),
      affects_random_target: Boolean(row.affects_random_target),
      area_object_size: row.area_object_size,
      area_objects_to_spawn: row.area_objects_to_spawn,
    };

    return {
      id: row.id,
      name: row.name,
      skill_type: row.skill_type,
      tier: row.tier,
      max_level: row.max_level,
      level_required: row.level_required,
      player_classes: playerClasses,
      is_spell: Boolean(row.is_spell),
      is_veteran: Boolean(row.is_veteran),
      is_pet_skill: Boolean(row.is_pet_skill),
      is_mercenary_skill: Boolean(row.is_mercenary_skill),
      effect: formatSkillEffect(skillForEffect),
      used_by_mercenaries: usedByMercenaries.has(row.id),
      used_by_pets: usedByPets.has(row.id),
      pet_id: row.pet_id,
      pet_name: row.pet_prefab_name,
      summoned_monster_id: row.summoned_monster_id,
      summoned_monster_name: row.summoned_monster_name,
      summoned_monster_level: row.summoned_monster_level,
      summon_count_per_cast: row.summon_count_per_cast,
      max_active_summons: row.max_active_summons,
    };
  });

  return { skills };
};
