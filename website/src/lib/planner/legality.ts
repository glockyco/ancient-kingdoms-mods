import { iround } from "./engine-math";

export interface SkillGateCurve {
  base_value: number;
  bonus_per_level: number;
}

export interface AllocatableSkill {
  id: string;
  player_classes: readonly string[];
  tier: number;
  max_level: number;
  learn_default: boolean;
  is_veteran: boolean;
  level_requirement: SkillGateCurve;
  skill_point_cost: SkillGateCurve;
  required_spent_points: number;
  prerequisite_skill_id?: string | null;
  prerequisite_level: number;
  prerequisite2_skill_id?: string | null;
  prerequisite2_level: number;
}

export type SkillAllocationFailureCode =
  | "unknown_skill"
  | "wrong_class"
  | "invalid_level"
  | "veteran_before_cap"
  | "point_budget"
  | "level_requirement"
  | "spent_requirement"
  | "prerequisite"
  | "tier_limit";

export interface SkillAllocationFailure {
  code: SkillAllocationFailureCode;
  skillId?: string;
}

export interface SkillAllocationResult {
  feasible: boolean;
  levels: Readonly<Record<string, number>>;
  normalPointsSpent: number;
  veteranPointsSpent: number;
  failures: readonly SkillAllocationFailure[];
}

export interface SkillAllocationInput {
  classId: string;
  level: number;
  veteranPoints: number;
  skills: readonly AllocatableSkill[];
  requestedLevels: Readonly<Record<string, number>>;
}

const TIER_LIMITS: Readonly<Record<number, number>> = {
  1: 2,
  2: 1,
  3: 2,
  4: 1,
};

function curveAt(curve: SkillGateCurve, level: number): number {
  return curve.base_value + curve.bonus_per_level * (level - 1);
}

function baselineLevel(skill: AllocatableSkill): number {
  return skill.learn_default ? 1 : 0;
}

function tierIsOpen(
  skill: AllocatableSkill,
  levels: Readonly<Record<string, number>>,
  skills: readonly AllocatableSkill[],
): boolean {
  const limit = TIER_LIMITS[skill.tier];
  if (limit === undefined || levels[skill.id] > baselineLevel(skill))
    return true;
  let learned = 0;
  for (const candidate of skills) {
    if (candidate.tier !== skill.tier) continue;
    if (levels[candidate.id] > baselineLevel(candidate)) learned += 1;
  }
  return learned < limit;
}

function predecessorIsLearned(
  levels: Readonly<Record<string, number>>,
  id: string | null | undefined,
  requiredLevel: number,
): boolean {
  return id === null || id === undefined || (levels[id] ?? 0) >= requiredLevel;
}

/**
 * Replays skill upgrades against the same monotone gates as `PlayerSkills.CanUpgrade`.
 * Source: server-scripts/PlayerSkills.cs:480-535.
 */
