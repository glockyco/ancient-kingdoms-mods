import {
  activeArmorSetStates,
  buildCasterStatSheet,
  type ArmorSetDefinition,
  type AttributeSet,
  type CasterBaseCurves,
  type CasterBonuses,
  type CasterEquipmentPiece,
  type CasterStatInput,
  type LearnedBookDefinition,
  type PassiveDamageBonus,
} from "./caster";
import {
  buildCompanionCombatState,
  companionSkillLevel,
  type CompanionArchetype,
  type CompanionCombatState,
  type CompanionRace,
  type CompanionRoll,
} from "./companion";
import type { EffectSpec } from "./effects";
import type { EngineAction, EngineEntityInput, EngineInput } from "./engine";
import { companionPolicy, priorityPolicy, schedulePolicy } from "./policy";
import { simulate, type SimulationResult } from "./simulate";
import type { DebuffSchool } from "./target";
import type {
  CasterClass,
  DamageSkillClass,
  DamageSkillSpec,
  EquippedWeapon,
} from "./hit";
import {
  evaluateSkillAllocation,
  skillValueAtLevel,
  type AllocatableSkill,
  type SkillAllocationResult,
  type SkillGateCurve,
} from "./legality";
import {
  parseLogicalBuildData,
  type AllocatedSkill,
  type AttributeValues,
  type CompanionBuild,
  type EquippedItem,
  type ItemQuantity,
  type LogicalBuildData,
} from "./logical-build";
import {
  parseEvaluationScenario,
  type DamageKind,
  type EvaluationScenario,
} from "./scenario";
import { parseBuildEnvelope, type BuildEnvelope } from "./build-envelope";

const CATALOG_FIELDS = new Set([
  "build",
  "classDomain",
  "classes",
  "classCombat",
  "equipmentSlots",
  "equipment",
  "augments",
  "progression",
  "skills",
  "mercenaryArchetypes",
  "consumables",
  "ammunition",
  "learnedBooks",
  "effectClassifications",
]);
const CASTER_CLASSES = new Set<CasterClass>([
  "warrior",
  "ranger",
  "cleric",
  "rogue",
  "wizard",
  "druid",
]);
const COMPANION_RACES = new Set<CompanionRace>([
  "human",
  "elf",
  "dwarf",
  "dark_elf",
  "fire_goblin",
  "felarii",
  "drassar",
]);
const DAMAGE_SKILL_CLASSES = new Set<DamageSkillClass>([
  "target_damage",
  "frontal_damage",
  "area_damage",
  "target_projectile",
  "frontal_projectiles",
]);
const EFFECT_SKILL_CLASSES = new Map<string, EffectSpec["recipient"]>([
  ["target_buff", "self"],
  ["area_buff", "self"],
  ["target_debuff", "target"],
  ["area_debuff", "target"],
]);
const ATTRIBUTE_KEYS: Array<keyof AttributeSet> = [
  "strength",
  "constitution",
  "dexterity",
  "intelligence",
  "wisdom",
  "charisma",
];
const ITEM_STAT_FIELDS = new Set([
  ...ATTRIBUTE_KEYS,
  "health_bonus",
  "mana_bonus",
  "energy_bonus",
  "damage",
  "magic_damage",
  "defense",
  "magic_resist",
  "poison_resist",
  "fire_resist",
  "cold_resist",
  "disease_resist",
  "accuracy",
  "block_chance",
  "critical_chance",
  "critical_resist",
  "haste",
  "spell_haste",
  "max_durability",
  "augment_bonus_set",
  "augment_bonus_set_id",
  "hp_regen_bonus",
  "mana_regen_bonus",
  "has_serenity",
  "speed_bonus",
  "resist_fear_chance",
  "is_costume",
]);
const UNSUPPORTED_SELECTED_ITEM_STATS = new Set(["has_serenity", "is_costume"]);

interface CatalogContext {
  build: BuildEnvelope;
  classes: Map<string, Record<string, unknown>>;
  classCombat: Map<string, Record<string, unknown>>;
  slots: Map<string, Record<string, unknown>>;
  equipment: Map<string, Record<string, unknown>>;
  augments: Map<string, Record<string, unknown>>;
  races: Map<string, Record<string, unknown>>;
  classLevels: Map<string, Record<string, unknown>>;
  levelBudgets: Map<string, Record<string, unknown>>;
  skills: Map<string, Record<string, unknown>>;
  mercenaries: Map<string, Record<string, unknown>>;
  consumables: Map<string, Record<string, unknown>>;
  ammunition: Map<string, Record<string, unknown>>;
  books: Map<string, Record<string, unknown>>;
  classifications: Map<string, "modelled" | "excluded">;
  progression: Record<string, unknown>;
  classDomain: { supported: Set<string>; excluded: Map<string, string> };
}

export interface ResolvedSkill {
  id: string;
  name: string;
  level: number;
  classification: "modelled" | "excluded";
}

export interface ResolvedPlayer {
  entityId: string;
  classId: CasterClass;
  raceId: string;
  resourceKind: "mana" | "energy";
  caster: CasterStatInput;
  weapons: readonly EquippedWeapon[];
  weaponDelay: number;
  actions: readonly EngineAction[];
  skills: readonly ResolvedSkill[];
  attributePointsSpent: number;
  attributePointBudget: number;
  skillAllocation: SkillAllocationResult;
  resourceRecovery: {
    base: number;
    equipmentFlat: number;
    manaPassivePercent: number;
    energyPassivePercent: number;
  };
  observations: {
    rawAttributes: AttributeValues | null;
    derivedAttributes: AttributeValues | null;
  };
}

export interface ResolvedCompanion {
  entityId: string;
  archetypeId: string;
  classId: CasterClass;
  resourceKind: "mana" | "energy";
  resourceRecoveryBase: number;
  hasHeals: boolean;
  weapons: readonly EquippedWeapon[];
  skills: readonly ResolvedSkill[];
  /** Ordered as the archetype lists them; the first entry is the default attack. */
  actions: readonly EngineAction[];
  state: CompanionCombatState;
}

export interface ResolvedConsumable {
  itemId: string;
  name: string;
  quantity: number;
  buffSkillId: string | null;
  buffLevel: number;
  manaRestored: number;
  energyRestored: number;
}

export interface ResolvedAmmunition {
  itemId: string;
  name: string;
  quantity: number;
}

export interface ResolvedLogicalBuild {
  build: BuildEnvelope;
  buildData: LogicalBuildData;
  player: ResolvedPlayer;
  companions: readonly ResolvedCompanion[];
  consumables: readonly ResolvedConsumable[];
  ammunition: readonly ResolvedAmmunition[];
}

export type PlayerPolicySpec =
  | { kind: "priority"; order: readonly string[] }
  | { kind: "schedule"; steps: readonly string[]; repeat: boolean };

export interface LogicalBuildSimulationInput {
  buildData: unknown;
  catalog: unknown;
  scenario: unknown;
  policy: PlayerPolicySpec;
}

interface ResolvedEquipment {
  pieces: CasterEquipmentPiece[];
  weapons: EquippedWeapon[];
  armorSets: ArmorSetDefinition[];
  setSkillBonuses: Map<string, number>;
  manaRecoveryFlat: number;
}

interface SkillEffects {
  bonuses: Partial<CasterBonuses>;
  damagePercent: number;
  magicDamagePercent: number;
  manaRecoveryPercent: number;
  energyRecoveryPercent: number;
  manaRecoveryFlat: number;
  energyRecoveryFlat: number;
}

interface InternalResolution {
  value: ResolvedLogicalBuild;
  catalog: CatalogContext;
  skillLevels: Readonly<Record<string, number>>;
}

/**
 * The domains the verification coverage report answers for: every supported class, every mercenary
 * archetype as the game names it, and each damaging skill's handler under the skill's display name,
 * which is how an observed hit names its skill.
 */
export interface CatalogCoverageDomain {
  classes: readonly string[];
  archetypes: readonly string[];
  handlers: readonly DamageSkillClass[];
  schools: readonly DamageKind[];
  handlerBySkillName: ReadonlyMap<string, DamageSkillClass>;
}

export function catalogCoverageDomain(
  catalogValue: unknown,
): CatalogCoverageDomain {
  const catalog = parseCatalog(catalogValue);
  const handlerBySkillName = new Map<string, DamageSkillClass>();
  const handlers = new Set<DamageSkillClass>();
  const schools = new Set<DamageKind>();
  for (const [id, skill] of catalog.skills) {
    const type = requiredString(skill, "skill_type", `skill ${id}.skill_type`);
    if (!DAMAGE_SKILL_CLASSES.has(type as DamageSkillClass)) continue;
    const playerClasses = stringArray(
      skill,
      "player_classes",
      `skill ${id}.player_classes`,
    );
    if (
      !playerClasses.some((classId) =>
        catalog.classDomain.supported.has(classId),
      )
    )
      continue;
    const handler = type as DamageSkillClass;
    handlerBySkillName.set(
      requiredString(skill, "name", `skill ${id}.name`),
      handler,
    );
    handlers.add(handler);
    schools.add(
      damageKind(
        requiredString(skill, "damage_type", `skill ${id}.damage_type`),
        `skill ${id}.damage_type`,
      ),
    );
  }
  return {
    classes: [...catalog.classDomain.supported].sort(),
    archetypes: [...catalog.mercenaries.values()]
      .map((row) =>
        requiredString(row, "type_monster", "mercenary.type_monster"),
      )
      .sort(),
    handlers: [...handlers].sort(),
    schools: [...schools].sort(),
    handlerBySkillName,
  };
}

