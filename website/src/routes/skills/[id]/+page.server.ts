import { query, queryOne } from "$lib/db.server";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  SkillDetailView,
  SkillItemSource,
  SkillMonster,
  SkillPet,
  LinearValue,
} from "$lib/types/skills";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return query<{ id: string }>("SELECT id FROM skills").map((skill) => ({
    id: skill.id,
  }));
};

function parseLinear(value: unknown): LinearValue | null {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as LinearValue;
    if (parsed.base_value === 0 && parsed.bonus_per_level === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface SkillDetailPageData {
  skill: SkillDetailView;
  effectSummary: string;
  grantedByItems: SkillItemSource[];
  usedByMonsters: SkillMonster[];
  usedByPets: SkillPet[];
  description: string;
}

export const load: PageServerLoad = ({ params }): SkillDetailPageData => {
  const skillRaw = queryOne<Record<string, unknown>>(
    `SELECT
      s.*,
      ps.name as prerequisite_skill_name,
      ps2.name as prerequisite2_skill_name,
      sm.name as summoned_monster_name,
      pet_lookup.id as pet_id,
      pet_lookup.name as pet_name
    FROM skills s
    LEFT JOIN skills ps ON ps.id = s.prerequisite_skill_id
    LEFT JOIN skills ps2 ON ps2.id = s.prerequisite2_skill_id
    LEFT JOIN monsters sm ON sm.id = s.summoned_monster_id
    LEFT JOIN pets pet_lookup ON lower(pet_lookup.name) = lower(s.pet_prefab_name)
    WHERE s.id = ?`,
    [params.id],
  );

  if (!skillRaw) {
    throw error(404, `Skill not found: ${params.id}`);
  }

  const playerClasses: string[] = skillRaw.player_classes
    ? JSON.parse(skillRaw.player_classes as string)
    : [];

  // Parse granted_by_items and fetch item names
  const grantedByItemsRaw: Array<{
    item_id: string;
    type: string;
    probability?: number;
  }> = skillRaw.granted_by_items
    ? JSON.parse(skillRaw.granted_by_items as string)
    : [];

  let grantedByItems: SkillItemSource[] = [];
  if (grantedByItemsRaw.length > 0) {
    const itemIds = grantedByItemsRaw.map((i) => i.item_id);
    const placeholders = itemIds.map(() => "?").join(",");
    const itemInfo = query<{ id: string; name: string }>(
      `SELECT id, name FROM items WHERE id IN (${placeholders})`,
      itemIds,
    );
    const nameMap = new Map(itemInfo.map((i) => [i.id, i.name]));

    grantedByItems = grantedByItemsRaw.map((item) => ({
      item_id: item.item_id,
      item_name: nameMap.get(item.item_id) || item.item_id,
      type: item.type,
      probability: item.probability,
    }));
  }

  const skill: SkillDetailView = {
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
      | string
      | null,
    prerequisite2_level: (skillRaw.prerequisite2_level as number) || 0,

    // Weapon requirements
    required_weapon_category: skillRaw.required_weapon_category as
      | string
      | null,
    required_weapon_category2: skillRaw.required_weapon_category2 as
      | string
      | null,

    // Flags
    is_spell: Boolean(skillRaw.is_spell),
    is_veteran: Boolean(skillRaw.is_veteran),
    is_pet_skill: Boolean(skillRaw.is_pet_skill),
    is_mercenary_skill: Boolean(skillRaw.is_mercenary_skill),
    is_scroll: Boolean(skillRaw.is_scroll),
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

    // Damage
    damage: parseLinear(skillRaw.damage),
    damage_percent: parseLinear(skillRaw.damage_percent),
    damage_type: skillRaw.damage_type as string | null,
    lifetap_percent: parseLinear(skillRaw.lifetap_percent),
    aggro: parseLinear(skillRaw.aggro),
    break_armor_prob: (skillRaw.break_armor_prob as number) || 0,
    is_assassination_skill: Boolean(skillRaw.is_assassination_skill),
    is_manaburn_skill: Boolean(skillRaw.is_manaburn_skill),

    // Healing
    heals_health: parseLinear(skillRaw.heals_health),
    heals_mana: parseLinear(skillRaw.heals_mana),
    can_heal_self: Boolean(skillRaw.can_heal_self),
    can_heal_others: Boolean(skillRaw.can_heal_others),

    // Crowd control (LinearValue — stored as JSON TEXT in DB)
    stun_chance: parseLinear(skillRaw.stun_chance),
    stun_time: parseLinear(skillRaw.stun_time),
    fear_chance: parseLinear(skillRaw.fear_chance),
    fear_time: parseLinear(skillRaw.fear_time),
    knockback_chance: parseLinear(skillRaw.knockback_chance),

    // Buff duration
    duration_base: (skillRaw.duration_base as number) || 0,
    duration_per_level: (skillRaw.duration_per_level as number) || 0,

    // Buff targeting
    can_buff_self: Boolean(skillRaw.can_buff_self),
    can_buff_others: Boolean(skillRaw.can_buff_others),
    buff_category: skillRaw.buff_category as string | null,

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
    accuracy_bonus: parseLinear(skillRaw.accuracy_bonus),
    block_chance_bonus: parseLinear(skillRaw.block_chance_bonus),
    fear_resist_chance_bonus: parseLinear(skillRaw.fear_resist_chance_bonus),
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
    is_mana_shield: Boolean(skillRaw.is_mana_shield),
    is_cleanse: Boolean(skillRaw.is_cleanse),
    is_dispel: Boolean(skillRaw.is_dispel),
    is_blindness: Boolean(skillRaw.is_blindness),
    is_enrage: Boolean(skillRaw.is_enrage),
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
    prob_ignore_cleanse: (skillRaw.prob_ignore_cleanse as number) || 0,

    // Summon fields
    summoned_monster_id: skillRaw.summoned_monster_id as string | null,
    summoned_monster_name: skillRaw.summoned_monster_name as string | null,
    summoned_monster_level: skillRaw.summoned_monster_level as number | null,
    summon_count_per_cast: skillRaw.summon_count_per_cast as number | null,
    max_active_summons: skillRaw.max_active_summons as number | null,
    pet_prefab_name: skillRaw.pet_prefab_name as string | null,
    pet_id: skillRaw.pet_id as string | null,
    pet_name: skillRaw.pet_name as string | null,
    is_familiar: Boolean(skillRaw.is_familiar),

    // AoE fields
    affects_random_target: Boolean(skillRaw.affects_random_target),
    area_object_size: (skillRaw.area_object_size as number) || 0,
    area_objects_to_spawn: (skillRaw.area_objects_to_spawn as number) || 0,
  };

  // Get monsters that use this skill
  const usedByMonsters = query<SkillMonster>(
    `SELECT
      m.id, m.name, m.level_min, m.level_max,
      m.is_boss, m.is_elite, m.is_fabled
    FROM monster_skills ms
    JOIN monsters m ON m.id = ms.monster_id
    WHERE ms.skill_id = ?
    ORDER BY m.is_boss DESC, m.is_elite DESC, m.level_min DESC, m.name`,
    [params.id],
  );

  // Get pets/mercenaries that use this skill
  const usedByPets = query<SkillPet>(
    `SELECT DISTINCT p.id, p.name, p.is_mercenary
    FROM pet_skills ps
    JOIN pets p ON p.id = ps.pet_id
    WHERE ps.skill_id = ?
    ORDER BY p.name`,
    [params.id],
  );

  // Compute effect summary using formatSkillEffect
  const effectSummary = formatSkillEffect(skill);

  // Generate description
  const typeLabel = skill.skill_type.replace(/_/g, " ");
  const classNames =
    skill.player_classes.length > 0
      ? skill.player_classes.join(", ")
      : "all classes";
  const description = `${skill.name} - ${typeLabel} skill for ${classNames} in Ancient Kingdoms.`;

  return {
    skill,
    effectSummary,
    grantedByItems,
    usedByMonsters,
    usedByPets,
    description,
  };
};
