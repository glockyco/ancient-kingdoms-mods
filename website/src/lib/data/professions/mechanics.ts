export interface SuccessTier {
  readonly constant: number;
  readonly toolFactor: number;
  readonly skillFactor: number;
}

export interface EffortlessThreshold {
  /** Skill fraction above which the listed tiers grant no profession skill. */
  readonly above: number;
  readonly throughTier: number;
}

export interface SkillGainRule {
  /** Chance = base + skillFactor × skill fraction ^ skillExponent. */
  readonly base: number;
  readonly skillFactor: number;
  readonly skillExponent?: number;
  readonly range: readonly [min: number, max: number];
  readonly divisor: number;
}

export interface ProfessionMechanics {
  readonly capPercent: number;
  readonly payoff: {
    readonly effect: string;
    readonly source: string;
  };
  readonly success?: {
    readonly floor: number;
    readonly tiers: readonly SuccessTier[];
  };
  readonly effortless?: readonly EffortlessThreshold[];
  readonly skillGain?: SkillGainRule;
  readonly procChance?: {
    readonly base: number;
    readonly skillFactor: number;
  };
  readonly damageReduction?: {
    readonly thresholdPercent: number;
    readonly skillFactor: number;
  };
  readonly startingBonus?: {
    readonly race: string;
    readonly percent: number;
  };
  readonly respawnSeconds?: readonly [min: number, max: number];
}

// Source: server-scripts/Utils.cs:GetSuccessProbAlchemy
const CRAFTING_SUCCESS_TIERS = [
  { constant: 1, toolFactor: 0, skillFactor: 0 },
  { constant: 0.4, toolFactor: 0, skillFactor: 2 },
  { constant: 0.2, toolFactor: 0, skillFactor: 1 },
  { constant: 0, toolFactor: 0, skillFactor: 1.05 },
  { constant: 0, toolFactor: 0, skillFactor: 1 },
] as const satisfies readonly SuccessTier[];

// Source: server-scripts/Utils.cs:GetSuccessProbMining
// Source: server-scripts/Utils.cs:GetSuccessProbFishing
const GATHERING_SUCCESS_TIERS = [
  { constant: 0.8, toolFactor: 1, skillFactor: 1 },
  { constant: 0.3, toolFactor: 0.2, skillFactor: 1 },
  { constant: 0, toolFactor: 0.15, skillFactor: 0.7 },
  { constant: 0, toolFactor: 0.1, skillFactor: 0.6 },
  { constant: 0, toolFactor: 0.05, skillFactor: 0.5 },
] as const satisfies readonly SuccessTier[];

// Source: server-scripts/Utils.cs:GetSuccessProbHerbalism
const HERBALISM_SUCCESS_TIERS = [
  { constant: 1, toolFactor: 0, skillFactor: 0 },
  { constant: 0.3, toolFactor: 0, skillFactor: 2 },
  { constant: 0.15, toolFactor: 0, skillFactor: 1 },
  { constant: 0, toolFactor: 0, skillFactor: 1.05 },
  { constant: 0, toolFactor: 0, skillFactor: 1 },
] as const satisfies readonly SuccessTier[];

const STANDARD_EFFORTLESS_THRESHOLDS = [
  { above: 0.25, throughTier: 0 },
  { above: 0.5, throughTier: 1 },
  { above: 0.75, throughTier: 2 },
] as const satisfies readonly EffortlessThreshold[];

// Source: server-scripts/GatherItem.cs:573-575,594-596 — both skills gain at the same rate.
const HERBALISM_MINING_SKILL_GAIN = {
  base: 0.95,
  skillFactor: -0.6,
  skillExponent: 2,
  range: [1, 3],
  divisor: 1000,
} as const satisfies SkillGainRule;