export function resolveLogicalBuild(
  buildValue: unknown,
  catalogValue: unknown,
): ResolvedLogicalBuild {
  return resolveInternal(buildValue, catalogValue).value;
}

/** Resolves one buff or debuff skill at a level to the effect the engine applies. */
export function resolveEffectSpec(
  catalogValue: unknown,
  skillId: string,
  level: number,
): EffectSpec {
  const catalog = parseCatalog(catalogValue);
  return effectSpecFromSkill(
    requireIdentity(catalog.skills, skillId, `skill '${skillId}'`),
    level,
    catalog,
  );
}

/** Resolves a logical build and scenario through the catalog and runs the sampled engine. */
export function simulateLogicalBuild(
  input: LogicalBuildSimulationInput,
): SimulationResult {
  const resolved = resolveInternal(input.buildData, input.catalog);
  const scenario = parseEvaluationScenario(
    input.scenario,
    resolved.value.build,
  );
  assertScenarioMatchesBuild(scenario, resolved.value);
  const { player, companions } = resolved.value;

  const effectSpecFor = (skillId: string, level: number, path: string) =>
    effectSpecFromSkill(
      requireIdentity(resolved.catalog.skills, skillId, path),
      level,
      resolved.catalog,
    );
  const initialResources = new Map<string, number>();
  const resourceFor = (
    entityId: string,
    kind: "mana" | "energy",
    calculatedMaximum: number,
  ) => {
    const resource = scenario.initialResources.find(
      (candidate) =>
        candidate.entityId === entityId && candidate.resource === kind,
    );
    if (!resource)
      throw new Error(`scenario has no ${kind} state for ${entityId}`);
    if (resource.maximum !== calculatedMaximum) {
      throw new Error(
        `scenario ${kind} maximum ${resource.maximum} for ${entityId} does not match catalog-derived ${calculatedMaximum}`,
      );
    }
    initialResources.set(entityId, resource.current);
  };

  const playerSheet = buildCasterStatSheet(player.caster);
  resourceFor(
    player.entityId,
    player.resourceKind,
    player.resourceKind === "mana" ? playerSheet.mana : playerSheet.energy,
  );
  const entities: EngineEntityInput[] = [
    {
      id: player.entityId,
      kind: "player",
      classId: player.classId,
      caster: player.caster,
      weapons: player.weapons,
      weaponDelay: player.weaponDelay,
      resourceKind: player.resourceKind,
      resourceRecovery: {
        base: player.resourceRecovery.base,
        equipmentFlat: player.resourceRecovery.equipmentFlat,
        passivePercent:
          player.resourceKind === "mana"
            ? player.resourceRecovery.manaPassivePercent
            : player.resourceRecovery.energyPassivePercent,
      },
      actions: player.actions,
      policy:
        input.policy.kind === "priority"
          ? priorityPolicy(input.policy.order)
          : schedulePolicy(input.policy),
      hasHeals: false,
      endlessQuiver: false,
      enhancedBackstab: false,
    },
    ...companions.map((companion): EngineEntityInput => {
      resourceFor(
        companion.entityId,
        companion.resourceKind,
        companion.resourceKind === "mana"
          ? companion.state.sheet.mana
          : companion.state.sheet.energy,
      );
      return {
        id: companion.entityId,
        kind: "companion",
        classId: companion.classId,
        caster: companion.state.casterInput,
        weapons: companion.weapons,
        weaponDelay: 0,
        resourceKind: companion.resourceKind,
        resourceRecovery: {
          base: companion.resourceRecoveryBase,
          equipmentFlat: 0,
          passivePercent: 0,
        },
        actions: companion.actions,
        policy: companionPolicy(),
        hasHeals: companion.hasHeals,
        endlessQuiver: false,
        enhancedBackstab: false,
      };
    }),
  ];
  for (const id of input.policy.kind === "priority"
    ? input.policy.order
    : input.policy.steps) {
    if (!player.actions.some((action) => action.id === id))
      throw new Error(`policy names unknown player action '${id}'`);
  }

  const targetHealth = scenario.initialResources.find(
    (candidate) =>
      candidate.entityId === scenario.target.id &&
      candidate.resource === "health",
  );
  if (!targetHealth)
    throw new Error(
      `scenario has no health state for target ${scenario.target.id}`,
    );

  const engine: EngineInput = {
    horizon: scenario.horizonSeconds,
    includeHorizonEvents: scenario.includeHorizonEvents,
    entities,
    target: {
      id: scenario.target.id,
      stats: {
        level: scenario.target.level,
        defense: scenario.target.defense,
        magicResist: scenario.target.magicResist,
        poisonResist: scenario.target.poisonResist,
        fireResist: scenario.target.fireResist,
        coldResist: scenario.target.coldResist,
        diseaseResist: scenario.target.diseaseResist,
        blockChance: scenario.target.blockChance,
        criticalResist: scenario.target.criticalResist,
        bossOrElite: scenario.target.bossOrElite,
        immuneDebuffs: scenario.target.immuneDebuffs,
      },
      currentHealth: targetHealth.current,
      maximumHealth: targetHealth.maximum,
    },
    initialResources,
    initialCooldowns: scenario.initialCooldowns,
    initialEffects: scenario.activeBuffs.map((buff) => ({
      sourceId: buff.sourceEntityId,
      recipientId: buff.targetEntityId,
      spec: effectSpecFor(
        buff.skillId,
        buff.skillLevel,
        `scenario.activeBuffs skill '${buff.skillId}'`,
      ),
      remainingSeconds: buff.remainingSeconds,
    })),
    consumables: scenario.consumables.map((entry) => {
      const consumable = resolved.value.consumables.find(
        (candidate) => candidate.itemId === entry.itemId,
      )!;
      return {
        entityId: entry.entityId,
        spec:
          consumable.buffSkillId === null
            ? null
            : effectSpecFor(
                consumable.buffSkillId,
                consumable.buffLevel,
                `consumable buff skill '${consumable.buffSkillId}'`,
              ),
        quantity: entry.quantity,
      };
    }),
    ammunition: scenario.ammunition,
    incomingEvents: scenario.incomingEvents,
  };
  return simulate({
    build: resolved.value.build,
    seed: scenario.seed,
    replicates: scenario.replicates,
    engine,
  });
}

function resolveInternal(
  buildValue: unknown,
  catalogValue: unknown,
): InternalResolution {
  const buildData = parseLogicalBuildData(buildValue);
  const catalog = parseCatalog(catalogValue);
  const playerResolution = resolvePlayer(buildData, catalog);
  const companions = buildData.companions.map((companion) =>
    resolveCompanion(companion, buildData, catalog),
  );
  const consumables = buildData.consumables.map((item) =>
    resolveConsumable(item, catalog),
  );
  const ammunition = buildData.ammunition.map((item) =>
    resolveAmmunition(item, catalog),
  );
  return {
    value: {
      build: catalog.build,
      buildData,
      player: playerResolution.player,
      companions,
      consumables,
      ammunition,
    },
    catalog,
    skillLevels: playerResolution.skillLevels,
  };
}

