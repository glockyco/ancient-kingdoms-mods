import { buildCasterStatSheet, type CasterStatSheet } from "../caster";
import { resolveEffectSpec, resolveLogicalBuild } from "../catalog-resolver";
import type { EffectSpec } from "../effects";
import { resourceRecoveryPerTick } from "../resource";
import { compareExact, type QuantityResult } from "./comparison";
import type { FixtureRecord, ObservationRecord } from "./corpus";

interface ObservedSheet {
  attributes: Record<string, number>;
  combat: Record<string, number>;
  resources: Record<string, number>;
  activeEffects: { skillId: string | null; name: string; level: number }[];
}

function numberRecord(value: unknown, path: string): Record<string, number> {
  if (typeof value !== "object" || value === null)
    throw new TypeError(`${path} must be an object of numbers`);
  const record: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "number")
      throw new TypeError(`${path}.${key} must be a number`);
    record[key] = entry;
  }
  return record;
}

function activeEffects(value: unknown): ObservedSheet["activeEffects"] {
  if (!Array.isArray(value))
    throw new TypeError("activeEffects must be an array");
  return value.map((entry, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("name" in entry) ||
      !("level" in entry)
    )
      throw new TypeError(`activeEffects[${index}] lacks a name or level`);
    const skillId =
      "skillId" in entry && typeof entry.skillId === "string"
        ? entry.skillId
        : null;
    if (typeof entry.name !== "string" || typeof entry.level !== "number")
      throw new TypeError(
        `activeEffects[${index}] has a malformed name or level`,
      );
    return { skillId, name: entry.name, level: entry.level };
  });
}

/** Narrows one stat-sheet reading to the fields the comparison reads. */
function parseObservedSheet(sample: unknown): ObservedSheet {
  if (
    typeof sample !== "object" ||
    sample === null ||
    !("sheet" in sample) ||
    !("activeEffects" in sample)
  )
    throw new TypeError("statSheet sample lacks a sheet or its active effects");
  const sheet = sample.sheet;
  if (typeof sheet !== "object" || sheet === null || !("character" in sheet))
    throw new TypeError("statSheet sample has no character");
  const character = sheet.character;
  if (
    typeof character !== "object" ||
    character === null ||
    !("attributes" in character) ||
    !("combat" in character) ||
    !("resources" in character)
  )
    throw new TypeError(
      "statSheet character lacks attributes, combat, or resources",
    );
  return {
    attributes: numberRecord(character.attributes, "character.attributes"),
    combat: numberRecord(character.combat, "character.combat"),
    resources: numberRecord(character.resources, "character.resources"),
    activeEffects: activeEffects(sample.activeEffects),
  };
}

const COMBAT_FIELDS: ReadonlyArray<[string, keyof CasterStatSheet]> = [
  ["damage", "damage"],
  ["magicDamage", "magicDamage"],
  ["defense", "defense"],
  ["magicResist", "magicResist"],
  ["poisonResist", "poisonResist"],
  ["fireResist", "fireResist"],
  ["coldResist", "coldResist"],
  ["diseaseResist", "diseaseResist"],
  ["accuracy", "accuracy"],
  ["blockChance", "blockChance"],
  ["criticalChance", "criticalChance"],
  ["criticalResist", "criticalResist"],
  ["haste", "haste"],
  ["spellHaste", "spellHaste"],
];

const ATTRIBUTES = [
  "strength",
  "constitution",
  "dexterity",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

/** Compares every stat-sheet field the engine derives with the value the game reported. */
export function compareTierA(
  fixture: FixtureRecord,
  catalog: unknown,
  observation: ObservationRecord,
): QuantityResult[] {
  const measurement = observation.observation.measurements.find(
    (entry) => entry.quantity === "statSheet",
  );
  if (!measurement || measurement.samples.length !== 1) {
    return [
      {
        quantity: "statSheet",
        status: "fail",
        detail: "the observation holds no single stat-sheet reading",
      },
    ];
  }
  const observed = parseObservedSheet(measurement.samples[0]);
  const resolved = resolveLogicalBuild(fixture.buildData, catalog);
  const results: QuantityResult[] = [];

  // The game applies effects the fixture never declared, such as the rest buff it refreshes out
  // of combat. The sheet is compared under the effects the reading reports, and an effect the
  // catalog cannot resolve fails the comparison instead of being ignored.
  const effects: EffectSpec[] = [];
  for (const effect of observed.activeEffects) {
    if (effect.skillId === null) {
      results.push({
        quantity: `activeEffects.${effect.name}`,
        status: "fail",
        detail: "the observed effect carries no skill identifier",
      });
      continue;
    }
    try {
      effects.push(resolveEffectSpec(catalog, effect.skillId, effect.level));
    } catch (error) {
      results.push({
        quantity: `activeEffects.${effect.skillId}`,
        status: "fail",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const base = resolved.player.caster;
  const sheet = buildCasterStatSheet({
    ...base,
    bonusSources: [
      ...(base.bonusSources ?? []),
      ...effects.map((effect) => effect.bonuses),
    ],
    damagePercentBuffs: [
      ...(base.damagePercentBuffs ?? []),
      ...effects.map((effect) => effect.damagePercent),
    ],
    magicDamagePercentBuffs: [
      ...(base.magicDamagePercentBuffs ?? []),
      ...effects.map((effect) => effect.magicDamagePercent),
    ],
  });

  for (const attribute of ATTRIBUTES) {
    results.push(
      compareExact(
        `attributes.${attribute}`,
        sheet.attributes[attribute],
        observed.attributes[attribute],
      ),
    );
  }
  for (const [observedField, sheetField] of COMBAT_FIELDS) {
    results.push(
      compareExact(
        `combat.${observedField}`,
        sheet[sheetField] as number,
        observed.combat[observedField],
      ),
    );
  }
  results.push(
    compareExact(
      "resources.healthMax",
      sheet.health,
      observed.resources.healthMax,
    ),
  );
  results.push(
    compareExact("resources.manaMax", sheet.mana, observed.resources.manaMax),
  );
  results.push(
    compareExact(
      "resources.energyMax",
      sheet.energy,
      observed.resources.energyMax,
    ),
  );

  const { resourceKind, resourceRecovery } = resolved.player;
  const recovery = resourceRecoveryPerTick({
    base: resourceRecovery.base,
    passivePercent:
      resourceKind === "mana"
        ? resourceRecovery.manaPassivePercent
        : resourceRecovery.energyPassivePercent,
    buffPercent: effects.reduce(
      (total, effect) =>
        total +
        (resourceKind === "mana"
          ? effect.manaRecoveryPercent
          : effect.energyRecoveryPercent),
      0,
    ),
    flatBonus:
      resourceRecovery.equipmentFlat +
      effects.reduce(
        (total, effect) =>
          total +
          (resourceKind === "mana"
            ? effect.manaRecoveryFlat
            : effect.energyRecoveryFlat),
        0,
      ),
    maximum: resourceKind === "mana" ? sheet.mana : sheet.energy,
  });
  results.push(
    compareExact(
      `resources.${resourceKind}RecoveryRate`,
      recovery,
      observed.resources[`${resourceKind}RecoveryRate`],
    ),
  );
  return results;
}
