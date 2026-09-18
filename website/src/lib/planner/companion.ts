import {
  buildCasterStatSheet,
  type AttributeSet,
  type CasterStatInput,
  type CasterStatSheet,
} from "./caster";
import { addF32, iround, multiplyF32 } from "./engine-math";

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

/** Source: server-scripts/Player.cs:9994-10026. */
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

/** Source: server-scripts/Player.cs:8170-8370. */
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

/** Source: server-scripts/Player.cs:8169-8376. */
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
  /** The complete stat input the sheet was built from, for re-evaluation under timed effects. */
  casterInput: CasterStatInput;
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
 * Sources: server-scripts/Player.cs:9994-10081 and server-scripts/Energy.cs:24-35.
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
  const casterInput: CasterStatInput = {
    ...input.caster,
    kind: "companion",
    level: input.ownerLevel,
    attributes,
    curves,
    healthMultiplier,
    manaMultiplier: energyArchetype(input.archetype) ? 1 : resourceMultiplier,
    energyMultiplier: energyArchetype(input.archetype) ? resourceMultiplier : 1,
  };
  return {
    archetype: input.archetype,
    race: input.race,
    attributes,
    casterInput,
    sheet: buildCasterStatSheet(casterInput),
    healthMultiplier,
    resourceMultiplier,
    baseCombat,
    assumptions,
  };
}