function parseCatalog(value: unknown): CatalogContext {
  const catalog = record(value, "catalog");
  for (const key of Object.keys(catalog)) {
    if (!CATALOG_FIELDS.has(key))
      throw new TypeError(`catalog.${key} is not a supported field`);
  }
  for (const key of CATALOG_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(catalog, key))
      throw new TypeError(`catalog.${key} is required`);
  }

  const progression = record(catalog.progression, "catalog.progression");
  const classifications = new Map<string, "modelled" | "excluded">();
  for (const [index, entry] of array(
    catalog,
    "effectClassifications",
  ).entries()) {
    const classification = record(
      entry,
      `catalog.effectClassifications[${index}]`,
    );
    const kind = requiredString(
      classification,
      "kind",
      `catalog.effectClassifications[${index}].kind`,
    );
    const status = requiredString(
      classification,
      "status",
      `catalog.effectClassifications[${index}].status`,
    );
    if (classifications.has(kind))
      throw new Error(`Duplicate effect classification '${kind}'`);
    if (status === "unsupported")
      throw new Error(`Catalog admits unsupported effect '${kind}'`);
    if (status !== "modelled" && status !== "excluded") {
      throw new TypeError(
        `Effect classification '${kind}' has invalid status '${status}'`,
      );
    }
    classifications.set(kind, status);
  }

  const domain = record(catalog.classDomain, "catalog.classDomain");
  const supported = new Set(
    stringArray(domain, "supported", "catalog.classDomain.supported"),
  );
  const excluded = new Map<string, string>();
  for (const [index, entry] of array(domain, "excluded").entries()) {
    const path = `catalog.classDomain.excluded[${index}]`;
    const exclusion = record(entry, path);
    const classId = requiredString(exclusion, "classId", `${path}.classId`);
    if (supported.has(classId) || excluded.has(classId))
      throw new Error(`Catalog class domain declares '${classId}' twice`);
    excluded.set(
      classId,
      requiredString(exclusion, "reason", `${path}.reason`),
    );
  }
  for (const classId of supported) {
    if (!CASTER_CLASSES.has(classId as CasterClass))
      throw new Error(
        `Catalog class domain supports '${classId}', which the engine does not model`,
      );
  }

  return {
    build: parseBuildEnvelope(catalog.build),
    classDomain: { supported, excluded },
    classes: indexById(array(catalog, "classes"), "catalog.classes"),
    classCombat: indexById(
      array(catalog, "classCombat"),
      "catalog.classCombat",
    ),
    slots: indexByComposite(
      array(catalog, "equipmentSlots"),
      "catalog.equipmentSlots",
      (row, path) =>
        `${requiredString(row, "owner_type", `${path}.owner_type`)}:${requiredString(row, "owner_id", `${path}.owner_id`)}:${requiredInteger(row, "slot_index", `${path}.slot_index`)}`,
    ),
    equipment: indexById(array(catalog, "equipment"), "catalog.equipment"),
    augments: indexById(array(catalog, "augments"), "catalog.augments"),
    races: indexById(array(progression, "races"), "catalog.progression.races"),
    classLevels: indexByComposite(
      array(progression, "class_levels"),
      "catalog.progression.class_levels",
      (row, path) =>
        `${requiredString(row, "class_id", `${path}.class_id`)}:${requiredInteger(row, "level", `${path}.level`)}`,
    ),
    levelBudgets: indexByComposite(
      array(progression, "level_budgets"),
      "catalog.progression.level_budgets",
      (row, path) => String(requiredInteger(row, "level", `${path}.level`)),
    ),
    skills: indexById(array(catalog, "skills"), "catalog.skills"),
    mercenaries: indexById(
      array(catalog, "mercenaryArchetypes"),
      "catalog.mercenaryArchetypes",
    ),
    consumables: indexById(
      array(catalog, "consumables"),
      "catalog.consumables",
    ),
    ammunition: indexById(array(catalog, "ammunition"), "catalog.ammunition"),
    books: indexById(array(catalog, "learnedBooks"), "catalog.learnedBooks"),
    classifications,
    progression,
  };
}

function resolvePlayer(
  build: LogicalBuildData,
  catalog: CatalogContext,
): { player: ResolvedPlayer; skillLevels: Readonly<Record<string, number>> } {
  const player = build.player;
  const classId = casterClass(
    catalog,
    player.classId,
    "buildData.player.classId",
  );
  const classDefinition = requireIdentity(
    catalog.classes,
    classId,
    `class '${classId}'`,
  );
  const race = requireIdentity(
    catalog.races,
    player.raceId,
    `race '${player.raceId}'`,
  );
  const compatibleRaces = stringArray(
    classDefinition,
    "compatible_races",
    `class ${classId}.compatible_races`,
  );
  if (!compatibleRaces.includes(player.raceId)) {
    throw new Error(
      `Race '${player.raceId}' is incompatible with class '${classId}'`,
    );
  }

  const maximumLevel = requiredInteger(
    catalog.progression,
    "max_level",
    "catalog.progression.max_level",
  );
  const maximumVeteran = requiredInteger(
    catalog.progression,
    "max_veteran_points",
    "catalog.progression.max_veteran_points",
  );
  if (player.level > maximumLevel)
    throw new RangeError(
      `Player level ${player.level} exceeds catalog maximum ${maximumLevel}`,
    );
  if (player.veteranPoints > maximumVeteran) {
    throw new RangeError(
      `Player veteran points ${player.veteranPoints} exceed catalog maximum ${maximumVeteran}`,
    );
  }

  const classLevel = requireIdentity(
    catalog.classLevels,
    `${classId}:${player.level}`,
    `class progression '${classId}:${player.level}'`,
  );
  const expectedBase = addAttributes(
    attributeSet(
      race.starting_attributes,
      `race ${player.raceId}.starting_attributes`,
    ),
    attributeSet(
      classLevel.automatic_attributes,
      `class progression ${classId}:${player.level}.automatic_attributes`,
    ),
  );
  assertAttributesEqual(
    player.attributes.baseProgression,
    expectedBase,
    "buildData.player.attributes.baseProgression",
  );

  const levelBudget = requireIdentity(
    catalog.levelBudgets,
    String(player.level),
    `level budget '${player.level}'`,
  );
  const baseAttributeBudget = requiredInteger(
    levelBudget,
    "attribute_points",
    `level budget ${player.level}.attribute_points`,
  );
  const pointsPerVeteran = requiredInteger(
    catalog.progression,
    "attribute_points_per_veteran",
    "catalog.progression.attribute_points_per_veteran",
  );
  const attributePointBudget =
    baseAttributeBudget + player.veteranPoints * pointsPerVeteran;
  const attributePointsSpent = ATTRIBUTE_KEYS.reduce(
    (total, key) => total + player.attributes.allocated[key],
    0,
  );
  if (attributePointsSpent > attributePointBudget) {
    throw new RangeError(
      `Player attribute allocation spends ${attributePointsSpent}; catalog budget is ${attributePointBudget}`,
    );
  }

  const equipment = resolveEquipment(
    player.equipment,
    "player",
    classId,
    requiredString(classDefinition, "name", `class ${classId}.name`),
    player.level,
    catalog,
  );
  const allocation = resolvePlayerSkills(
    player.skills,
    player,
    catalog,
    equipment,
  );
  const skillEffectsById = [...catalog.skills.values()]
    .filter(
      (skill) =>
        (allocation.levels[requiredString(skill, "id", "skill.id")] ?? 0) > 0,
    )
    .map((skill) => ({
      skill,
      level: allocation.levels[requiredString(skill, "id", "skill.id")],
    }));
  const passiveEffects = skillEffectsById
    .filter(
      ({ skill }) =>
        requiredString(skill, "skill_type", "skill.skill_type") === "passive",
    )
    .map(({ skill, level }) =>
      skillEffects(skill, level, `skill ${String(skill.id)}`),
    );
  const bookCatalog = [...catalog.books.values()].map(bookDefinition);
  for (const bookId of build.learnedBookIds) {
    requireIdentity(catalog.books, bookId, `learned book '${bookId}'`);
  }
  if (build.learnedBookIds.length > 0) {
    requireClassification(catalog, "item_effect:learned_book_attributes");
  }

  const combat = requireIdentity(
    catalog.classCombat,
    classId,
    `class combat '${classId}'`,
  );
  const resourceKind = requiredString(
    combat,
    "resource_type",
    `class combat ${classId}.resource_type`,
  );
  if (resourceKind !== "mana" && resourceKind !== "energy") {
    throw new TypeError(
      `Class '${classId}' has unsupported resource '${resourceKind}'`,
    );
  }
  const caster: CasterStatInput = {
    kind: "player",
    level: player.level,
    attributes: addAttributes(
      player.attributes.baseProgression,
      player.attributes.allocated,
    ),
    curves: playerCurves(combat, classId),
    equipment: equipment.pieces,
    armorSets: equipment.armorSets,
    learnedBooks: { ids: build.learnedBookIds, catalog: bookCatalog },
    bonusSources: passiveEffects.map((effect) => effect.bonuses),
    passives: passiveEffects.map(
      (effect) =>
        ({
          damagePercent: effect.damagePercent,
          magicDamagePercent: effect.magicDamagePercent,
        }) satisfies PassiveDamageBonus,
    ),
  };
  const castableSkills = skillEffectsById.filter(({ skill }) =>
    isCastable(skill),
  );
  const defaultAttackIndex = castableSkills.findIndex(({ skill }) =>
    requiredBoolean(
      skill,
      "followup_default_attack",
      "skill.followup_default_attack",
    ),
  );
  const actions = castableSkills.map(({ skill, level }, index) =>
    engineAction(skill, level, resourceKind, catalog, {
      defaultAttack: index === defaultAttackIndex,
    }),
  );
  const skills = skillEffectsById.map(({ skill, level }) =>
    resolvedSkill(skill, level, catalog),
  );
  const defaultAttack = actions.find((action) => action.defaultAttack);
  const defaultWeaponSlot =
    classId === "ranger" && defaultAttack?.requiredWeaponCategory === "Bow"
      ? 13
      : 12;
  const defaultWeapon = equipment.weapons.find(
    (weapon) => weapon.slot === defaultWeaponSlot,
  );

  return {
    player: {
      entityId: player.entityId,
      classId,
      raceId: player.raceId,
      resourceKind,
      caster,
      weapons: equipment.weapons,
      weaponDelay:
        defaultWeapon?.durability && defaultWeapon.amount > 0
          ? requiredNumber(
              requireIdentity(
                catalog.equipment,
                player.equipment.find((item) => item.slot === defaultWeaponSlot)
                  ?.itemId ?? "",
                "default-attack weapon",
              ),
              "weapon_delay",
              "default-attack weapon.weapon_delay",
            )
          : 0,
      actions,
      skills,
      attributePointsSpent,
      attributePointBudget,
      skillAllocation: allocation,
      resourceRecovery: {
        base: requiredNumber(
          combat,
          resourceKind === "mana"
            ? "base_mana_recovery_rate"
            : "base_energy_recovery_rate",
          `class combat ${classId}.${resourceKind} recovery`,
        ),
        equipmentFlat: resourceKind === "mana" ? equipment.manaRecoveryFlat : 0,
        manaPassivePercent: passiveEffects.reduce(
          (total, effect) => total + effect.manaRecoveryPercent,
          0,
        ),
        energyPassivePercent: passiveEffects.reduce(
          (total, effect) => total + effect.energyRecoveryPercent,
          0,
        ),
      },
      observations: {
        rawAttributes: player.attributes.rawObserved,
        derivedAttributes: player.attributes.derivedObserved,
      },
    },
    skillLevels: allocation.levels,
  };
}

