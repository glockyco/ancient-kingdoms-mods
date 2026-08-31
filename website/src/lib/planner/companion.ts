import {
  buildCasterStatSheet,
  type AttributeSet,
  type CasterStatInput,
  type CasterStatSheet,
} from "./caster";
import { addF32, iround, multiplyF32 } from "./engine-math";
import { effectiveSkillCooldown } from "./timing";

export type CompanionArchetype =
  "warrior" | "ranger" | "cleric" | "rogue" | "wizard" | "druid";
export type CompanionRace =
  | "human"
  | "elf"
  | "dwarf"
  | "dark_elf"
  | "fire_goblin"
  | "felarii"
  | "drassar";

interface HireRange {
  healthMaximum: number;
  energyMaximum: number;
  manaMaximum: number;
  combatFactor: number;
}

const HIRE_RANGES: Readonly<Record<CompanionRace, HireRange>> = {
  human: {
    healthMaximum: 1,
    energyMaximum: 1,
    manaMaximum: 1,
    combatFactor: 0.9,
  },
  elf: {
    healthMaximum: 0.95,
    energyMaximum: 0.95,
    manaMaximum: 1.05,
    combatFactor: 0.7,
  },
  dwarf: {
    healthMaximum: 1.05,
    energyMaximum: 1.05,
    manaMaximum: 0.95,
    combatFactor: 0.7,
  },
  dark_elf: {
    healthMaximum: 0.95,
    energyMaximum: 0.95,
    manaMaximum: 1.05,
    combatFactor: 0.9,
  },
  fire_goblin: {
    healthMaximum: 1,
    energyMaximum: 1.05,
    manaMaximum: 0.95,
    combatFactor: 0.9,
  },
  felarii: {
    healthMaximum: 0.95,
    energyMaximum: 1.05,
    manaMaximum: 0.95,
    combatFactor: 0.95,
  },
  drassar: {
    healthMaximum: 1,
    energyMaximum: 1.05,
    manaMaximum: 0.95,
    combatFactor: 0.95,
  },
};

const ATTRIBUTE_CADENCE: Readonly<
  Record<CompanionArchetype, Readonly<Record<keyof AttributeSet, number>>>
> = {
  warrior: {
    strength: 3,
    constitution: 2,
    dexterity: 4,
    intelligence: 5,
    wisdom: 6,
    charisma: 6,
  },
  ranger: {
    strength: 4,
    constitution: 3,
    dexterity: 2,
    intelligence: 6,
    wisdom: 5,
    charisma: 6,
  },
  cleric: {
    strength: 5,
    constitution: 4,
    dexterity: 6,
    intelligence: 3,
    wisdom: 2,
    charisma: 6,
  },
  rogue: {
    strength: 3,
    constitution: 4,
    dexterity: 2,
    intelligence: 5,
    wisdom: 6,
    charisma: 6,
  },
  wizard: {
    strength: 6,
    constitution: 5,
    dexterity: 3,
    intelligence: 2,
    wisdom: 4,
    charisma: 6,
  },
  druid: {
    strength: 6,
    constitution: 5,
    dexterity: 4,
    intelligence: 3,
    wisdom: 2,
    charisma: 6,
  },
};

function energyArchetype(archetype: CompanionArchetype): boolean {
  return archetype === "warrior" || archetype === "rogue";
}

/** Source: server-scripts/PetSkills.cs:27-41. */
export function companionSkillLevel(
  ownerLevel: number,
  veteranPoints: number,
  maximum: number,
): number {
  if (!Number.isInteger(ownerLevel) || ownerLevel < 1)
    throw new RangeError("ownerLevel must be a positive integer");
  if (!Number.isInteger(veteranPoints) || veteranPoints < 0) {
    throw new RangeError("veteranPoints must be a non-negative integer");
  }
  if (!Number.isInteger(maximum) || maximum < 0)
    throw new RangeError("maximum must be a non-negative integer");
  return Math.min(
    maximum,
    Math.floor(ownerLevel / 5) + Math.floor(veteranPoints / 10),
  );
}

