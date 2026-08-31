import {
  assessBuildCompatibility,
  parseBuildEnvelope,
  type BuildEnvelope,
} from "./build-envelope";

export const SCENARIO_SCHEMA_VERSION = 1 as const;
export const SUPPORTED_TARGET_COUNT = 1 as const;
export const DEFAULT_SCENARIO_NAME = "Stationary training dummy" as const;

export type ResourceKind = "health" | "mana" | "energy";
export type DamageKind =
  "normal" | "magic" | "poison" | "fire" | "cold" | "disease";

export interface EvaluationScenario {
  schemaVersion: typeof SCENARIO_SCHEMA_VERSION;
  build: BuildEnvelope;
  name: string;
  target: {
    id: string;
    level: number;
    stationary: boolean;
    defense: number;
    magicResist: number;
    poisonResist: number;
    fireResist: number;
    coldResist: number;
    diseaseResist: number;
    blockChance: number;
    criticalResist: number;
    bossOrElite: boolean;
    immuneDebuffs: boolean;
  };
  horizonSeconds: number;
  initialResources: Array<{
    entityId: string;
    resource: ResourceKind;
    current: number;
    maximum: number;
  }>;
  initialCooldowns: Array<{
    entityId: string;
    skillId: string;
    remainingSeconds: number;
  }>;
  activeBuffs: Array<{
    sourceEntityId: string;
    targetEntityId: string;
    skillId: string;
    skillLevel: number;
    remainingSeconds: number;
  }>;
  consumables: Array<{
    entityId: string;
    itemId: string;
    quantity: number;
  }>;
  ammunition: Array<{
    entityId: string;
    itemId: string;
    quantity: number;
  }>;
  incomingEvents: Array<{
    atSeconds: number;
    targetEntityId: string;
    amount: number;
    damageType: DamageKind;
  }>;
  roster: string[];
  targetCount: number;
  durabilityLoss: false;
}

export function assertSupportedTargetCount(
  targetCount: number,
): asserts targetCount is 1 {
  if (targetCount !== SUPPORTED_TARGET_COUNT) {
    throw new RangeError(
      `Unsupported target count ${targetCount}; expected ${SUPPORTED_TARGET_COUNT}`,
    );
  }
}