function resolvePlayerSkills(
  declared: readonly AllocatedSkill[],
  player: LogicalBuildData["player"],
  catalog: CatalogContext,
  equipment: ResolvedEquipment,
): SkillAllocationResult {
  const classSkills = [...catalog.skills.values()]
    .filter((skill) =>
      stringArray(skill, "player_classes", "skill.player_classes").includes(
        player.classId,
      ),
    )
    .map(allocatableSkill);
  const requestedLevels: Record<string, number> = {};
  for (const allocation of declared) {
    const skill = requireIdentity(
      catalog.skills,
      allocation.skillId,
      `skill '${allocation.skillId}'`,
    );
    const isVeteran = requiredBoolean(
      skill,
      "is_veteran",
      `skill ${allocation.skillId}.is_veteran`,
    );
    if ((allocation.pool === "veteran") !== isVeteran) {
      throw new Error(
        `Skill '${allocation.skillId}' uses the wrong allocation pool`,
      );
    }
    assertOptionalName(
      allocation.skillName,
      skill,
      `skill '${allocation.skillId}'`,
    );
    requestedLevels[allocation.skillId] = allocation.level;
  }
  const levelBudget = requireIdentity(
    catalog.levelBudgets,
    String(player.level),
    `level budget '${player.level}'`,
  );
  const normalPointBudget = requiredInteger(
    levelBudget,
    "normal_skill_points",
    `level budget ${player.level}.normal_skill_points`,
  );
  const pointsPerVeteran = requiredInteger(
    catalog.progression,
    "veteran_skill_points_per_veteran",
    "catalog.progression.veteran_skill_points_per_veteran",
  );
  const allocation = evaluateSkillAllocation({
    classId: player.classId,
    level: player.level,
    veteranPoints: player.veteranPoints,
    normalPointBudget,
    veteranPointBudget: player.veteranPoints * pointsPerVeteran,
    skills: classSkills,
    requestedLevels,
  });
  if (!allocation.feasible) {
    const failures = allocation.failures
      .map((failure) => `${failure.skillId ?? "player"}:${failure.code}`)
      .join(", ");
    throw new Error(`Player skill allocation is not feasible: ${failures}`);
  }
  const levels = { ...allocation.levels };
  for (const [skillId, bonus] of equipment.setSkillBonuses) {
    const skill = requireIdentity(
      catalog.skills,
      skillId,
      `armor-set skill '${skillId}'`,
    );
    if (
      !stringArray(
        skill,
        "player_classes",
        `skill ${skillId}.player_classes`,
      ).includes(player.classId)
    ) {
      throw new Error(
        `Armor-set skill '${skillId}' is incompatible with class '${player.classId}'`,
      );
    }
    levels[skillId] = (levels[skillId] ?? 0) + bonus;
  }
  return { ...allocation, levels };
}

function resolveEquipment(
  declared: readonly EquippedItem[],
  ownerType: "player" | "mercenary",
  ownerId: string,
  className: string,
  level: number,
  catalog: CatalogContext,
): ResolvedEquipment {
  const pieces: CasterEquipmentPiece[] = [];
  const weapons: EquippedWeapon[] = [];
  const armorSets = new Map<string, ArmorSetDefinition>();
  let manaRecoveryFlat = 0;
  const setSkillDefinitions = new Map<
    string,
    Array<{ skillId: string; level: number }>
  >();
  const registerArmorSet = (
    augment: Record<string, unknown>,
    augmentId: string,
  ): void => {
    const bonuses = itemStats(augment, `augment ${augmentId}`);
    for (const [key, value] of Object.entries(bonuses)) {
      if (!ATTRIBUTE_KEYS.includes(key as keyof AttributeSet) && value !== 0) {
        throw new Error(
          `Armor-set augment '${augmentId}' has unsupported non-attribute bonus '${key}'`,
        );
      }
    }
    const attributeBonuses = Object.fromEntries(
      ATTRIBUTE_KEYS.map((key) => [key, bonuses[key] ?? 0]),
    ) as unknown as AttributeSet;
    armorSets.set(augmentId, { id: augmentId, attributeBonuses });
    const setBonuses = array(augment, "augment_skill_bonuses").map(
      (entry, index) => {
        const bonus = record(
          entry,
          `augment ${augmentId}.augment_skill_bonuses[${index}]`,
        );
        return {
          skillId: requiredString(
            bonus,
            "skill_id",
            `augment ${augmentId}.skill_id`,
          ),
          level: requiredInteger(
            bonus,
            "level_bonus",
            `augment ${augmentId}.level_bonus`,
          ),
        };
      },
    );
    if (setBonuses.length > 0)
      requireClassification(catalog, "item_effect:augment_skill_bonuses");
    setSkillDefinitions.set(augmentId, setBonuses);
  };

  for (const declaration of declared) {
    const item = requireIdentity(
      catalog.equipment,
      declaration.itemId,
      `equipment '${declaration.itemId}'`,
    );
    assertOptionalName(
      declaration.itemName,
      item,
      `equipment '${declaration.itemId}'`,
    );
    const itemType = requiredString(
      item,
      "item_type",
      `equipment ${declaration.itemId}.item_type`,
    );
    if (itemType !== "equipment" && itemType !== "weapon") {
      throw new Error(`Item '${declaration.itemId}' is not equipment`);
    }
    const slot = requireIdentity(
      catalog.slots,
      `${ownerType}:${ownerId}:${declaration.slot}`,
      `${ownerType} slot '${ownerId}:${declaration.slot}'`,
    );
    const acceptedCategory = requiredString(
      slot,
      "accepted_category",
      `slot ${declaration.slot}.accepted_category`,
    );
    const itemCategory = requiredString(
      item,
      "slot",
      `equipment ${declaration.itemId}.slot`,
    );
    if (!itemCategory.startsWith(acceptedCategory)) {
      throw new Error(
        `Equipment '${declaration.itemId}' is incompatible with slot ${declaration.slot}`,
      );
    }
    const allowedClasses = stringArray(
      item,
      "class_required",
      `equipment ${declaration.itemId}.class_required`,
    );
    if (
      allowedClasses.length > 0 &&
      !allowedClasses.includes("All") &&
      !allowedClasses.includes(className)
    ) {
      throw new Error(
        `Equipment '${declaration.itemId}' is incompatible with class '${ownerId}'`,
      );
    }
    if (
      requiredInteger(
        item,
        "level_required",
        `equipment ${declaration.itemId}.level_required`,
      ) > level
    ) {
      throw new Error(
        `Equipment '${declaration.itemId}' exceeds owner level ${level}`,
      );
    }
    requireClassification(catalog, "item_effect:stats");
    const itemBonuses = itemStats(item, `equipment ${declaration.itemId}`);
    let augmentBonuses: Partial<CasterBonuses> | null = null;
    let armorSetId: string | null = null;
    const itemStatsRecord = record(
      item.stats,
      `equipment ${declaration.itemId}.stats`,
    );
    let pieceManaRecovery = requiredNumber(
      itemStatsRecord,
      "mana_regen_bonus",
      `equipment ${declaration.itemId}.stats.mana_regen_bonus`,
    );
    const inherentArmorSetId = optionalString(
      itemStatsRecord,
      "augment_bonus_set_id",
      `equipment ${declaration.itemId}.stats.augment_bonus_set_id`,
    );
    const inherentArmorSetName = optionalString(
      itemStatsRecord,
      "augment_bonus_set",
      `equipment ${declaration.itemId}.stats.augment_bonus_set`,
    );
    if ((inherentArmorSetId === null) !== (inherentArmorSetName === null)) {
      throw new Error(
        `Equipment '${declaration.itemId}' has incomplete armor-set identity`,
      );
    }
    if (inherentArmorSetId !== null) {
      const definition = requireIdentity(
        catalog.augments,
        inherentArmorSetId,
        `armor set '${inherentArmorSetId}'`,
      );
      armorSetId = inherentArmorSetId;
      registerArmorSet(definition, inherentArmorSetId);
    }
    if (declaration.augmentId !== null) {
      const augment = requireIdentity(
        catalog.augments,
        declaration.augmentId,
        `augment '${declaration.augmentId}'`,
      );
      const defensive = requiredBoolean(
        augment,
        "augment_is_defensive",
        `augment ${declaration.augmentId}.augment_is_defensive`,
      );
      const weaponSlot =
        acceptedCategory === "Weapon" ||
        acceptedCategory === "Bow" ||
        acceptedCategory === "Shield";
      if (defensive === weaponSlot) {
        throw new Error(
          `Augment '${declaration.augmentId}' is incompatible with slot ${declaration.slot}`,
        );
      }
      const members = stringArray(
        augment,
        "augment_armor_set_item_ids",
        `augment ${declaration.augmentId}.augment_armor_set_item_ids`,
      );
      const bonuses = itemStats(augment, `augment ${declaration.augmentId}`);
      if (members.length > 0) {
        if (!members.includes(declaration.itemId)) {
          throw new Error(
            `Armor-set augment '${declaration.augmentId}' does not admit '${declaration.itemId}'`,
          );
        }
        if (armorSetId !== null && armorSetId !== declaration.augmentId) {
          throw new Error(
            `Equipment '${declaration.itemId}' declares two armor sets`,
          );
        }
        armorSetId = declaration.augmentId;
        registerArmorSet(augment, declaration.augmentId);
      } else {
        augmentBonuses = bonuses;
        pieceManaRecovery += requiredNumber(
          record(augment.stats, `augment ${declaration.augmentId}.stats`),
          "mana_regen_bonus",
          `augment ${declaration.augmentId}.stats.mana_regen_bonus`,
        );
      }
    }
    if (declaration.amount > 0 && declaration.durability > 0) {
      manaRecoveryFlat += pieceManaRecovery;
    }
    const piece: CasterEquipmentPiece = {
      slot: declaration.slot,
      amount: declaration.amount,
      durability: declaration.durability,
      armorSetId,
      item: itemBonuses,
      augment: augmentBonuses,
    };
    pieces.push(piece);
    if (itemType === "weapon") {
      weapons.push({
        slot: declaration.slot,
        amount: declaration.amount,
        durability: declaration.durability,
        category: requiredString(
          item,
          "weapon_category",
          `equipment ${declaration.itemId}.weapon_category`,
        ),
        damageBonus: itemBonuses.damage ?? 0,
        requiredAmmoId: optionalString(
          item,
          "weapon_required_ammo_id",
          `equipment ${declaration.itemId}.weapon_required_ammo_id`,
        ),
      });
    }
  }
  const mainHand = weapons.find(
    (weapon) => weapon.slot === 12 && weapon.amount > 0,
  );
  if (
    mainHand?.category.endsWith("2H") &&
    weapons.some((weapon) => weapon.slot === 13 && weapon.amount > 0)
  ) {
    throw new Error(
      "A two-handed main-hand weapon is incompatible with occupied slot 13",
    );
  }
  const setSkillBonuses = new Map<string, number>();
  for (const state of activeArmorSetStates(pieces)) {
    if (!state.skillsActive) continue;
    for (const bonus of setSkillDefinitions.get(state.id) ?? []) {
      setSkillBonuses.set(
        bonus.skillId,
        (setSkillBonuses.get(bonus.skillId) ?? 0) + bonus.level,
      );
    }
  }
  return {
    pieces,
    weapons: weapons.toSorted((left, right) => left.slot - right.slot),
    armorSets: [...armorSets.values()],
    setSkillBonuses,
    manaRecoveryFlat,
  };
}