/** Source: server-scripts/Player.cs:7980-8187. */
export function companionProgressionAttributes(
  archetype: CompanionArchetype,
  ownerLevel: number,
  base: Partial<AttributeSet> = {},
): AttributeSet {
  if (!Number.isInteger(ownerLevel) || ownerLevel < 1)
    throw new RangeError("ownerLevel must be a positive integer");
  const cadence = ATTRIBUTE_CADENCE[archetype];
  return {
    strength: (base.strength ?? 0) + Math.floor(ownerLevel / cadence.strength),
    constitution:
      (base.constitution ?? 0) + Math.floor(ownerLevel / cadence.constitution),
    dexterity:
      (base.dexterity ?? 0) + Math.floor(ownerLevel / cadence.dexterity),
    intelligence:
      (base.intelligence ?? 0) + Math.floor(ownerLevel / cadence.intelligence),
    wisdom: (base.wisdom ?? 0) + Math.floor(ownerLevel / cadence.wisdom),
    charisma: (base.charisma ?? 0) + Math.floor(ownerLevel / cadence.charisma),
  };
}

export type CompanionRoll =
  | { mode: "best" }
  | {
      mode: "owned";
      healthMultiplier: number;
      resourceMultiplier: number;
      baseCombat: number;
    };

export interface CompanionStateInput {
  archetype: CompanionArchetype;
  race: CompanionRace;
  ownerLevel: number;
  veteranPoints: number;
  roll: CompanionRoll;
  baseAttributes?: Partial<AttributeSet>;
  caster: Omit<
    CasterStatInput,
    | "kind"
    | "level"
    | "attributes"
    | "healthMultiplier"
    | "manaMultiplier"
    | "energyMultiplier"
  >;
}

export interface CompanionCombatState {
  archetype: CompanionArchetype;
  race: CompanionRace;
  attributes: AttributeSet;
  sheet: CasterStatSheet;
  healthMultiplier: number;
  resourceMultiplier: number;
  baseCombat: number;
  assumptions: readonly (
    | "best_rehire_roll"
    | "owned_roll"
    | "new_hire_base_combat"
    | "energy_multiplier_ignored"
  )[];
}

