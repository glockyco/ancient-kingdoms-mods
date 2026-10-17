import { rankInput } from "$lib/calculation/inputs";
import type { CalculationInput } from "$lib/types/calculation";
import type { Caster, SkillDetailView } from "$lib/types/skills";

// Source: server-scripts/PetSkills.cs:RefreshSkillLevels — the example's level and total veteran points determine the mercenary rank before the skill cap.
export function casterRankInputs(
  maxRank: number,
  mercenary = false,
): CalculationInput[] {
  if (maxRank <= 1) return [];
  const input = rankInput(maxRank);
  return [{ ...input, value: mercenary ? Math.min(maxRank, 12) : input.value }];
}

// Source: server-scripts/PetSkills.cs:RefreshSkillLevels; MonsterSkills.cs:OnStartServer; Skill.cs:Skill - each caster has its own rank rule.
export function fixedCasterExampleRank(
  skill: Pick<SkillDetailView, "max_level" | "learn_default">,
  caster: Caster,
  level = 50,
  veteran = 0,
): number | undefined {
  switch (caster.kind) {
    case "companion":
      return Math.min(skill.max_level, Math.max(1, Math.trunc(veteran / 10)));
    case "familiar":
      return Math.min(skill.max_level, level);
    case "monster":
      return skill.learn_default ? 1 : 0;
    default:
      return undefined;
  }
}