function resolveCompanion(
  companion: CompanionBuild,
  build: LogicalBuildData,
  catalog: CatalogContext,
): ResolvedCompanion {
  if (companion.kind !== "mercenary") {
    throw new Error(
      `Companion '${companion.entityId}' kind '${companion.kind}' has no catalog definition`,
    );
  }
  if (companion.level !== build.player.level) {
    throw new Error(
      `Companion '${companion.entityId}' level must match its owner`,
    );
  }
  const archetypes = [...catalog.mercenaries.values()].filter(
    (candidate) =>
      requiredString(candidate, "class_id", "mercenary.class_id") ===
      companion.archetypeId,
  );
  if (archetypes.length !== 1) {
    throw new Error(
      `Companion archetype '${companion.archetypeId}' does not resolve to exactly one mercenary definition`,
    );
  }
  const archetype = archetypes[0];
  const classId = casterClass(
    catalog,
    companion.archetypeId,
    "companion.archetypeId",
  );
  const classDefinition = requireIdentity(
    catalog.classes,
    classId,
    `class '${classId}'`,
  );
  const race = companionRace(
    companion.raceId,
    `companion ${companion.entityId}.raceId`,
  );
  const equipment = resolveEquipment(
    companion.equipment,
    "mercenary",
    classId,
    requiredString(classDefinition, "name", `class ${classId}.name`),
    companion.level,
    catalog,
  );
  const orderedSkillIds = [
    ...stringArray(
      archetype,
      "skill_ids",
      `mercenary ${companion.archetypeId}.skill_ids`,
    ),
    ...stringArray(
      archetype,
      "innate_skill_ids",
      `mercenary ${companion.archetypeId}.innate_skill_ids`,
    ),
  ];
  const admittedSkills = new Set(orderedSkillIds);
  for (const allocation of companion.skills) {
    if (!admittedSkills.has(allocation.skillId)) {
      throw new Error(
        `Companion skill '${allocation.skillId}' is incompatible with '${companion.archetypeId}'`,
      );
    }
  }
  // The game derives every companion skill level from its owner's progression. A declared level is
  // an observation that must agree; it cannot choose a different value.
  // Source: server-scripts/PetSkills.cs:27-41.
  const archetypeSkills = orderedSkillIds.map((skillId, index) => {
    const skill = requireIdentity(
      catalog.skills,
      skillId,
      `companion skill '${skillId}'`,
    );
    const level = companionSkillLevel(
      build.player.level,
      build.player.veteranPoints,
      requiredInteger(skill, "max_level", `skill ${skillId}.max_level`),
    );
    const declared = companion.skills.find(
      (allocation) => allocation.skillId === skillId,
    );
    if (declared) {
      assertOptionalName(
        declared.skillName,
        skill,
        `companion skill '${skillId}'`,
      );
      if (declared.level !== level) {
        throw new Error(
          `Companion '${companion.entityId}' declares ${skillId} at level ${declared.level}; the owner's progression gives ${level}`,
        );
      }
    }
    return { skillId, index, skill, level };
  });
  const skills = archetypeSkills.map(({ skill, level }) =>
    resolvedSkill(skill, level, catalog),
  );
  const passiveEffects = archetypeSkills
    .filter(
      ({ skill }) =>
        requiredString(skill, "skill_type", "companion skill.skill_type") ===
        "passive",
    )
    .map(({ skillId, skill, level }) =>
      skillEffects(skill, level, `skill ${skillId}`),
    );
  const rollValues = [
    companion.healthMultiplier,
    companion.resourceMultiplier,
    companion.baseCombat,
  ];
  if (
    rollValues.some((value) => value === null) &&
    !rollValues.every((value) => value === null)
  ) {
    throw new Error(
      `Companion '${companion.entityId}' has an incomplete owned roll`,
    );
  }
  const roll: CompanionRoll =
    companion.healthMultiplier === null
      ? { mode: "best" }
      : {
          mode: "owned",
          healthMultiplier: companion.healthMultiplier,
          resourceMultiplier: companion.resourceMultiplier as number,
          baseCombat: companion.baseCombat as number,
        };
  const state = buildCompanionCombatState({
    archetype: classId as CompanionArchetype,
    race,
    ownerLevel: build.player.level,
    veteranPoints: build.player.veteranPoints,
    roll,
    caster: {
      curves: companionCurves(archetype, companion.archetypeId),
      equipment: equipment.pieces,
      armorSets: equipment.armorSets,
      learnedBooks: { ids: [], catalog: [] },
      bonusSources: passiveEffects.map((effect) => effect.bonuses),
      passives: passiveEffects.map((effect) => ({
        damagePercent: effect.damagePercent,
        magicDamagePercent: effect.magicDamagePercent,
      })),
    },
  });
  const resourceKind: "mana" | "energy" =
    classId === "warrior" || classId === "rogue" ? "energy" : "mana";
  const actions = archetypeSkills
    .filter(({ skill, level }) => level > 0 && isCastable(skill))
    .map(({ skill, index, level }) =>
      engineAction(skill, level, resourceKind, catalog, {
        defaultAttack: index === 0,
      }),
    );
  if (actions.length > 0 && !actions[0].defaultAttack)
    throw new Error(
      `Companion archetype '${companion.archetypeId}' does not list its default attack first`,
    );
  return {
    entityId: companion.entityId,
    archetypeId: companion.archetypeId,
    classId,
    resourceKind,
    resourceRecoveryBase: requiredNumber(
      archetype,
      resourceKind === "mana"
        ? "base_mana_recovery_rate"
        : "base_energy_recovery_rate",
      `mercenary ${companion.archetypeId}.${resourceKind} recovery`,
    ),
    hasHeals: requiredBoolean(
      archetype,
      "has_heals",
      `mercenary ${companion.archetypeId}.has_heals`,
    ),
    weapons: equipment.weapons,
    skills,
    actions,
    state,
  };
}