export const PROFESSION_MECHANICS = {
  alchemy: {
    capPercent: 100,
    payoff: { effect: "potion success chance", source: "alchemy recipes" },
    // Source: server-scripts/TableUI.cs:MakePotion
    success: { floor: 0.1, tiers: CRAFTING_SUCCESS_TIERS },
    // Source: server-scripts/Player.cs:UserCode_CmdMakePotion__Int32
    effortless: STANDARD_EFFORTLESS_THRESHOLDS,
    skillGain: {
      base: 0.95,
      skillFactor: -0.6,
      skillExponent: 2,
      range: [1, 3],
      divisor: 1000,
    },
  },
  cooking: {
    capPercent: 100,
    payoff: { effect: "food success chance", source: "cooking recipes" },
    // Source: server-scripts/UICraftingStation.cs:Craft
    success: { floor: 0.1, tiers: CRAFTING_SUCCESS_TIERS },
    // Source: server-scripts/Player.cs:UserCode_CmdCraftItem__NetworkIdentity__Int32
    effortless: STANDARD_EFFORTLESS_THRESHOLDS,
    skillGain: {
      base: 0.95,
      skillFactor: -0.6,
      skillExponent: 2,
      range: [1, 3],
      divisor: 3000,
    },
  },
  fishing: {
    capPercent: 100,
    payoff: { effect: "catch chance", source: "fishing spots" },
    // Source: server-scripts/GatherItem.cs:698-705,799-808 — fishing requires a 20% spot chance and grants skill only on successful spots.
    success: { floor: 0.2, tiers: GATHERING_SUCCESS_TIERS },
    effortless: STANDARD_EFFORTLESS_THRESHOLDS,
    skillGain: {
      base: 0.65,
      skillFactor: -0.55,
      skillExponent: 2,
      range: [1, 3],
      divisor: 5000,
    },
  },
  herbalism: {
    capPercent: 100,
    payoff: { effect: "plant success chance", source: "plants" },
    // Source: server-scripts/GatherItem.cs:343-350 — a harvest below 10% success is refused
    success: { floor: 0.1, tiers: HERBALISM_SUCCESS_TIERS },
    // Source: server-scripts/GatherItem.cs:567-575 — high skill excludes low-tier plants.
    effortless: STANDARD_EFFORTLESS_THRESHOLDS,
    skillGain: HERBALISM_MINING_SKILL_GAIN,
  },
  mining: {
    capPercent: 100,
    payoff: { effect: "ore success chance", source: "mineral nodes" },
    // Source: server-scripts/GatherItem.cs:OnInteractServer
    success: { floor: 0.2, tiers: GATHERING_SUCCESS_TIERS },
    effortless: STANDARD_EFFORTLESS_THRESHOLDS,
    // Source: server-scripts/GatherItem.cs:588-596 — high skill excludes low-tier minerals.
    skillGain: HERBALISM_MINING_SKILL_GAIN,
    // Source: server-scripts/Database.cs:CharacterCreate
    startingBonus: { race: "Dwarf", percent: 5 },
  },
  radiant_seeker: {
    capPercent: 100,
    payoff: { effect: "Radiant Aether chance", source: "Radiant Sparks" },
    // Source: server-scripts/GatherItem.cs:OnInteractServer
    procChance: { base: 0.05, skillFactor: 0.2 },
    // Source: server-scripts/GatherItem.cs:609-620 — gain succeeds when the random value exceeds 0.1 + skill / 2.
    skillGain: { base: 0.9, skillFactor: -0.5, range: [1, 3], divisor: 1000 },
    // Source: server-scripts/Database.cs:CharacterCreate
    startingBonus: { race: "Fire Goblin", percent: 5 },
    // Source: server-scripts/GatherItem.cs:Update
    respawnSeconds: [100, 3600],
  },
  slayer: {
    capPercent: 100,
    payoff: { effect: "damage reduction", source: "boss and elite attacks" },
    // Source: server-scripts/Combat.cs:DealDamageAt
    damageReduction: { thresholdPercent: 10, skillFactor: 0.1 },
  },
  treasure_hunter: {
    capPercent: 100,
    payoff: { effect: "relic reward chance", source: "buried treasure chests" },
    // Source: server-scripts/ChestItem.cs:Use
    procChance: { base: 0, skillFactor: 0.1 },
  },
} as const satisfies Record<string, ProfessionMechanics>;

export type ProfessionMechanicsId = keyof typeof PROFESSION_MECHANICS;

export function skillFraction(skillPercent: number): number {
  return Math.min(1, Math.max(0, skillPercent / 100));
}

export function rawTierSuccessChance(
  rule: NonNullable<ProfessionMechanics["success"]>,
  tier: number,
  skillPercent: number,
  toolQuality = 0,
): number {
  const index = Math.min(Math.max(tier, 0), rule.tiers.length - 1);
  const coefficients = rule.tiers[index];
  return Math.min(
    1,
    Math.max(
      0,
      coefficients.constant +
        coefficients.toolFactor * toolQuality +
        coefficients.skillFactor * skillFraction(skillPercent),
    ),
  );
}

export function isEffortlessAtTier(
  thresholds: readonly EffortlessThreshold[],
  tier: number,
  skillPercent: number,
): boolean {
  const skill = skillFraction(skillPercent);
  return thresholds.some(
    (threshold) => skill > threshold.above && tier <= threshold.throughTier,
  );
}

export function skillGainChance(
  rule: SkillGainRule,
  skillPercent: number,
): number {
  const skill = skillFraction(skillPercent);
  return Math.max(
    0,
    Math.min(
      1,
      rule.base + Math.pow(skill, rule.skillExponent ?? 1) * rule.skillFactor,
    ),
  );
}

export function thresholdedDamageReduction(
  rule: NonNullable<ProfessionMechanics["damageReduction"]>,
  skillPercent: number,
): number {
  if (skillPercent < rule.thresholdPercent) return 0;
  return skillFraction(skillPercent) * rule.skillFactor;
}

export function linearProcChance(
  rule: NonNullable<ProfessionMechanics["procChance"]>,
  skillPercent: number,
): number {
  return Math.min(
    1,
    Math.max(0, rule.base + skillFraction(skillPercent) * rule.skillFactor),
  );
}
