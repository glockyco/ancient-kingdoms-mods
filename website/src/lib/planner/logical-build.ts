export const LOGICAL_BUILD_SCHEMA_VERSION = 1 as const;

export interface AttributeValues {
  strength: number;
  constitution: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface AttributeLayers {
  rawObserved: AttributeValues | null;
  baseProgression: AttributeValues;
  allocated: AttributeValues;
  derivedObserved: AttributeValues | null;
}

export type SkillPool = "normal" | "veteran";

export interface AllocatedSkill {
  skillId: string;
  skillName: string | null;
  level: number;
  pool: SkillPool;
}

export interface EquippedItem {
  slot: number;
  itemId: string;
  itemName: string | null;
  augmentId: string | null;
  durability: number;
  amount: number;
}

export interface PlayerBuild {
  entityId: string;
  classId: string;
  raceId: string;
  level: number;
  veteranPoints: number;
  attributes: AttributeLayers;
  skills: AllocatedSkill[];
  equipment: EquippedItem[];
}

export interface ResourceValue {
  current: number;
  max: number;
}

export interface CompanionResources {
  health: ResourceValue;
  mana: ResourceValue | null;
  energy: ResourceValue | null;
}

export interface CapturedEffect {
  skillId: string;
  skillName: string | null;
  level: number;
  sourceEntityId: string | null;
  recipientEntityId: string;
  expiresAtServerTime: number;
}

export interface CompanionBuild {
  entityId: string;
  kind: "mercenary" | "pet";
  archetypeId: string;
  raceId: string;
  level: number;
  healthMultiplier: number | null;
  resourceMultiplier: number | null;
  baseCombat: number | null;
  currentResources?: CompanionResources;
  effects?: CapturedEffect[];
  skills: AllocatedSkill[];
  equipment: EquippedItem[];
}

export interface ItemQuantity {
  itemId: string;
  itemName: string | null;
  quantity: number;
}

export interface BuildProvenance {
  kind: "authored" | "capture" | "hypothetical";
  source: string;
}

export interface LogicalBuildData {
  schemaVersion: typeof LOGICAL_BUILD_SCHEMA_VERSION;
  player: PlayerBuild;
  companions: CompanionBuild[];
  consumables: ItemQuantity[];
  ammunition: ItemQuantity[];
  learnedBookIds: string[];
  provenance: BuildProvenance;
}

const BUILD_FIELDS = fields<LogicalBuildData>([
  "schemaVersion",
  "player",
  "companions",
  "consumables",
  "ammunition",
  "learnedBookIds",
  "provenance",
]);
const PLAYER_FIELDS = fields<PlayerBuild>([
  "entityId",
  "classId",
  "raceId",
  "level",
  "veteranPoints",
  "attributes",
  "skills",
  "equipment",
]);
const ATTRIBUTE_LAYER_FIELDS = fields<AttributeLayers>([
  "rawObserved",
  "baseProgression",
  "allocated",
  "derivedObserved",
]);
const ATTRIBUTE_FIELDS = fields<AttributeValues>([
  "strength",
  "constitution",
  "dexterity",
  "intelligence",
  "wisdom",
  "charisma",
]);
const SKILL_FIELDS = fields<AllocatedSkill>([
  "skillId",
  "skillName",
  "level",
  "pool",
]);
const EQUIPMENT_FIELDS = fields<EquippedItem>([
  "slot",
  "itemId",
  "itemName",
  "augmentId",
  "durability",
  "amount",
]);
const COMPANION_FIELDS = fields<CompanionBuild>([
  "entityId",
  "kind",
  "archetypeId",
  "raceId",
  "level",
  "healthMultiplier",
  "resourceMultiplier",
  "baseCombat",
  "currentResources",
  "effects",
  "skills",
  "equipment",
]);
const RESOURCE_VALUE_FIELDS = fields<ResourceValue>(["current", "max"]);
const COMPANION_RESOURCES_FIELDS = fields<CompanionResources>([
  "health",
  "mana",
  "energy",
]);
const CAPTURED_EFFECT_FIELDS = fields<CapturedEffect>([
  "skillId",
  "skillName",
  "level",
  "sourceEntityId",
  "recipientEntityId",
  "expiresAtServerTime",
]);
const ITEM_QUANTITY_FIELDS = fields<ItemQuantity>([
  "itemId",
  "itemName",
  "quantity",
]);
const PROVENANCE_FIELDS = fields<BuildProvenance>(["kind", "source"]);

export function parseLogicalBuildData(value: unknown): LogicalBuildData {
  const build = requireRecord(value, "buildData", BUILD_FIELDS);
  const schemaVersion = requireInteger(
    build,
    "schemaVersion",
    "buildData.schemaVersion",
  );
  if (schemaVersion !== LOGICAL_BUILD_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported logical-build schema ${schemaVersion}; expected ${LOGICAL_BUILD_SCHEMA_VERSION}`,
    );
  }

  const player = parsePlayer(build.player, "buildData.player");
  const companions = requireArray(
    build,
    "companions",
    "buildData.companions",
  ).map((entry, index) =>
    parseCompanion(entry, `buildData.companions[${index}]`),
  );
  requireUnique(
    companions.map((companion) => companion.entityId),
    "buildData.companions.entityId",
  );
  if (companions.some((companion) => companion.entityId === player.entityId)) {
    throw new RangeError(
      "buildData.companions.entityId duplicates player entityId",
    );
  }

  const learnedBookIds = requireStringArray(
    build,
    "learnedBookIds",
    "buildData.learnedBookIds",
  );
  requireUnique(learnedBookIds, "buildData.learnedBookIds");

  const provenanceRecord = requireRecord(
    build.provenance,
    "buildData.provenance",
    PROVENANCE_FIELDS,
  );
  const kind = requireString(
    provenanceRecord,
    "kind",
    "buildData.provenance.kind",
  );
  if (kind !== "authored" && kind !== "capture" && kind !== "hypothetical") {
    throw new TypeError(
      "buildData.provenance.kind must be authored, capture, or hypothetical",
    );
  }

  return {
    schemaVersion,
    player,
    companions,
    consumables: parseItemQuantities(
      build,
      "consumables",
      "buildData.consumables",
    ),
    ammunition: parseItemQuantities(
      build,
      "ammunition",
      "buildData.ammunition",
    ),
    learnedBookIds,
    provenance: {
      kind,
      source: requireString(
        provenanceRecord,
        "source",
        "buildData.provenance.source",
      ),
    },
  };
}

function parsePlayer(value: unknown, path: string): PlayerBuild {
  const player = requireRecord(value, path, PLAYER_FIELDS);
  return {
    entityId: requireString(player, "entityId", `${path}.entityId`),
    classId: requireString(player, "classId", `${path}.classId`),
    raceId: requireString(player, "raceId", `${path}.raceId`),
    level: requirePositiveInteger(player, "level", `${path}.level`),
    veteranPoints: requireNonNegativeInteger(
      player,
      "veteranPoints",
      `${path}.veteranPoints`,
    ),
    attributes: parseAttributeLayers(player.attributes, `${path}.attributes`),
    skills: parseSkills(player, "skills", `${path}.skills`),
    equipment: parseEquipment(player, "equipment", `${path}.equipment`),
  };
}

function parseAttributeLayers(value: unknown, path: string): AttributeLayers {
  const layers = requireRecord(value, path, ATTRIBUTE_LAYER_FIELDS);
  return {
    rawObserved: parseNullableAttributes(
      layers,
      "rawObserved",
      `${path}.rawObserved`,
    ),
    baseProgression: parseAttributes(
      requireField(layers, "baseProgression", `${path}.baseProgression`),
      `${path}.baseProgression`,
    ),
    allocated: parseAttributes(
      requireField(layers, "allocated", `${path}.allocated`),
      `${path}.allocated`,
    ),
    derivedObserved: parseNullableAttributes(
      layers,
      "derivedObserved",
      `${path}.derivedObserved`,
    ),
  };
}

function parseNullableAttributes(
  record: Record<string, unknown>,
  key: string,
  path: string,
): AttributeValues | null {
  const value = requireField(record, key, path);
  return value === null ? null : parseAttributes(value, path);
}

function parseAttributes(value: unknown, path: string): AttributeValues {
  const attributes = requireRecord(value, path, ATTRIBUTE_FIELDS);
  return {
    strength: requireNonNegativeInteger(
      attributes,
      "strength",
      `${path}.strength`,
    ),
    constitution: requireNonNegativeInteger(
      attributes,
      "constitution",
      `${path}.constitution`,
    ),
    dexterity: requireNonNegativeInteger(
      attributes,
      "dexterity",
      `${path}.dexterity`,
    ),
    intelligence: requireNonNegativeInteger(
      attributes,
      "intelligence",
      `${path}.intelligence`,
    ),
    wisdom: requireNonNegativeInteger(attributes, "wisdom", `${path}.wisdom`),
    charisma: requireNonNegativeInteger(
      attributes,
      "charisma",
      `${path}.charisma`,
    ),
  };
}

function parseSkills(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): AllocatedSkill[] {
  const skills = requireArray(owner, key, path).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const skill = requireRecord(entry, entryPath, SKILL_FIELDS);
    const pool = requireString(skill, "pool", `${entryPath}.pool`);
    if (pool !== "normal" && pool !== "veteran") {
      throw new TypeError(`${entryPath}.pool must be normal or veteran`);
    }
    const validatedPool: SkillPool = pool;
    return {
      skillId: requireString(skill, "skillId", `${entryPath}.skillId`),
      skillName: requireNullableString(
        skill,
        "skillName",
        `${entryPath}.skillName`,
      ),
      level: requirePositiveInteger(skill, "level", `${entryPath}.level`),
      pool: validatedPool,
    };
  });
  requireUnique(
    skills.map((skill) => skill.skillId),
    `${path}.skillId`,
  );
  return skills;
}

function parseEquipment(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): EquippedItem[] {
  const equipment = requireArray(owner, key, path).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const item = requireRecord(entry, entryPath, EQUIPMENT_FIELDS);
    return {
      slot: requireNonNegativeInteger(item, "slot", `${entryPath}.slot`),
      itemId: requireString(item, "itemId", `${entryPath}.itemId`),
      itemName: requireNullableString(
        item,
        "itemName",
        `${entryPath}.itemName`,
      ),
      augmentId: requireNullableString(
        item,
        "augmentId",
        `${entryPath}.augmentId`,
      ),
      durability: requirePositiveInteger(
        item,
        "durability",
        `${entryPath}.durability`,
      ),
      amount: requirePositiveInteger(item, "amount", `${entryPath}.amount`),
    };
  });
  requireUnique(
    equipment.map((item) => item.slot),
    `${path}.slot`,
  );
  return equipment;
}

function parseOptionalCompanionResources(
  companion: Record<string, unknown>,
  path: string,
): CompanionResources | undefined {
  if (!Object.prototype.hasOwnProperty.call(companion, "currentResources")) {
    return undefined;
  }
  const resources = requireRecord(
    companion.currentResources,
    `${path}.currentResources`,
    COMPANION_RESOURCES_FIELDS,
  );
  const resource = (value: unknown, resourcePath: string): ResourceValue => {
    const parsed = requireRecord(value, resourcePath, RESOURCE_VALUE_FIELDS);
    return {
      current: requireNonNegativeInteger(
        parsed,
        "current",
        `${resourcePath}.current`,
      ),
      max: requirePositiveInteger(parsed, "max", `${resourcePath}.max`),
    };
  };
  const nullableResource = (key: "mana" | "energy"): ResourceValue | null => {
    const value = requireField(
      resources,
      key,
      `${path}.currentResources.${key}`,
    );
    return value === null
      ? null
      : resource(value, `${path}.currentResources.${key}`);
  };
  return {
    health: resource(
      requireField(resources, "health", `${path}.currentResources.health`),
      `${path}.currentResources.health`,
    ),
    mana: nullableResource("mana"),
    energy: nullableResource("energy"),
  };
}

function parseOptionalEffects(
  companion: Record<string, unknown>,
  path: string,
): CapturedEffect[] | undefined {
  if (!Object.prototype.hasOwnProperty.call(companion, "effects")) {
    return undefined;
  }
  return requireArray(companion, "effects", `${path}.effects`).map(
    (value, index) => {
      const effectPath = `${path}.effects[${index}]`;
      const effect = requireRecord(value, effectPath, CAPTURED_EFFECT_FIELDS);
      const expiresAtServerTime = requireField(
        effect,
        "expiresAtServerTime",
        `${effectPath}.expiresAtServerTime`,
      );
      if (
        typeof expiresAtServerTime !== "number" ||
        !Number.isFinite(expiresAtServerTime)
      ) {
        throw new TypeError(
          `${effectPath}.expiresAtServerTime must be a finite number`,
        );
      }
      return {
        skillId: requireString(effect, "skillId", `${effectPath}.skillId`),
        skillName: requireNullableString(
          effect,
          "skillName",
          `${effectPath}.skillName`,
        ),
        level: requirePositiveInteger(effect, "level", `${effectPath}.level`),
        sourceEntityId: requireNullableString(
          effect,
          "sourceEntityId",
          `${effectPath}.sourceEntityId`,
        ),
        recipientEntityId: requireString(
          effect,
          "recipientEntityId",
          `${effectPath}.recipientEntityId`,
        ),
        expiresAtServerTime,
      };
    },
  );
}

function parseCompanion(value: unknown, path: string): CompanionBuild {
  const companion = requireRecord(value, path, COMPANION_FIELDS);
  const kind = requireString(companion, "kind", `${path}.kind`);
  if (kind !== "mercenary" && kind !== "pet") {
    throw new TypeError(`${path}.kind must be mercenary or pet`);
  }
  return {
    entityId: requireString(companion, "entityId", `${path}.entityId`),
    kind,
    archetypeId: requireString(companion, "archetypeId", `${path}.archetypeId`),
    raceId: requireString(companion, "raceId", `${path}.raceId`),
    level: requirePositiveInteger(companion, "level", `${path}.level`),
    healthMultiplier: requireNullableNonNegativeNumber(
      companion,
      "healthMultiplier",
      `${path}.healthMultiplier`,
    ),
    resourceMultiplier: requireNullableNonNegativeNumber(
      companion,
      "resourceMultiplier",
      `${path}.resourceMultiplier`,
    ),
    baseCombat: requireNullableNonNegativeInteger(
      companion,
      "baseCombat",
      `${path}.baseCombat`,
    ),
    currentResources: parseOptionalCompanionResources(companion, path),
    effects: parseOptionalEffects(companion, path),
    skills: parseSkills(companion, "skills", `${path}.skills`),
    equipment: parseEquipment(companion, "equipment", `${path}.equipment`),
  };
}

function parseItemQuantities(
  build: Record<string, unknown>,
  key: string,
  path: string,
): ItemQuantity[] {
  const items = requireArray(build, key, path).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const item = requireRecord(entry, entryPath, ITEM_QUANTITY_FIELDS);
    return {
      itemId: requireString(item, "itemId", `${entryPath}.itemId`),
      itemName: requireNullableString(
        item,
        "itemName",
        `${entryPath}.itemName`,
      ),
      quantity: requirePositiveInteger(
        item,
        "quantity",
        `${entryPath}.quantity`,
      ),
    };
  });
  requireUnique(
    items.map((item) => item.itemId),
    `${path}.itemId`,
  );
  return items;
}

function fields<T>(
  keys: ReadonlyArray<keyof T>,
): Readonly<Record<string, true>> {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function requireRecord(
  value: unknown,
  path: string,
  allowedFields: Readonly<Record<string, true>>,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!Object.prototype.hasOwnProperty.call(allowedFields, key)) {
      throw new TypeError(`${path}.${key} is not a supported field`);
    }
  }
  return record;
}

function requireField(
  record: Record<string, unknown>,
  key: string,
  path: string,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    throw new TypeError(`${path} is required`);
  }
  return record[key];
}

function requireArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
): unknown[] {
  const value = requireField(record, key, path);
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  return value;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = requireField(record, key, path);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function requireNullableString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = requireField(record, key, path);
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be null or a non-empty string`);
  }
  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireField(record, key, path);
  if (!Number.isInteger(value))
    throw new TypeError(`${path} must be an integer`);
  return value as number;
}

function requirePositiveInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requireInteger(record, key, path);
  if (value < 1) throw new RangeError(`${path} must be at least 1`);
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

function requireNullableNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number | null {
  const value = requireField(record, key, path);
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new RangeError(`${path} must be null or a non-negative integer`);
  }
  return value as number;
}

function requireNullableNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number | null {
  const value = requireField(record, key, path);
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${path} must be null or a non-negative number`);
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

function requireUnique(
  values: ReadonlyArray<string | number>,
  path: string,
): void {
  const seen = new Set<string | number>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value))
      throw new RangeError(`${path}[${index}] duplicates ${value}`);
    seen.add(value);
  }
}