function resolveConsumable(
  item: ItemQuantity,
  catalog: CatalogContext,
): ResolvedConsumable {
  const definition = requireIdentity(
    catalog.consumables,
    item.itemId,
    `consumable '${item.itemId}'`,
  );
  assertOptionalName(item.itemName, definition, `consumable '${item.itemId}'`);
  const type = requiredString(
    definition,
    "item_type",
    `consumable ${item.itemId}.item_type`,
  );
  if (type !== "food" && type !== "potion")
    throw new Error(`Item '${item.itemId}' is not a consumable`);
  const buffField = type === "food" ? "food_buff_id" : "potion_buff_id";
  const levelField = type === "food" ? "food_buff_level" : "potion_buff_level";
  const buffSkillId = optionalString(
    definition,
    buffField,
    `consumable ${item.itemId}.${buffField}`,
  );
  const buffLevel = requiredInteger(
    definition,
    levelField,
    `consumable ${item.itemId}.${levelField}`,
  );
  if (buffSkillId !== null) {
    requireClassification(catalog, `item_effect:${type}_buff`);
    requireIdentity(
      catalog.skills,
      buffSkillId,
      `consumable buff skill '${buffSkillId}'`,
    );
  }
  const manaRestored = requiredInteger(
    definition,
    "usage_mana",
    `consumable ${item.itemId}.usage_mana`,
  );
  const energyRestored = requiredInteger(
    definition,
    "usage_energy",
    `consumable ${item.itemId}.usage_energy`,
  );
  if (manaRestored > 0)
    requireClassification(catalog, "item_effect:restore_mana");
  if (energyRestored > 0)
    requireClassification(catalog, "item_effect:restore_energy");
  return {
    itemId: item.itemId,
    name: requiredString(definition, "name", `consumable ${item.itemId}.name`),
    quantity: item.quantity,
    buffSkillId,
    buffLevel,
    manaRestored,
    energyRestored,
  };
}

function resolveAmmunition(
  item: ItemQuantity,
  catalog: CatalogContext,
): ResolvedAmmunition {
  const definition = requireIdentity(
    catalog.ammunition,
    item.itemId,
    `ammunition '${item.itemId}'`,
  );
  assertOptionalName(item.itemName, definition, `ammunition '${item.itemId}'`);
  if (
    requiredString(
      definition,
      "item_type",
      `ammunition ${item.itemId}.item_type`,
    ) !== "ammo"
  ) {
    throw new Error(`Item '${item.itemId}' is not ammunition`);
  }
  return {
    itemId: item.itemId,
    name: requiredString(definition, "name", `ammunition ${item.itemId}.name`),
    quantity: item.quantity,
  };
}

function isCastable(skill: Record<string, unknown>): boolean {
  const type = requiredString(skill, "skill_type", "skill.skill_type");
  return (
    DAMAGE_SKILL_CLASSES.has(type as DamageSkillClass) ||
    EFFECT_SKILL_CLASSES.has(type)
  );
}

function engineAction(
  skill: Record<string, unknown>,
  level: number,
  resourceKind: "mana" | "energy",
  catalog: CatalogContext,
  options: { defaultAttack: boolean },
): EngineAction {
  const id = requiredString(skill, "id", "skill.id");
  const skillType = requiredString(
    skill,
    "skill_type",
    `skill ${id}.skill_type`,
  );
  requireClassification(catalog, `skill_type:${skillType}`);
  const isSpell = requiredBoolean(skill, "is_spell", `skill ${id}.is_spell`);
  const requiredWeaponCategory = requiredStringAllowEmpty(
    skill,
    "required_weapon_category",
    `skill ${id}.required_weapon_category`,
  );
  const followupDefaultAttack = requiredBoolean(
    skill,
    "followup_default_attack",
    `skill ${id}.followup_default_attack`,
  );
  const selectedCost = skillValueAtLevel(
    curve(
      skill,
      resourceKind === "mana" ? "mana_cost" : "energy_cost",
      `skill ${id}.${resourceKind}_cost`,
    ),
    level,
  );
  const otherCost = skillValueAtLevel(
    curve(
      skill,
      resourceKind === "mana" ? "energy_cost" : "mana_cost",
      `skill ${id}.other_resource_cost`,
    ),
    level,
  );
  if (otherCost !== 0)
    throw new Error(
      `Skill '${id}' consumes a resource incompatible with its class`,
    );

  const damage = DAMAGE_SKILL_CLASSES.has(skillType as DamageSkillClass)
    ? damageSpecFromSkill(
        skill,
        id,
        skillType as DamageSkillClass,
        level,
        isSpell,
        requiredWeaponCategory,
        followupDefaultAttack,
      )
    : null;
  const effect = EFFECT_SKILL_CLASSES.has(skillType)
    ? effectSpecFromSkill(skill, level, catalog)
    : null;
  return {
    id,
    name: requiredString(skill, "name", `skill ${id}.name`),
    defaultAttack: options.defaultAttack,
    castTime: skillValueAtLevel(
      curve(skill, "cast_time", `skill ${id}.cast_time`),
      level,
    ),
    cooldown: skillValueAtLevel(
      curve(skill, "cooldown", `skill ${id}.cooldown`),
      level,
    ),
    resourceCost: selectedCost,
    isSpell,
    requiredWeaponCategory,
    followupDefaultAttack,
    offensive: damage !== null || effect?.recipient === "target",
    damage,
    effect,
    // The scenario target is stationary inside cast range, so a projectile's flight is shorter than
    // the server tick and arrival coincides with cast completion.
    // Source: server-scripts/TargetProjectileSkill.cs:141-146.
    projectileTravelSeconds: 0,
  };
}

function damageSpecFromSkill(
  skill: Record<string, unknown>,
  id: string,
  skillClass: DamageSkillClass,
  level: number,
  isSpell: boolean,
  requiredWeaponCategory: string,
  followupDefaultAttack: boolean,
): DamageSkillSpec {
  return {
    id,
    skillClass,
    damageType: damageKind(
      requiredString(skill, "damage_type", `skill ${id}.damage_type`),
      `skill ${id}.damage_type`,
    ),
    declaredDamage: skillValueAtLevel(
      curve(skill, "damage", `skill ${id}.damage`),
      level,
    ),
    damagePercent: skillValueAtLevel(
      curve(skill, "damage_percent", `skill ${id}.damage_percent`),
      level,
    ),
    isSpell,
    requiredWeaponCategory,
    requiredWeaponCategory2: requiredStringAllowEmpty(
      skill,
      "required_weapon_category2",
      `skill ${id}.required_weapon_category2`,
    ),
    isScroll: requiredBoolean(skill, "is_scroll", `skill ${id}.is_scroll`),
    isManaburn: requiredBoolean(
      skill,
      "is_manaburn_skill",
      `skill ${id}.is_manaburn_skill`,
    ),
    isAssassination: requiredBoolean(
      skill,
      "is_assassination_skill",
      `skill ${id}.is_assassination_skill`,
    ),
    followupDefaultAttack,
  };
}

const DEBUFF_SCHOOL_FLAGS: ReadonlyArray<[string, DebuffSchool]> = [
  ["is_melee_debuff", "melee"],
  ["is_poison_debuff", "poison"],
  ["is_fire_debuff", "fire"],
  ["is_cold_debuff", "cold"],
  ["is_disease_debuff", "disease"],
  ["is_magic_debuff", "magic"],
];

/**
 * Source: server-scripts/TargetDebuffSkill.cs:101-171 selects the resist school from the first set
 * school flag in this order; a debuff with no flag is not resisted.
 */
function effectSpecFromSkill(
  skill: Record<string, unknown>,
  level: number,
  catalog: CatalogContext,
): EffectSpec {
  const id = requiredString(skill, "id", "skill.id");
  const skillType = requiredString(
    skill,
    "skill_type",
    `skill ${id}.skill_type`,
  );
  requireClassification(catalog, `skill_type:${skillType}`);
  const recipient = EFFECT_SKILL_CLASSES.get(skillType);
  if (recipient === undefined)
    throw new Error(
      `Skill '${id}' of type '${skillType}' applies no timed effect`,
    );
  const path = `skill ${id}`;
  const effects = skillEffects(skill, level, path);
  let school: DebuffSchool | null = null;
  if (recipient === "target") {
    for (const [flag, candidate] of DEBUFF_SCHOOL_FLAGS) {
      if (requiredBoolean(skill, flag, `${path}.${flag}`)) {
        school = candidate;
        break;
      }
    }
  }
  return {
    skillId: id,
    name: requiredString(skill, "name", `${path}.name`),
    category: requiredStringAllowEmpty(
      skill,
      "buff_category",
      `${path}.buff_category`,
    ),
    duration:
      requiredNumber(skill, "duration_base", `${path}.duration_base`) +
      requiredNumber(
        skill,
        "duration_per_level",
        `${path}.duration_per_level`,
      ) *
        (level - 1),
    recipient,
    school,
    decreasesResists: requiredBoolean(
      skill,
      "is_decrease_resists_skill",
      `${path}.is_decrease_resists_skill`,
    ),
    debuffPowerAttribute:
      recipient === "self"
        ? null
        : school === "melee"
          ? "strength"
          : school === "poison" || school === "disease"
            ? "dexterity"
            : "intelligence",
    meleeDebuff: school === "melee",
    bonuses: effects.bonuses,
    damagePercent: effects.damagePercent,
    magicDamagePercent: effects.magicDamagePercent,
    manaRecoveryPercent: effects.manaRecoveryPercent,
    energyRecoveryPercent: effects.energyRecoveryPercent,
    manaRecoveryFlat: effects.manaRecoveryFlat,
    energyRecoveryFlat: effects.energyRecoveryFlat,
    cooldownReductionPercent: skillValueAtLevel(
      curve(
        skill,
        "cooldown_reduction_percent",
        `${path}.cooldown_reduction_percent`,
      ),
      level,
    ),
  };
}