export function parseEvaluationScenario(
  value: unknown,
  expectedBuild: BuildEnvelope,
): EvaluationScenario {
  const scenario = requireRecord(value, "scenario");
  const schemaVersion = requireInteger(
    scenario,
    "schemaVersion",
    "scenario.schemaVersion",
  );
  if (schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported scenario schema ${schemaVersion}; expected ${SCENARIO_SCHEMA_VERSION}`,
    );
  }

  const build = parseBuildEnvelope(scenario.build);
  const compatibility = assessBuildCompatibility(expectedBuild, build);
  if (!compatibility.comparable) {
    throw new Error(
      `Incompatible scenario version tuple: ${compatibility.reasons.join("; ")}`,
    );
  }

  const targetRecord = requireRecord(scenario.target, "scenario.target");
  const target = {
    id: requireString(targetRecord, "id", "scenario.target.id"),
    level: requirePositiveInteger(
      targetRecord,
      "level",
      "scenario.target.level",
    ),
    stationary: requireBoolean(
      targetRecord,
      "stationary",
      "scenario.target.stationary",
    ),
    defense: requireNonNegativeNumber(
      targetRecord,
      "defense",
      "scenario.target.defense",
    ),
    magicResist: requireNonNegativeNumber(
      targetRecord,
      "magicResist",
      "scenario.target.magicResist",
    ),
    poisonResist: requireNonNegativeNumber(
      targetRecord,
      "poisonResist",
      "scenario.target.poisonResist",
    ),
    fireResist: requireNonNegativeNumber(
      targetRecord,
      "fireResist",
      "scenario.target.fireResist",
    ),
    coldResist: requireNonNegativeNumber(
      targetRecord,
      "coldResist",
      "scenario.target.coldResist",
    ),
    diseaseResist: requireNonNegativeNumber(
      targetRecord,
      "diseaseResist",
      "scenario.target.diseaseResist",
    ),
    blockChance: requireBoundedNumber(
      targetRecord,
      "blockChance",
      "scenario.target.blockChance",
      0,
      0.8,
    ),
    criticalResist: requireBoundedNumber(
      targetRecord,
      "criticalResist",
      "scenario.target.criticalResist",
      0,
      1,
    ),
    bossOrElite: requireBoolean(
      targetRecord,
      "bossOrElite",
      "scenario.target.bossOrElite",
    ),
    immuneDebuffs: requireBoolean(
      targetRecord,
      "immuneDebuffs",
      "scenario.target.immuneDebuffs",
    ),
  };
  const horizonSeconds = requirePositiveNumber(
    scenario,
    "horizonSeconds",
    "scenario.horizonSeconds",
  );
  const roster = requireStringArray(scenario, "roster", "scenario.roster");
  requireUnique(roster, "scenario.roster");
  if (roster.length === 0) {
    throw new RangeError("scenario.roster must contain a controlled entity");
  }
  if (roster.includes(target.id)) {
    throw new RangeError("scenario.target.id must not be a controlled entity");
  }
  const entities = new Set([...roster, target.id]);

  const targetCount = requireInteger(
    scenario,
    "targetCount",
    "scenario.targetCount",
  );
  assertSupportedTargetCount(targetCount);

  const durabilityLoss = requireBoolean(
    scenario,
    "durabilityLoss",
    "scenario.durabilityLoss",
  );
  if (durabilityLoss) {
    throw new Error("Unsupported durability loss in scenario.durabilityLoss");
  }

  const initialResources = requireArray(
    scenario,
    "initialResources",
    "scenario.initialResources",
  ).map((entry, index) => {
    const path = `scenario.initialResources[${index}]`;
    const record = requireRecord(entry, path);
    const current = requireNonNegativeNumber(
      record,
      "current",
      `${path}.current`,
    );
    const maximum = requireNonNegativeNumber(
      record,
      "maximum",
      `${path}.maximum`,
    );
    if (current > maximum) {
      throw new RangeError(`${path}.current must not exceed ${path}.maximum`);
    }
    return {
      entityId: requireEntity(record, "entityId", path, entities),
      resource: requireResourceKind(record, "resource", `${path}.resource`),
      current,
      maximum,
    };
  });
  requireUnique(
    initialResources.map((entry) => `${entry.entityId}\0${entry.resource}`),
    "scenario.initialResources entity and resource pairs",
  );

  const initialCooldowns = requireArray(
    scenario,
    "initialCooldowns",
    "scenario.initialCooldowns",
  ).map((entry, index) => {
    const path = `scenario.initialCooldowns[${index}]`;
    const record = requireRecord(entry, path);
    return {
      entityId: requireEntity(record, "entityId", path, entities),
      skillId: requireString(record, "skillId", `${path}.skillId`),
      remainingSeconds: requireNonNegativeNumber(
        record,
        "remainingSeconds",
        `${path}.remainingSeconds`,
      ),
    };
  });
  requireUnique(
    initialCooldowns.map((entry) => `${entry.entityId}\0${entry.skillId}`),
    "scenario.initialCooldowns entity and skill pairs",
  );

  const activeBuffs = requireArray(
    scenario,
    "activeBuffs",
    "scenario.activeBuffs",
  ).map((entry, index) => {
    const path = `scenario.activeBuffs[${index}]`;
    const record = requireRecord(entry, path);
    return {
      sourceEntityId: requireEntity(record, "sourceEntityId", path, entities),
      targetEntityId: requireEntity(record, "targetEntityId", path, entities),
      skillId: requireString(record, "skillId", `${path}.skillId`),
      skillLevel: requirePositiveInteger(
        record,
        "skillLevel",
        `${path}.skillLevel`,
      ),
      remainingSeconds: requirePositiveNumber(
        record,
        "remainingSeconds",
        `${path}.remainingSeconds`,
      ),
    };
  });

  const consumables = parseInventory(
    scenario,
    "consumables",
    "scenario.consumables",
    entities,
  );
  const ammunition = parseInventory(
    scenario,
    "ammunition",
    "scenario.ammunition",
    entities,
  );

  const incomingEvents = requireArray(
    scenario,
    "incomingEvents",
    "scenario.incomingEvents",
  ).map((entry, index) => {
    const path = `scenario.incomingEvents[${index}]`;
    const record = requireRecord(entry, path);
    const atSeconds = requireNonNegativeNumber(
      record,
      "atSeconds",
      `${path}.atSeconds`,
    );
    if (atSeconds > horizonSeconds) {
      throw new RangeError(`${path}.atSeconds must not exceed the horizon`);
    }
    return {
      atSeconds,
      targetEntityId: requireEntity(record, "targetEntityId", path, entities),
      amount: requirePositiveNumber(record, "amount", `${path}.amount`),
      damageType: requireDamageKind(record, "damageType", `${path}.damageType`),
    };
  });
  for (let index = 1; index < incomingEvents.length; index += 1) {
    if (incomingEvents[index].atSeconds < incomingEvents[index - 1].atSeconds) {
      throw new RangeError(
        `scenario.incomingEvents[${index}].atSeconds must preserve event order`,
      );
    }
  }

  return {
    schemaVersion,
    build,
    name: requireString(scenario, "name", "scenario.name"),
    target,
    horizonSeconds,
    initialResources,
    initialCooldowns,
    activeBuffs,
    consumables,
    ammunition,
    incomingEvents,
    roster,
    targetCount,
    durabilityLoss: false,
  };
}

export function createDefaultEvaluationScenario(args: {
  build: BuildEnvelope;
  target: EvaluationScenario["target"];
  targetMaximumHealth: number;
  roster: string[];
  horizonSeconds: number;
  initialResources?: EvaluationScenario["initialResources"];
}): EvaluationScenario {
  return parseEvaluationScenario(
    {
      schemaVersion: SCENARIO_SCHEMA_VERSION,
      build: args.build,
      name: DEFAULT_SCENARIO_NAME,
      target: { ...args.target, stationary: true },
      horizonSeconds: args.horizonSeconds,
      initialResources: [
        ...(args.initialResources ?? []),
        {
          entityId: args.target.id,
          resource: "health",
          current: args.targetMaximumHealth,
          maximum: args.targetMaximumHealth,
        },
      ],
      initialCooldowns: [],
      activeBuffs: [],
      consumables: [],
      ammunition: [],
      incomingEvents: [],
      roster: args.roster,
      targetCount: SUPPORTED_TARGET_COUNT,
      durabilityLoss: false,
    },
    args.build,
  );
}

function parseInventory(
  scenario: Record<string, unknown>,
  key: "consumables" | "ammunition",
  path: string,
  entities: ReadonlySet<string>,
): EvaluationScenario[typeof key] {
  const inventory = requireArray(scenario, key, path).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const record = requireRecord(entry, entryPath);
    return {
      entityId: requireEntity(record, "entityId", entryPath, entities),
      itemId: requireString(record, "itemId", `${entryPath}.itemId`),
      quantity: requireNonNegativeInteger(
        record,
        "quantity",
        `${entryPath}.quantity`,
      ),
    };
  });
  requireUnique(
    inventory.map((entry) => `${entry.entityId}\0${entry.itemId}`),
    `${path} entity and item pairs`,
  );
  return inventory;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} must be an array`);
  }
  return value;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`${path} must be a boolean`);
  }
  return value;
}

function requireFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number`);
  }
  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireFiniteNumber(record, key, path);
  if (!Number.isInteger(value)) {
    throw new TypeError(`${path} must be an integer`);
  }
  return value;
}

function requirePositiveInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireInteger(record, key, path);
  if (value <= 0) throw new RangeError(`${path} must be positive`);
  return value;
}

function requireNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireInteger(record, key, path);
  if (value < 0) throw new RangeError(`${path} must not be negative`);
  return value;
}

function requirePositiveNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireFiniteNumber(record, key, path);
  if (value <= 0) throw new RangeError(`${path} must be positive`);
  return value;
}

function requireNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireFiniteNumber(record, key, path);
  if (value < 0) throw new RangeError(`${path} must not be negative`);
  return value;
}

function requireBoundedNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  minimum: number,
  maximum: number,
): number {
  const value = requireFiniteNumber(record, key, path);
  if (value < minimum || value > maximum) {
    throw new RangeError(`${path} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function requireStringArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string[] {
  return requireArray(record, key, path).map((value, index) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`${path}[${index}] must be a non-empty string`);
    }
    return value;
  });
}

function requireEntity(
  record: Record<string, unknown>,
  key: string,
  parentPath: string,
  entities: ReadonlySet<string>,
): string {
  const value = requireString(record, key, `${parentPath}.${key}`);
  if (!entities.has(value)) {
    throw new RangeError(`${parentPath}.${key} names unknown entity ${value}`);
  }
  return value;
}

function requireResourceKind(
  record: Record<string, unknown>,
  key: string,
  path: string,
): ResourceKind {
  const value = requireString(record, key, path);
  if (value !== "health" && value !== "mana" && value !== "energy") {
    throw new RangeError(`${path} has unsupported resource ${value}`);
  }
  return value;
}

function requireDamageKind(
  record: Record<string, unknown>,
  key: string,
  path: string,
): DamageKind {
  const value = requireString(record, key, path);
  if (
    value !== "normal" &&
    value !== "magic" &&
    value !== "poison" &&
    value !== "fire" &&
    value !== "cold" &&
    value !== "disease"
  ) {
    throw new RangeError(`${path} has unsupported damage type ${value}`);
  }
  return value;
}

function requireUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) {
    throw new RangeError(`${path} must not contain duplicates`);
  }
}
