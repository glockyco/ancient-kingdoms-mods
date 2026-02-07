import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type {
  SkillDetailView,
  SkillItemSource,
  LinearValue,
} from "$lib/types/skills";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const skills = db.prepare("SELECT id FROM skills").all() as Array<{
    id: string;
  }>;
  db.close();

  return skills.map((skill) => ({ id: skill.id }));
};

function parseLinear(value: string | null): LinearValue | null {
  if (!value) return null;
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
  grantedByItems: SkillItemSource[];
  description: string;
}

export const load: PageServerLoad = ({ params }): SkillDetailPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const skillRaw = db
    .prepare(
      `
      SELECT
        s.*,
        ps.name as prerequisite_skill_name
      FROM skills s
      LEFT JOIN skills ps ON ps.id = s.prerequisite_skill_id
      WHERE s.id = ?
    `,
    )
    .get(params.id) as
    | (Record<string, unknown> & { prerequisite_skill_name: string | null })
    | undefined;

  if (!skillRaw) {
    db.close();
    throw error(404, `Skill not found: ${params.id}`);
  }

  // Parse player_classes JSON
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
    const itemInfo = db
      .prepare(`SELECT id, name FROM items WHERE id IN (${placeholders})`)
      .all(...itemIds) as Array<{ id: string; name: string }>;
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

    // Prerequisite
    prerequisite_skill_id: skillRaw.prerequisite_skill_id as string | null,
    prerequisite_skill_name: skillRaw.prerequisite_skill_name,
    prerequisite_level: (skillRaw.prerequisite_level as number) || 0,

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
    base_skill: Boolean(skillRaw.base_skill),
    learn_default: Boolean(skillRaw.learn_default),
    allow_dungeon: Boolean(skillRaw.allow_dungeon ?? true),
    is_mana_shield: Boolean(skillRaw.is_mana_shield),

    // Costs and timing
    mana_cost: parseLinear(skillRaw.mana_cost as string | null),
    energy_cost: parseLinear(skillRaw.energy_cost as string | null),
    cooldown: parseLinear(skillRaw.cooldown as string | null),
    cast_time: parseLinear(skillRaw.cast_time as string | null),
    cast_range: parseLinear(skillRaw.cast_range as string | null),

    // Damage
    damage: parseLinear(skillRaw.damage as string | null),
    damage_percent: parseLinear(skillRaw.damage_percent as string | null),
    damage_type: skillRaw.damage_type as string | null,
    lifetap_percent: (skillRaw.lifetap_percent as number) || 0,
    aggro: parseLinear(skillRaw.aggro as string | null),

    // Healing
    heals_health: parseLinear(skillRaw.heals_health as string | null),
    heals_mana: parseLinear(skillRaw.heals_mana as string | null),
    can_heal_self: Boolean(skillRaw.can_heal_self),
    can_heal_others: Boolean(skillRaw.can_heal_others),

    // Crowd control (simple numbers, not LinearValue)
    stun_chance: (skillRaw.stun_chance as number) || 0,
    stun_time: (skillRaw.stun_time as number) || 0,
    fear_chance: (skillRaw.fear_chance as number) || 0,
    fear_time: (skillRaw.fear_time as number) || 0,
    knockback_chance: (skillRaw.knockback_chance as number) || 0,

    // Buff duration
    duration_base: (skillRaw.duration_base as number) || 0,
    duration_per_level: (skillRaw.duration_per_level as number) || 0,

    // Buff stat bonuses
    health_max_bonus: parseLinear(skillRaw.health_max_bonus as string | null),
    health_max_percent_bonus: parseLinear(
      skillRaw.health_max_percent_bonus as string | null,
    ),
    mana_max_bonus: parseLinear(skillRaw.mana_max_bonus as string | null),
    mana_max_percent_bonus: parseLinear(
      skillRaw.mana_max_percent_bonus as string | null,
    ),
    energy_max_bonus: parseLinear(skillRaw.energy_max_bonus as string | null),
    defense_bonus: parseLinear(skillRaw.defense_bonus as string | null),
    magic_resist_bonus: parseLinear(
      skillRaw.magic_resist_bonus as string | null,
    ),
    damage_bonus: parseLinear(skillRaw.damage_bonus as string | null),
    damage_percent_bonus: parseLinear(
      skillRaw.damage_percent_bonus as string | null,
    ),
    magic_damage_bonus: parseLinear(
      skillRaw.magic_damage_bonus as string | null,
    ),
    magic_damage_percent_bonus: parseLinear(
      skillRaw.magic_damage_percent_bonus as string | null,
    ),
    haste_bonus: parseLinear(skillRaw.haste_bonus as string | null),
    spell_haste_bonus: parseLinear(skillRaw.spell_haste_bonus as string | null),
    speed_bonus: parseLinear(skillRaw.speed_bonus as string | null),
    critical_chance_bonus: parseLinear(
      skillRaw.critical_chance_bonus as string | null,
    ),
    accuracy_bonus: parseLinear(skillRaw.accuracy_bonus as string | null),
    block_chance_bonus: parseLinear(
      skillRaw.block_chance_bonus as string | null,
    ),
    damage_shield: parseLinear(skillRaw.damage_shield as string | null),
    cooldown_reduction_percent: parseLinear(
      skillRaw.cooldown_reduction_percent as string | null,
    ),
    heal_on_hit_percent: parseLinear(
      skillRaw.heal_on_hit_percent as string | null,
    ),

    // Regen bonuses
    healing_per_second_bonus: parseLinear(
      skillRaw.healing_per_second_bonus as string | null,
    ),
    health_percent_per_second_bonus: parseLinear(
      skillRaw.health_percent_per_second_bonus as string | null,
    ),
    mana_per_second_bonus: parseLinear(
      skillRaw.mana_per_second_bonus as string | null,
    ),
    mana_percent_per_second_bonus: parseLinear(
      skillRaw.mana_percent_per_second_bonus as string | null,
    ),
    energy_per_second_bonus: parseLinear(
      skillRaw.energy_per_second_bonus as string | null,
    ),
    energy_percent_per_second_bonus: parseLinear(
      skillRaw.energy_percent_per_second_bonus as string | null,
    ),

    // Resist bonuses
    poison_resist_bonus: parseLinear(
      skillRaw.poison_resist_bonus as string | null,
    ),
    fire_resist_bonus: parseLinear(skillRaw.fire_resist_bonus as string | null),
    cold_resist_bonus: parseLinear(skillRaw.cold_resist_bonus as string | null),
    disease_resist_bonus: parseLinear(
      skillRaw.disease_resist_bonus as string | null,
    ),

    // Attribute bonuses
    strength_bonus: parseLinear(skillRaw.strength_bonus as string | null),
    intelligence_bonus: parseLinear(
      skillRaw.intelligence_bonus as string | null,
    ),
    dexterity_bonus: parseLinear(skillRaw.dexterity_bonus as string | null),
    constitution_bonus: parseLinear(
      skillRaw.constitution_bonus as string | null,
    ),
    wisdom_bonus: parseLinear(skillRaw.wisdom_bonus as string | null),
    charisma_bonus: parseLinear(skillRaw.charisma_bonus as string | null),

    // Special flags
    is_resurrect_skill: Boolean(skillRaw.is_resurrect_skill),
    is_balance_health: Boolean(skillRaw.is_balance_health),
    is_invisibility: Boolean(skillRaw.is_invisibility),
    is_cleanse: Boolean(skillRaw.is_cleanse),
    is_dispel: Boolean(skillRaw.is_dispel),
  };

  db.close();

  // Generate description
  const typeLabel = skill.skill_type.replace(/_/g, " ");
  const classNames =
    skill.player_classes.length > 0
      ? skill.player_classes.join(", ")
      : "all classes";
  const description = `${skill.name} - ${typeLabel} skill for ${classNames} in Ancient Kingdoms.`;

  return {
    skill,
    grantedByItems,
    description,
  };
};