function requirePositive(value: number, path: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${path} must be finite and positive`);
  return value;
}

/**
 * Builds the stat sheet for one newly hired or captured mercenary. The base combat value deliberately
 * excludes the level-up accumulation that disappears on reload.
 * Sources: server-scripts/Player.cs:9744-9839 and server-scripts/Player.cs:9971-9993.
 */
export function buildCompanionCombatState(
  input: CompanionStateInput,
): CompanionCombatState {
  if (!Number.isInteger(input.ownerLevel) || input.ownerLevel < 1) {
    throw new RangeError("ownerLevel must be a positive integer");
  }
  if (!Number.isInteger(input.veteranPoints) || input.veteranPoints < 0) {
    throw new RangeError("veteranPoints must be a non-negative integer");
  }
  const range = HIRE_RANGES[input.race];
  let healthMultiplier: number;
  let resourceMultiplier: number;
  let baseCombat: number;
  const assumptions: CompanionCombatState["assumptions"][number][] = [
    "new_hire_base_combat",
  ];
  if (input.roll.mode === "owned") {
    healthMultiplier = requirePositive(
      input.roll.healthMultiplier,
      "roll.healthMultiplier",
    );
    resourceMultiplier = requirePositive(
      input.roll.resourceMultiplier,
      "roll.resourceMultiplier",
    );
    if (!Number.isInteger(input.roll.baseCombat) || input.roll.baseCombat < 0) {
      throw new RangeError("roll.baseCombat must be a non-negative integer");
    }
    baseCombat = input.roll.baseCombat;
    assumptions.push("owned_roll");
  } else {
    const veteranMultiplier = multiplyF32(input.veteranPoints, 0.0025);
    healthMultiplier = addF32(range.healthMaximum, veteranMultiplier);
    resourceMultiplier = addF32(
      energyArchetype(input.archetype)
        ? range.energyMaximum
        : range.manaMaximum,
      veteranMultiplier,
    );
    baseCombat = Math.max(
      0,
      iround(multiplyF32(input.ownerLevel, range.combatFactor)) - 1,
    );
    assumptions.push("best_rehire_roll");
  }
  if (energyArchetype(input.archetype))
    assumptions.push("energy_multiplier_ignored");

  const attributes = companionProgressionAttributes(
    input.archetype,
    input.ownerLevel,
    input.baseAttributes,
  );
  const curves = {
    ...input.caster.curves,
    damage: { ...input.caster.curves.damage, base: baseCombat },
    magicDamage: { ...input.caster.curves.magicDamage, base: baseCombat },
  };
  const sheet = buildCasterStatSheet({
    ...input.caster,
    kind: "companion",
    level: input.ownerLevel,
    attributes,
    curves,
    healthMultiplier,
    manaMultiplier: energyArchetype(input.archetype) ? 1 : resourceMultiplier,
    energyMultiplier: energyArchetype(input.archetype) ? resourceMultiplier : 1,
  });
  return {
    archetype: input.archetype,
    race: input.race,
    attributes,
    sheet,
    healthMultiplier,
    resourceMultiplier,
    baseCombat,
    assumptions,
  };
}

export type CompanionCadenceBinding = "cooldown" | "special_selection" | "both";

export interface CompanionCadence {
  period: number;
  cooldown: number;
}

/**
 * Applies the cooldown that starts when a companion cast completes. Weapon delay is absent. Special
 * actions also pass through the shared selection gate in `expectedCompanionActions`.
 * Sources: server-scripts/Skills.cs:980-1013 and server-scripts/PetSkills.cs:78-119.
 */
export function companionActionCadence(action: {
  castTime: number;
  cooldown: number;
  followupDefaultAttack: boolean;
  isSpell: boolean;
  haste: number;
}): CompanionCadence {
  if (action.castTime < 0)
    throw new RangeError("castTime must not be negative");
  const cooldown = effectiveSkillCooldown(
    {
      cooldown: action.cooldown,
      isSpell: action.isSpell,
      followupDefaultAttack: action.followupDefaultAttack,
    },
    "companion",
    action.haste,
  );
  return {
    period: action.castTime + cooldown,
    cooldown,
  };
}

export interface CompanionAction {
  id: string;
  isDefault: boolean;
  isSpecial: boolean;
  isOffensive: boolean;
  isDebuff: boolean;
  targetAlreadyHasDebuff?: boolean;
  isWarriorChallenge?: boolean;
  ready: boolean;
  availability?: number;
  expectedDamage: number;
  castTime: number;
  cooldown: number;
  followupDefaultAttack: boolean;
  isSpell: boolean;
  haste: number;
  manaCost: number;
}

export type CompanionMovementState =
  | "in_range"
  | "closing_distance"
  | "engine_controlled"
  | "hold_position_out_of_range";

export interface CompanionActionExpectationInput {
  archetype: CompanionArchetype;
  hasHeals: boolean;
  currentMana: number;
  maximumMana: number;
  movement: CompanionMovementState;
  actions: readonly CompanionAction[];
}

export interface CompanionActionRate {
  actionId: string;
  usesPerSecond: number;
  expectedDamagePerSecond: number;
  binding: CompanionCadenceBinding;
}

export interface CompanionActionExpectation {
  actionRates: readonly CompanionActionRate[];
  exclusions: readonly {
    actionId: string;
    reason:
      "not_ready" | "not_offensive" | "existing_debuff" | "healer_reserve";
  }[];
  selectionExpectedDamagePerSecond: number;
  reachableExpectedDamagePerSecond: number | null;
  cadenceUpperDamagePerSecond: number;
  movementQualification:
    "reachable_in_range" | "movement_can_reduce_rate" | "held_out_of_range";
}

function fairSpecialRates(
  capacities: readonly number[],
  totalRate: number,
): number[] {
  const rates = capacities.map(() => 0);
  const remaining = new Set(capacities.map((_, index) => index));
  let unassigned = totalRate;
  while (remaining.size > 0 && unassigned > 0) {
    const share = unassigned / remaining.size;
    let saturated = false;
    for (const index of [...remaining]) {
      if (capacities[index] <= share) {
        rates[index] = capacities[index];
        unassigned -= capacities[index];
        remaining.delete(index);
        saturated = true;
      }
    }
    if (!saturated) {
      for (const index of remaining) rates[index] = share;
      break;
    }
  }
  return rates;
}

/**
 * Computes the in-range expectation over the engine's uniform special-action selection. Movement can
 * make that cadence unreachable, so non-stationary states return it as an upper bound.
 * Source: server-scripts/PetSkills.cs:60-119.
 */
export function expectedCompanionActions(
  input: CompanionActionExpectationInput,
): CompanionActionExpectation {
  const defaults = input.actions.filter((action) => action.isDefault);
  if (defaults.length !== 1)
    throw new RangeError("actions must contain exactly one default action");
  const exclusions: CompanionActionExpectation["exclusions"][number][] = [];
  const eligible: CompanionAction[] = [];
  for (const action of input.actions) {
    let reason:
      CompanionActionExpectation["exclusions"][number]["reason"] | null = null;
    if (!action.ready) reason = "not_ready";
    else if (!action.isDefault && !action.isOffensive) reason = "not_offensive";
    else if (action.isDebuff && action.targetAlreadyHasDebuff)
      reason = "existing_debuff";
    else if (
      input.hasHeals &&
      action.manaCost > 0 &&
      input.maximumMana > 0 &&
      input.currentMana - action.manaCost < multiplyF32(input.maximumMana, 0.35)
    ) {
      reason = "healer_reserve";
    }
    if (reason) exclusions.push({ actionId: action.id, reason });
    else eligible.push(action);
  }

  const rates = new Map<string, number>();
  const capacity = (action: CompanionAction): number => {
    const cadence = companionActionCadence(action);
    if (cadence.period <= 0)
      throw new RangeError(`${action.id} has no positive cadence gate`);
    const availability = action.availability ?? 1;
    if (
      !Number.isFinite(availability) ||
      availability < 0 ||
      availability > 1
    ) {
      throw new RangeError(
        `${action.id}.availability must be between zero and one`,
      );
    }
    return availability / cadence.period;
  };

  const priority = eligible.filter(
    (action) => input.archetype === "warrior" && action.isWarriorChallenge,
  );
  for (const action of priority) rates.set(action.id, capacity(action));
  const specials = eligible.filter(
    (action) => action.isSpecial && !action.isDefault && !rates.has(action.id),
  );
  const specialRates = fairSpecialRates(specials.map(capacity), 1 / 3);
  for (let index = 0; index < specials.length; index += 1) {
    rates.set(specials[index].id, specialRates[index]);
  }

  let occupied = 0;
  for (const action of eligible)
    occupied += (rates.get(action.id) ?? 0) * action.castTime;
  if (occupied > 1) {
    for (const [id, rate] of rates) rates.set(id, rate / occupied);
    occupied = 1;
  }
  const defaultAction = defaults[0];
  if (eligible.includes(defaultAction)) {
    const defaultCapacity = capacity(defaultAction);
    const timeCapacity =
      defaultAction.castTime > 0
        ? Math.max(0, 1 - occupied) / defaultAction.castTime
        : defaultCapacity;
    rates.set(defaultAction.id, Math.min(defaultCapacity, timeCapacity));
  }

  const selectedSpecialRate = specials.reduce(
    (total, action) => total + (rates.get(action.id) ?? 0),
    0,
  );
  const actionRates = eligible
    .map((action) => {
      const usesPerSecond = rates.get(action.id) ?? 0;
      const cooldownCapacity = capacity(action);
      let binding: CompanionCadenceBinding = "cooldown";
      if (specials.includes(action)) {
        const cooldownBinds = Math.abs(usesPerSecond - cooldownCapacity) < 1e-9;
        const selectionBinds = Math.abs(selectedSpecialRate - 1 / 3) < 1e-9;
        const everySpecialIsAtCapacity = specials.every(
          (candidate) =>
            Math.abs((rates.get(candidate.id) ?? 0) - capacity(candidate)) <
            1e-9,
        );
        binding =
          cooldownBinds && selectionBinds && everySpecialIsAtCapacity
            ? "both"
            : cooldownBinds
              ? "cooldown"
              : "special_selection";
      }
      return {
        actionId: action.id,
        usesPerSecond,
        expectedDamagePerSecond: usesPerSecond * action.expectedDamage,
        binding,
      };
    })
    .filter((rate) => rate.usesPerSecond > 0)
    .toSorted((left, right) => left.actionId.localeCompare(right.actionId));
  const selectionExpectedDamagePerSecond = actionRates.reduce(
    (total, rate) => total + rate.expectedDamagePerSecond,
    0,
  );
  if (input.movement === "hold_position_out_of_range") {
    return {
      actionRates,
      exclusions,
      selectionExpectedDamagePerSecond,
      reachableExpectedDamagePerSecond: 0,
      cadenceUpperDamagePerSecond: selectionExpectedDamagePerSecond,
      movementQualification: "held_out_of_range",
    };
  }
  const reachable =
    input.movement === "in_range" ? selectionExpectedDamagePerSecond : null;
  return {
    actionRates,
    exclusions,
    selectionExpectedDamagePerSecond,
    reachableExpectedDamagePerSecond: reachable,
    cadenceUpperDamagePerSecond: selectionExpectedDamagePerSecond,
    movementQualification:
      reachable === null ? "movement_can_reduce_rate" : "reachable_in_range",
  };
}
