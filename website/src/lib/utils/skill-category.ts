interface CategorizedSkill {
  base_skill: boolean | number;
  is_veteran: boolean | number;
  tier: number;
  class_skill_position: number;
}

export function getSkillCategoryKey(
  skill: CategorizedSkill,
  lastTierPosition: number,
): string {
  if (skill.base_skill) return "Base";
  if (skill.is_veteran) return "Veteran";
  if (
    skill.tier === 0 &&
    skill.class_skill_position > lastTierPosition &&
    skill.class_skill_position < 18
  )
    return "Mastery";
  if (skill.class_skill_position >= 18) return "Utility";
  if (skill.tier === 0) return "Core";
  return `Tier ${skill.tier}`;
}
