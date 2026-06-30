import { query } from "$lib/db.server";
import type { PageServerLoad } from "./$types";
import type { SkillListView } from "$lib/types/skills";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";

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
  critical_resist_bonus: string | null;
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
  is_teleport: number;
  is_blindness: number;
  is_enrage: number;
  is_poison_debuff: number;
  is_disease_debuff: number;
  is_fire_debuff: number;
  is_cold_debuff: number;
  is_magic_debuff: number;
  is_melee_debuff: number;
  prob_ignore_cleanse: number;
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
  const rows = query<SkillRow>(SKILLS_LIST_QUERY);

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

    const skillForEffect = skillRowToEffectInput(row);

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