function allocatableSkill(skill: Record<string, unknown>): AllocatableSkill {
  const id = requiredString(skill, "id", "skill.id");
  return {
    id,
    player_classes: stringArray(
      skill,
      "player_classes",
      `skill ${id}.player_classes`,
    ),
    tier: requiredInteger(skill, "tier", `skill ${id}.tier`),
    max_level: requiredInteger(skill, "max_level", `skill ${id}.max_level`),
    learn_default: requiredBoolean(
      skill,
      "learn_default",
      `skill ${id}.learn_default`,
    ),
    is_veteran: requiredBoolean(skill, "is_veteran", `skill ${id}.is_veteran`),
    level_requirement: curve(
      skill,
      "level_requirement",
      `skill ${id}.level_requirement`,
    ),
    skill_point_cost: curve(
      skill,
      "skill_point_cost",
      `skill ${id}.skill_point_cost`,
    ),
    required_spent_points: requiredInteger(
      skill,
      "required_spent_points",
      `skill ${id}.required_spent_points`,
    ),
    prerequisite_skill_id: optionalString(
      skill,
      "prerequisite_skill_id",
      `skill ${id}.prerequisite_skill_id`,
    ),
    prerequisite_level: requiredInteger(
      skill,
      "prerequisite_level",
      `skill ${id}.prerequisite_level`,
    ),
    prerequisite2_skill_id: optionalString(
      skill,
      "prerequisite2_skill_id",
      `skill ${id}.prerequisite2_skill_id`,
    ),
    prerequisite2_level: requiredInteger(
      skill,
      "prerequisite2_level",
      `skill ${id}.prerequisite2_level`,
    ),
  };
}

function resolvedSkill(
  skill: Record<string, unknown>,
  level: number,
  catalog: CatalogContext,
): ResolvedSkill {
  const id = requiredString(skill, "id", "skill.id");
  const type = requiredString(skill, "skill_type", `skill ${id}.skill_type`);
  return {
    id,
    name: requiredString(skill, "name", `skill ${id}.name`),
    level,
    classification: requireClassification(catalog, `skill_type:${type}`),
  };
}

function skillEffects(
  skill: Record<string, unknown>,
  level: number,
  path: string,
): SkillEffects {
  const bonuses: Partial<CasterBonuses> = {
    strength: skillValueAtLevel(
      curve(skill, "strength_bonus", `${path}.strength_bonus`),
      level,
    ),
    constitution: skillValueAtLevel(
      curve(skill, "constitution_bonus", `${path}.constitution_bonus`),
      level,
    ),
    dexterity: skillValueAtLevel(
      curve(skill, "dexterity_bonus", `${path}.dexterity_bonus`),
      level,
    ),
    intelligence: skillValueAtLevel(
      curve(skill, "intelligence_bonus", `${path}.intelligence_bonus`),
      level,
    ),
    wisdom: skillValueAtLevel(
      curve(skill, "wisdom_bonus", `${path}.wisdom_bonus`),
      level,
    ),
    charisma: skillValueAtLevel(
      curve(skill, "charisma_bonus", `${path}.charisma_bonus`),
      level,
    ),
    health: skillValueAtLevel(
      curve(skill, "health_max_bonus", `${path}.health_max_bonus`),
      level,
    ),
    healthPercent: skillValueAtLevel(
      curve(
        skill,
        "health_max_percent_bonus",
        `${path}.health_max_percent_bonus`,
      ),
      level,
    ),
    mana: skillValueAtLevel(
      curve(skill, "mana_max_bonus", `${path}.mana_max_bonus`),
      level,
    ),
    manaPercent: skillValueAtLevel(
      curve(skill, "mana_max_percent_bonus", `${path}.mana_max_percent_bonus`),
      level,
    ),
    energy: skillValueAtLevel(
      curve(skill, "energy_max_bonus", `${path}.energy_max_bonus`),
      level,
    ),
    damage: skillValueAtLevel(
      curve(skill, "damage_bonus", `${path}.damage_bonus`),
      level,
    ),
    magicDamage: skillValueAtLevel(
      curve(skill, "magic_damage_bonus", `${path}.magic_damage_bonus`),
      level,
    ),
    defense: skillValueAtLevel(
      curve(skill, "defense_bonus", `${path}.defense_bonus`),
      level,
    ),
    magicResist: skillValueAtLevel(
      curve(skill, "magic_resist_bonus", `${path}.magic_resist_bonus`),
      level,
    ),
    poisonResist: skillValueAtLevel(
      curve(skill, "poison_resist_bonus", `${path}.poison_resist_bonus`),
      level,
    ),
    fireResist: skillValueAtLevel(
      curve(skill, "fire_resist_bonus", `${path}.fire_resist_bonus`),
      level,
    ),
    coldResist: skillValueAtLevel(
      curve(skill, "cold_resist_bonus", `${path}.cold_resist_bonus`),
      level,
    ),
    diseaseResist: skillValueAtLevel(
      curve(skill, "disease_resist_bonus", `${path}.disease_resist_bonus`),
      level,
    ),
    blockChance: skillValueAtLevel(
      curve(skill, "block_chance_bonus", `${path}.block_chance_bonus`),
      level,
    ),
    accuracy: skillValueAtLevel(
      curve(skill, "accuracy_bonus", `${path}.accuracy_bonus`),
      level,
    ),
    criticalChance: skillValueAtLevel(
      curve(skill, "critical_chance_bonus", `${path}.critical_chance_bonus`),
      level,
    ),
    criticalResist: skillValueAtLevel(
      curve(skill, "critical_resist_bonus", `${path}.critical_resist_bonus`),
      level,
    ),
    haste: skillValueAtLevel(
      curve(skill, "haste_bonus", `${path}.haste_bonus`),
      level,
    ),
    spellHaste: skillValueAtLevel(
      curve(skill, "spell_haste_bonus", `${path}.spell_haste_bonus`),
      level,
    ),
  };
  return {
    bonuses,
    damagePercent: skillValueAtLevel(
      curve(skill, "damage_percent_bonus", `${path}.damage_percent_bonus`),
      level,
    ),
    magicDamagePercent: skillValueAtLevel(
      curve(
        skill,
        "magic_damage_percent_bonus",
        `${path}.magic_damage_percent_bonus`,
      ),
      level,
    ),
    manaRecoveryPercent: skillValueAtLevel(
      curve(
        skill,
        "mana_percent_per_second_bonus",
        `${path}.mana_percent_per_second_bonus`,
      ),
      level,
    ),
    energyRecoveryPercent: skillValueAtLevel(
      curve(
        skill,
        "energy_percent_per_second_bonus",
        `${path}.energy_percent_per_second_bonus`,
      ),
      level,
    ),
    manaRecoveryFlat: skillValueAtLevel(
      curve(skill, "mana_per_second_bonus", `${path}.mana_per_second_bonus`),
      level,
    ),
    energyRecoveryFlat: skillValueAtLevel(
      curve(
        skill,
        "energy_per_second_bonus",
        `${path}.energy_per_second_bonus`,
      ),
      level,
    ),
  };
}

function itemStats(
  item: Record<string, unknown>,
  path: string,
): Partial<CasterBonuses> {
  const stats = record(item.stats, `${path}.stats`);
  for (const [key, value] of Object.entries(stats)) {
    if (!ITEM_STAT_FIELDS.has(key))
      throw new Error(`${path}.stats.${key} is unsupported`);
    if (
      UNSUPPORTED_SELECTED_ITEM_STATS.has(key) &&
      value !== 0 &&
      value !== false
    )
      throw new Error(`${path}.stats.${key} is not supported by the evaluator`);
  }
  const value = (key: string): number =>
    requiredNumber(stats, key, `${path}.stats.${key}`);
  return {
    strength: value("strength"),
    constitution: value("constitution"),
    dexterity: value("dexterity"),
    intelligence: value("intelligence"),
    wisdom: value("wisdom"),
    charisma: value("charisma"),
    health: value("health_bonus"),
    mana: value("mana_bonus"),
    energy: value("energy_bonus"),
    damage: value("damage"),
    magicDamage: value("magic_damage"),
    defense: value("defense"),
    magicResist: value("magic_resist"),
    poisonResist: value("poison_resist"),
    fireResist: value("fire_resist"),
    coldResist: value("cold_resist"),
    diseaseResist: value("disease_resist"),
    accuracy: value("accuracy"),
    blockChance: value("block_chance"),
    criticalChance: value("critical_chance"),
    criticalResist: value("critical_resist"),
    haste: value("haste"),
    spellHaste: value("spell_haste"),
  };
}

