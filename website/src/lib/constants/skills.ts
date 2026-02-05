/**
 * Skill type display labels.
 * Keys are the skill_type values stored in the database.
 */
export const SKILL_TYPE_INFO: Record<string, { label: string }> = {
  area_buff: { label: "Area Buff" },
  area_damage: { label: "Area Damage" },
  area_debuff: { label: "Area Debuff" },
  area_heal: { label: "Area Heal" },
  area_object: { label: "Area Object" },
  frontal_damage: { label: "Frontal Damage" },
  frontal_projectiles: { label: "Frontal Projectiles" },
  passive: { label: "Passive" },
  summon: { label: "Summon" },
  summon_monsters: { label: "Summon Monsters" },
  target_buff: { label: "Target Buff" },
  target_damage: { label: "Target Damage" },
  target_debuff: { label: "Target Debuff" },
  target_heal: { label: "Target Heal" },
  target_projectile: { label: "Target Projectile" },
};

/**
 * Derive the display category for a skill.
 * Priority order: first match wins.
 */
export function deriveSkillCategory(skill: {
  is_veteran: number;
  is_pet_skill: number;
  is_mercenary_skill: number;
  player_classes: string;
}): string {
  if (skill.is_veteran === 1) return "Veteran";
  if (skill.is_pet_skill === 1) return "Pet";
  if (skill.is_mercenary_skill === 1) return "Mercenary";
  const classes = JSON.parse(skill.player_classes) as string[];
  if (classes.length > 0) return "Class";
  return "NPC/Monster";
}

/** Category options for the faceted filter. */
export const CATEGORY_OPTIONS = [
  { value: "Class", label: "Class" },
  { value: "Veteran", label: "Veteran" },
  { value: "Pet", label: "Pet" },
  { value: "Mercenary", label: "Mercenary" },
  { value: "NPC/Monster", label: "NPC/Monster" },
];

/**
 * Derive display tags from a skill's flags and fields.
 * CC/heal fields are pre-extracted as numeric base_values by the SQL query.
 */
export function deriveSkillTags(skill: {
  is_spell: number;
  stun_chance_base: number | null;
  fear_chance_base: number | null;
  knockback_chance_base: number | null;
  heals_health_base: number | null;
  is_resurrect_skill: number;
  is_invisibility: number;
  is_cleanse: number;
  is_dispel: number;
  is_mana_shield: number;
  is_stance: number;
  is_enrage: number;
  skill_type: string;
}): string[] {
  const tags: string[] = [];
  if (skill.is_spell === 1) tags.push("Spell");
  if (skill.stun_chance_base != null && skill.stun_chance_base !== 0)
    tags.push("Stun");
  if (skill.fear_chance_base != null && skill.fear_chance_base !== 0)
    tags.push("Fear");
  if (skill.knockback_chance_base != null && skill.knockback_chance_base !== 0)
    tags.push("Knockback");
  if (skill.heals_health_base != null && skill.heals_health_base !== 0)
    tags.push("Heal");
  if (skill.is_resurrect_skill === 1) tags.push("Resurrect");
  if (skill.is_invisibility === 1) tags.push("Invisibility");
  if (skill.is_cleanse === 1) tags.push("Cleanse");
  if (skill.is_dispel === 1) tags.push("Dispel");
  if (skill.is_mana_shield === 1) tags.push("Mana Shield");
  if (skill.is_stance === 1) tags.push("Stance");
  if (skill.is_enrage === 1) tags.push("Enrage");
  if (skill.skill_type.startsWith("summon")) tags.push("Summon");
  if (skill.skill_type.startsWith("area_")) tags.push("AoE");
  return tags;
}

/**
 * Labels for skill item source types.
 * Used by the "Granted By Items" card on the detail page.
 */
export const ITEM_SOURCE_TYPE_LABELS: Record<string, string> = {
  scroll: "Scroll",
  potion_buff: "Potion",
  food_buff: "Food",
  relic_buff: "Relic",
  weapon_proc: "Weapon Proc",
};