export function evaluateSkillAllocation(
  input: SkillAllocationInput,
): SkillAllocationResult {
  const skillsById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const classSkills = input.skills.filter((skill) =>
    skill.player_classes.includes(input.classId),
  );
  const levels: Record<string, number> = {};
  const targets: Record<string, number> = {};
  const failures: SkillAllocationFailure[] = [];

  for (const skill of classSkills) levels[skill.id] = baselineLevel(skill);
  for (const [skillId, requestedLevel] of Object.entries(
    input.requestedLevels,
  )) {
    const skill = skillsById.get(skillId);
    if (!skill) {
      failures.push({ code: "unknown_skill", skillId });
      continue;
    }
    if (!skill.player_classes.includes(input.classId)) {
      failures.push({ code: "wrong_class", skillId });
      continue;
    }
    if (
      !Number.isInteger(requestedLevel) ||
      requestedLevel < baselineLevel(skill) ||
      requestedLevel > skill.max_level
    ) {
      failures.push({ code: "invalid_level", skillId });
      continue;
    }
    targets[skillId] = requestedLevel;
  }
  for (const skill of classSkills) targets[skill.id] ??= levels[skill.id];

  if (input.level < 50 && input.veteranPoints > 0) {
    failures.push({ code: "veteran_before_cap" });
  }
  if (failures.length > 0) {
    return {
      feasible: false,
      levels,
      normalPointsSpent: 0,
      veteranPointsSpent: 0,
      failures,
    };
  }

  const budgets = {
    normal: Math.max(0, input.level - 1),
    veteran: Math.max(0, input.veteranPoints),
  };
  let normalPointsSpent = 0;
  let veteranPointsSpent = 0;
  let upgradesRemaining = classSkills.reduce(
    (total, skill) => total + targets[skill.id] - levels[skill.id],
    0,
  );

  while (upgradesRemaining > 0) {
    let progressed = false;
    for (const skill of classSkills) {
      if (levels[skill.id] >= targets[skill.id]) continue;
      const nextLevel = levels[skill.id] + 1;
      const spent = skill.is_veteran ? veteranPointsSpent : normalPointsSpent;
      const budget = skill.is_veteran ? budgets.veteran : budgets.normal;
      const cost = curveAt(skill.skill_point_cost, nextLevel);
      if (input.level < curveAt(skill.level_requirement, nextLevel)) continue;
      if (spent < skill.required_spent_points || spent + cost > budget)
        continue;
      if (!tierIsOpen(skill, levels, classSkills)) continue;
      if (
        !predecessorIsLearned(
          levels,
          skill.prerequisite_skill_id,
          skill.prerequisite_level,
        ) ||
        !predecessorIsLearned(
          levels,
          skill.prerequisite2_skill_id,
          skill.prerequisite2_level,
        )
      ) {
        continue;
      }

      levels[skill.id] = nextLevel;
      if (skill.is_veteran) veteranPointsSpent += cost;
      else normalPointsSpent += cost;
      upgradesRemaining -= 1;
      progressed = true;
    }
    if (!progressed) break;
  }

  if (upgradesRemaining > 0) {
    for (const skill of classSkills) {
      if (levels[skill.id] >= targets[skill.id]) continue;
      const nextLevel = levels[skill.id] + 1;
      const spent = skill.is_veteran ? veteranPointsSpent : normalPointsSpent;
      const budget = skill.is_veteran ? budgets.veteran : budgets.normal;
      const cost = curveAt(skill.skill_point_cost, nextLevel);
      let code: SkillAllocationFailureCode;
      if (input.level < curveAt(skill.level_requirement, nextLevel))
        code = "level_requirement";
      else if (spent + cost > budget) code = "point_budget";
      else if (spent < skill.required_spent_points) code = "spent_requirement";
      else if (!tierIsOpen(skill, levels, classSkills)) code = "tier_limit";
      else code = "prerequisite";
      failures.push({ code, skillId: skill.id });
    }
  }

  return {
    feasible: failures.length === 0,
    levels,
    normalPointsSpent,
    veteranPointsSpent,
    failures,
  };
}

export interface SkillWeaponState {
  classId: string;
  equippedWeaponCategory: string;
  mainHandOccupied: boolean;
  offhandOccupied: boolean;
}

/** Source: server-scripts/ScriptableSkill.cs:84-120. */
export function weaponGateRefusal(
  weapon: SkillWeaponState,
  requiredWeaponCategory: string,
): string | null {
  if (requiredWeaponCategory.trim().length === 0) return null;
  if (requiredWeaponCategory === "Bow" || requiredWeaponCategory === "Shield") {
    return weapon.offhandOccupied ? null : `requires ${requiredWeaponCategory}`;
  }
  if (weapon.classId === "rogue" && !weapon.mainHandOccupied)
    return "requires an occupied main hand";
  return weapon.equippedWeaponCategory.startsWith(requiredWeaponCategory)
    ? null
    : `requires ${requiredWeaponCategory}`;
}

export interface ActionGateSkill {
  id: string;
  requiredWeaponCategory: string;
  allowDungeon: boolean;
  isAssassination: boolean;
  manaCost: number;
  energyCost: number;
}

export interface ActionGateState {
  learnedLevel: number;
  casterHealth: number;
  casterMana: number;
  casterEnergy: number;
  inDungeon: boolean;
  weapon: SkillWeaponState;
  targetHealth: number;
  targetMaximumHealth: number;
}

export type ActionGateFailureCode =
  | "not_learned"
  | "caster_dead"
  | "mana"
  | "energy"
  | "dungeon"
  | "weapon"
  | "target_dead"
  | "assassination_health";

/**
 * Applies the exported preconditions that the engine checks before a cast.
 * Sources: server-scripts/ScriptableSkill.cs:181-239 and server-scripts/PlayerSkills.cs:126-138.
 */
export function actionGateRefusal(
  skill: ActionGateSkill,
  state: ActionGateState,
): ActionGateFailureCode | null {
  if (state.learnedLevel <= 0) return "not_learned";
  if (state.casterHealth <= 0) return "caster_dead";
  if (state.casterMana < skill.manaCost) return "mana";
  if (state.casterEnergy < skill.energyCost) return "energy";
  if (!skill.allowDungeon && state.inDungeon) return "dungeon";
  if (weaponGateRefusal(state.weapon, skill.requiredWeaponCategory) !== null)
    return "weapon";
  if (skill.isAssassination) {
    if (state.targetHealth <= 0) return "target_dead";
    if (state.targetHealth > iround(state.targetMaximumHealth / 4))
      return "assassination_health";
  }
  return null;
}