function playerCurves(
  combat: Record<string, unknown>,
  classId: string,
): CasterBaseCurves {
  const linear = (name: string) => ({
    base: requiredNumber(
      combat,
      `base_${name}_value`,
      `class combat ${classId}.base_${name}_value`,
    ),
    perLevel: requiredNumber(
      combat,
      `base_${name}_per_level`,
      `class combat ${classId}.base_${name}_per_level`,
    ),
  });
  return {
    health: linear("health"),
    mana: linear("mana"),
    energy: linear("energy"),
    damage: linear("damage"),
    magicDamage: linear("magic_damage"),
    defense: linear("defense"),
    magicResist: linear("magic_resist"),
    poisonResist: linear("poison_resist"),
    fireResist: linear("fire_resist"),
    coldResist: linear("cold_resist"),
    diseaseResist: linear("disease_resist"),
    blockChance: linear("block_chance"),
    accuracy: linear("accuracy"),
    criticalChance: linear("critical_chance"),
  };
}

function companionCurves(
  archetype: Record<string, unknown>,
  id: string,
): CasterBaseCurves {
  const linear = (name: string) => ({
    base: requiredNumber(
      archetype,
      `${name}_base`,
      `mercenary ${id}.${name}_base`,
    ),
    perLevel: requiredNumber(
      archetype,
      `${name}_per_level`,
      `mercenary ${id}.${name}_per_level`,
    ),
  });
  return {
    health: linear("health"),
    mana: linear("mana"),
    energy: linear("energy"),
    damage: linear("damage"),
    magicDamage: linear("magic_damage"),
    defense: linear("defense"),
    magicResist: linear("magic_resist"),
    poisonResist: linear("poison_resist"),
    fireResist: linear("fire_resist"),
    coldResist: linear("cold_resist"),
    diseaseResist: linear("disease_resist"),
    blockChance: linear("block_chance"),
    accuracy: linear("accuracy"),
    criticalChance: linear("critical_chance"),
  };
}

function bookDefinition(value: Record<string, unknown>): LearnedBookDefinition {
  const id = requiredString(value, "id", "learned book.id");
  return {
    id,
    name: requiredString(value, "name", `learned book ${id}.name`),
    gains: attributeSet(value.gains, `learned book ${id}.gains`),
  };
}

function assertScenarioMatchesBuild(
  scenario: EvaluationScenario,
  build: ResolvedLogicalBuild,
): void {
  const entities = [
    build.player.entityId,
    ...build.companions.map((companion) => companion.entityId),
  ].toSorted();
  if (scenario.roster.toSorted().join("\0") !== entities.join("\0")) {
    throw new Error(
      "scenario.roster does not match the resolved logical build",
    );
  }
  assertScenarioSupply(
    scenario.consumables,
    build.consumables,
    build.player.entityId,
    "consumable",
  );
  assertScenarioSupply(
    scenario.ammunition,
    build.ammunition,
    build.player.entityId,
    "ammunition",
  );
}

function assertScenarioSupply(
  supplied: ReadonlyArray<{
    entityId: string;
    itemId: string;
    quantity: number;
  }>,
  owned: ReadonlyArray<{ itemId: string; quantity: number }>,
  playerId: string,
  kind: string,
): void {
  const quantities = new Map(owned.map((item) => [item.itemId, item.quantity]));
  for (const item of supplied) {
    if (item.entityId !== playerId)
      throw new Error(
        `Scenario ${kind} '${item.itemId}' belongs to an unresolved entity`,
      );
    const available = quantities.get(item.itemId);
    if (available === undefined)
      throw new Error(
        `Scenario ${kind} '${item.itemId}' is absent from the logical build`,
      );
    if (item.quantity > available)
      throw new Error(
        `Scenario ${kind} '${item.itemId}' exceeds logical-build quantity ${available}`,
      );
  }
}

function requireClassification(
  catalog: CatalogContext,
  kind: string,
): "modelled" | "excluded" {
  const status = catalog.classifications.get(kind);
  if (status === undefined)
    throw new Error(`Catalog is missing effect classification '${kind}'`);
  return status;
}

function damageKind(value: string, path: string): DamageKind {
  const normalized = value === "Physical" ? "normal" : value.toLowerCase();
  if (
    !new Set<DamageKind>([
      "normal",
      "magic",
      "poison",
      "fire",
      "cold",
      "disease",
    ]).has(normalized as DamageKind)
  ) {
    throw new TypeError(`${path} has unsupported damage type '${value}'`);
  }
  return normalized as DamageKind;
}

function casterClass(
  catalog: CatalogContext,
  value: string,
  path: string,
): CasterClass {
  const reason = catalog.classDomain.excluded.get(value);
  if (reason !== undefined)
    throw new Error(`${path} names excluded class '${value}': ${reason}`);
  if (!catalog.classDomain.supported.has(value))
    throw new TypeError(`${path} has unsupported class '${value}'`);
  return value as CasterClass;
}

function companionRace(value: string, path: string): CompanionRace {
  if (!COMPANION_RACES.has(value as CompanionRace))
    throw new TypeError(`${path} has unsupported race '${value}'`);
  return value as CompanionRace;
}

function addAttributes(left: AttributeSet, right: AttributeSet): AttributeSet {
  return {
    strength: left.strength + right.strength,
    constitution: left.constitution + right.constitution,
    dexterity: left.dexterity + right.dexterity,
    intelligence: left.intelligence + right.intelligence,
    wisdom: left.wisdom + right.wisdom,
    charisma: left.charisma + right.charisma,
  };
}

function assertAttributesEqual(
  actual: AttributeSet,
  expected: AttributeSet,
  path: string,
): void {
  for (const key of ATTRIBUTE_KEYS) {
    if (actual[key] !== expected[key])
      throw new Error(
        `${path}.${key} ${actual[key]} does not match catalog-derived ${expected[key]}`,
      );
  }
}

function attributeSet(value: unknown, path: string): AttributeSet {
  const attributes = record(value, path);
  return {
    strength: requiredInteger(attributes, "strength", `${path}.strength`),
    constitution: requiredInteger(
      attributes,
      "constitution",
      `${path}.constitution`,
    ),
    dexterity: requiredInteger(attributes, "dexterity", `${path}.dexterity`),
    intelligence: requiredInteger(
      attributes,
      "intelligence",
      `${path}.intelligence`,
    ),
    wisdom: requiredInteger(attributes, "wisdom", `${path}.wisdom`),
    charisma: requiredInteger(attributes, "charisma", `${path}.charisma`),
  };
}

function curve(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): SkillGateCurve {
  const value = record(owner[key], path);
  return {
    base_value: requiredNumber(value, "base_value", `${path}.base_value`),
    bonus_per_level: requiredNumber(
      value,
      "bonus_per_level",
      `${path}.bonus_per_level`,
    ),
  };
}

function assertOptionalName(
  name: string | null,
  definition: Record<string, unknown>,
  path: string,
): void {
  if (
    name !== null &&
    name !== requiredString(definition, "name", `${path}.name`)
  )
    throw new Error(
      `${path} name '${name}' does not match its catalog definition`,
    );
}

function indexById(
  values: unknown[],
  path: string,
): Map<string, Record<string, unknown>> {
  return indexByComposite(values, path, (row, rowPath) =>
    requiredString(row, "id", `${rowPath}.id`),
  );
}

function indexByComposite(
  values: unknown[],
  path: string,
  keyOf: (row: Record<string, unknown>, path: string) => string,
): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();
  for (const [index, value] of values.entries()) {
    const rowPath = `${path}[${index}]`;
    const row = record(value, rowPath);
    const key = keyOf(row, rowPath);
    if (result.has(key))
      throw new Error(`${path} has duplicate identity '${key}'`);
    result.set(key, row);
  }
  return result;
}

function requireIdentity(
  index: Map<string, Record<string, unknown>>,
  id: string,
  label: string,
): Record<string, unknown> {
  const value = index.get(id);
  if (!value) throw new Error(`Catalog cannot resolve ${label}`);
  return value;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TypeError(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function array(owner: Record<string, unknown>, key: string): unknown[] {
  const value = owner[key];
  if (!Array.isArray(value)) throw new TypeError(`${key} must be an array`);
  return value;
}

function requiredString(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = owner[key];
  if (typeof value !== "string" || value.trim().length === 0)
    throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function requiredStringAllowEmpty(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = owner[key];
  if (typeof value !== "string")
    throw new TypeError(`${path} must be a string`);
  return value;
}

function optionalString(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = owner[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string")
    throw new TypeError(`${path} must be a string when present`);
  return value;
}

function requiredNumber(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = owner[key];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`${path} must be a finite number`);
  return value;
}

function requiredInteger(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const value = requiredNumber(owner, key, path);
  if (!Number.isInteger(value))
    throw new TypeError(`${path} must be an integer`);
  return value;
}

function requiredBoolean(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): boolean {
  const value = owner[key];
  if (typeof value !== "boolean")
    throw new TypeError(`${path} must be a boolean`);
  return value;
}

function stringArray(
  owner: Record<string, unknown>,
  key: string,
  path: string,
): string[] {
  return array(owner, key).map((value, index) => {
    if (typeof value !== "string" || value.trim().length === 0)
      throw new TypeError(`${path}[${index}] must be a non-empty string`);
    return value;
  });
}
