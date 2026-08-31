import {
  addF32,
  ceilToInt,
  clamp,
  expectedBernoulli,
  iround,
  multiplyF32,
} from "./engine-math";
import type { DamageKind } from "./scenario";
import {
  hitAvoidanceProbability,
  isInvulnerable,
  mitigateLandedDamage,
  type TargetCombatStats,
} from "./target";

export type DamageSkillClass =
  | "target_damage"
  | "frontal_damage"
  | "area_damage"
  | "target_projectile"
  | "frontal_projectiles";

export type CasterClass =
  "warrior" | "ranger" | "cleric" | "rogue" | "wizard" | "druid";

export interface EquippedWeapon {
  slot: number;
  amount: number;
  durability: number;
  category: string;
  damageBonus: number;
  requiredAmmoId?: string | null;
}

export interface HitCaster {
  kind: "player" | "companion";
  classId: CasterClass;
  level: number;
  damage: number;
  magicDamage: number;
  accuracy: number;
  criticalChance: number;
  dexterity: number;
  energyCurrent: number;
  manaCurrent: number;
  weapons: readonly EquippedWeapon[];
  ammunition?: Readonly<Record<string, number>>;
  endlessQuiver?: boolean;
  enhancedBackstab?: boolean;
}

export interface DamageSkillSpec {
  id: string;
  skillClass: DamageSkillClass;
  damageType: DamageKind;
  declaredDamage: number;
  damagePercent: number;
  isSpell: boolean;
  requiredWeaponCategory: string;
  requiredWeaponCategory2?: string;
  isScroll?: boolean;
  isManaburn?: boolean;
  isAssassination?: boolean;
  followupDefaultAttack?: boolean;
}

export interface HitTarget extends TargetCombatStats {
  currentHealth: number;
  maximumHealth: number;
  criticalResist?: number;
}

export interface DamageIntent {
  amount: number;
  damageType: DamageKind;
  bypassAvoidanceAndMitigation: boolean;
  resourceSpent: { resource: "energy" | "mana"; amount: number } | null;
  normalizedDefects: string[];
  ignoredPopulatedFields: string[];
}

export interface HitEvaluation {
  refused: string | null;
  intent: DamageIntent | null;
  avoidanceProbability: number;
  landedDamage: number;
  expectedDamage: number;
  nonCriticalBand: [number, number];
  ammunitionPerCast: number;
}

export interface HitEvaluationOptions {
  sameFacing?: boolean;
  movingPlayerTarget?: boolean;
  normalizeKnownDefects?: boolean;
}

export function evaluateHit(
  caster: HitCaster,
  target: HitTarget,
  skill: DamageSkillSpec,
  options: HitEvaluationOptions = {},
): HitEvaluation {
  const refusal = hitRefusal(caster, target, skill);
  if (refusal) return refusedHit(refusal);
  if (isInvulnerable(target)) return refusedHit("target is invulnerable");

  const intent = buildDamageIntent(
    caster,
    skill,
    options.normalizeKnownDefects ?? true,
  );
  const positional =
    options.sameFacing === true &&
    (skill.skillClass === "target_damage" ||
      skill.skillClass === "target_projectile");
  const pipelineOptions = { ...options, sameFacing: positional };
  const movingIntent = options.movingPlayerTarget
    ? intent.amount + Math.trunc(multiplyF32(intent.amount, 0.1))
    : intent.amount;
  const avoidanceProbability = hitAvoidanceProbability({
    target,
    casterLevel: caster.level,
    casterAccuracy: caster.accuracy,
    damageType: intent.damageType,
    sameFacing: positional,
    movingPlayerTarget: options.movingPlayerTarget,
    manaburn: intent.bypassAvoidanceAndMitigation,
  });

  const minimum = landedNonCriticalDamage(
    movingIntent,
    0.9,
    caster,
    target,
    intent,
    pipelineOptions,
  );
  const landedDamage = landedNonCriticalDamage(
    movingIntent,
    1,
    caster,
    target,
    intent,
    pipelineOptions,
  );
  const maximum = landedNonCriticalDamage(
    movingIntent,
    1.1,
    caster,
    target,
    intent,
    pipelineOptions,
  );
  const criticalMultiplier = addF32(
    1,
    multiplyF32(0.5, 1 - clamp(target.criticalResist ?? 0, 0, 1)),
  );
  const criticalDamage =
    landedDamage > 3
      ? iround(multiplyF32(landedDamage, criticalMultiplier))
      : landedDamage;
  const expectedLandedDamage = expectedBernoulli(
    caster.criticalChance,
    criticalDamage,
    landedDamage,
  );

  return {
    refused: null,
    intent,
    avoidanceProbability,
    landedDamage,
    expectedDamage: expectedBernoulli(
      1 - avoidanceProbability,
      expectedLandedDamage,
    ),
    nonCriticalBand: [minimum, maximum],
    ammunitionPerCast: ammunitionPerCast(caster, skill),
  };
}

export function buildDamageIntent(
  caster: HitCaster,
  skill: DamageSkillSpec,
  normalizeKnownDefects = true,
): DamageIntent {
  const resourceBurn = resourceBurnIntent(caster, skill);
  if (resourceBurn) return resourceBurn;

  const normalizedDefects: string[] = [];
  const ignoredPopulatedFields: string[] = [];
  let stat = handlerCombatStat(
    caster,
    skill,
    normalizeKnownDefects,
    normalizedDefects,
  );
  if (skill.isScroll) stat = 0;
  if (skill.requiredWeaponCategory2) {
    ignoredPopulatedFields.push("requiredWeaponCategory2");
  }
  let amount = stat + skill.declaredDamage;
  if (skill.skillClass !== "frontal_projectiles" && skill.damagePercent > 0) {
    amount = iround(multiplyF32(amount, skill.damagePercent));
  } else if (
    skill.skillClass === "frontal_projectiles" &&
    skill.damagePercent > 0
  ) {
    ignoredPopulatedFields.push("damagePercent");
  }

  return {
    amount,
    damageType: skill.damageType,
    bypassAvoidanceAndMitigation: skill.isManaburn === true,
    resourceSpent: null,
    normalizedDefects,
    ignoredPopulatedFields,
  };
}

export function weaponGateRefusal(
  caster: HitCaster,
  skill: DamageSkillSpec,
): string | null {
  const required = skill.requiredWeaponCategory.trim();
  if (!required) return null;
  if (caster.kind !== "player") {
    return `skill ${skill.id} requires player weapon category ${required}`;
  }

  if (required === "Bow" || required === "Shield") {
    return occupiedWeapon(caster, 13)
      ? null
      : `skill ${skill.id} requires occupied slot 13 for ${required}`;
  }
  if (caster.classId === "rogue" && !occupiedWeapon(caster, 12)) {
    return `skill ${skill.id} requires occupied slot 12 for Rogue`;
  }
  const equipped = firstOccupiedWeapon(caster);
  if (!equipped?.category.startsWith(required)) {
    return `skill ${skill.id} requires weapon category ${required}`;
  }
  return null;
}

function hitRefusal(
  caster: HitCaster,
  target: HitTarget,
  skill: DamageSkillSpec,
): string | null {
  const weaponRefusal = weaponGateRefusal(caster, skill);
  if (weaponRefusal) return weaponRefusal;
  if (
    skill.isAssassination &&
    target.currentHealth > iround(target.maximumHealth / 4)
  ) {
    return `skill ${skill.id} requires target health at or below one quarter`;
  }
  if (skill.skillClass === "target_projectile") {
    const ammunition = requiredAmmunition(caster, skill);
    if (ammunition && (caster.ammunition?.[ammunition] ?? 0) <= 0) {
      return `skill ${skill.id} requires ammunition ${ammunition}`;
    }
  }
  return null;
}

function resourceBurnIntent(
  caster: HitCaster,
  skill: DamageSkillSpec,
): DamageIntent | null {
  if (!skill.isManaburn || caster.kind !== "player") return null;
  if (
    skill.skillClass === "target_damage" &&
    (caster.classId === "warrior" || caster.classId === "rogue")
  ) {
    return {
      amount: caster.energyCurrent * 2,
      damageType: skill.damageType,
      bypassAvoidanceAndMitigation: true,
      resourceSpent: { resource: "energy", amount: caster.energyCurrent },
      normalizedDefects: [],
      ignoredPopulatedFields: [],
    };
  }
  if (skill.skillClass === "target_projectile" && caster.classId === "wizard") {
    return {
      amount: caster.manaCurrent * 2,
      damageType: skill.damageType,
      bypassAvoidanceAndMitigation: true,
      resourceSpent: { resource: "mana", amount: caster.manaCurrent },
      normalizedDefects: [],
      ignoredPopulatedFields: [],
    };
  }
  return null;
}

function handlerCombatStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
  normalizeKnownDefects: boolean,
  normalizedDefects: string[],
): number {
  if (
    skill.skillClass !== "frontal_projectiles" &&
    skill.declaredDamage <= 0 &&
    skill.damagePercent <= 0
  ) {
    return 0;
  }
  switch (skill.skillClass) {
    case "target_damage":
      return targetDamageStat(
        caster,
        skill,
        normalizeKnownDefects,
        normalizedDefects,
      );
    case "frontal_damage":
      return frontalDamageStat(
        caster,
        skill,
        normalizeKnownDefects,
        normalizedDefects,
      );
    case "area_damage":
      return areaDamageStat(caster, skill);
    case "target_projectile":
      return targetProjectileStat(
        caster,
        skill,
        normalizeKnownDefects,
        normalizedDefects,
      );
    case "frontal_projectiles":
      return frontalProjectilesStat(caster, skill);
  }
}

function targetDamageStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
  normalizeKnownDefects: boolean,
  normalizedDefects: string[],
): number {
  let stat = baseCombatStat(caster, skill, true);
  if (caster.kind === "player" && caster.classId === "ranger") {
    stat -= offhandDamageForMelee(
      caster,
      normalizeKnownDefects,
      normalizedDefects,
    );
  }
  if (caster.kind === "player" && caster.classId === "rogue") {
    const offhand = occupiedWeapon(caster, 13);
    if (offhand && (!normalizeKnownDefects || offhand.durability > 0)) {
      stat -= ceilToInt(multiplyF32(offhand.damageBonus, 0.5));
    } else if (offhand && normalizeKnownDefects) {
      normalizedDefects.push("broken offhand subtraction");
    }
  }
  return stat;
}

function frontalDamageStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
  normalizeKnownDefects: boolean,
  normalizedDefects: string[],
): number {
  let stat: number;
  if (isMagicSchoolWithoutPoison(skill.damageType)) {
    stat = caster.magicDamage;
  } else if (skill.damageType === "poison" && caster.kind === "player") {
    stat =
      caster.classId === "rogue"
        ? caster.damage + poisonDexterityBonus(caster)
        : caster.magicDamage;
  } else {
    stat = caster.damage;
  }
  if (isMagicWeaponSkill(skill)) stat += caster.damage;
  if (caster.kind === "player" && caster.classId === "ranger") {
    stat -= offhandDamageForMelee(
      caster,
      normalizeKnownDefects,
      normalizedDefects,
    );
  }
  return stat;
}

function areaDamageStat(caster: HitCaster, skill: DamageSkillSpec): number {
  return isMagicSchoolWithoutPoison(skill.damageType)
    ? caster.magicDamage
    : caster.damage;
}

function targetProjectileStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
  normalizeKnownDefects: boolean,
  normalizedDefects: string[],
): number {
  let stat: number;
  if (isMagicSchoolWithoutPoison(skill.damageType)) {
    stat = caster.magicDamage;
  } else if (
    caster.kind === "player" &&
    skill.requiredWeaponCategory === "Bow"
  ) {
    stat = caster.damage + rangedDexterityBonus(caster);
    const weaponToRemove = normalizeKnownDefects
      ? activeWeapon(caster, 12)
      : firstOccupiedWeapon(caster);
    if (weaponToRemove) stat -= weaponToRemove.damageBonus;
    if (
      normalizeKnownDefects &&
      !activeWeapon(caster, 12) &&
      occupiedWeapon(caster, 13)
    ) {
      normalizedDefects.push("bow-only self-subtraction");
    }
  } else if (caster.kind === "companion" && caster.classId === "ranger") {
    stat = caster.damage + rangedDexterityBonus(caster);
  } else if (skill.damageType === "poison") {
    stat =
      caster.classId === "rogue" && caster.kind === "player"
        ? caster.damage + poisonDexterityBonus(caster)
        : caster.magicDamage;
  } else {
    stat = caster.damage;
  }
  if (isMagicWeaponSkill(skill)) stat += caster.damage;
  return stat;
}

function frontalProjectilesStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
): number {
  if (skill.declaredDamage <= 0) return 0;
  if (caster.kind === "player" && caster.classId === "ranger") {
    return caster.damage + rangedDexterityBonus(caster);
  }
  if (
    skill.damageType === "poison" &&
    caster.kind === "player" &&
    caster.classId === "rogue"
  ) {
    return caster.damage + poisonDexterityBonus(caster);
  }
  return skill.damageType === "normal" ? caster.damage : caster.magicDamage;
}

function baseCombatStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
  companionRoguePoison: boolean,
): number {
  let stat: number;
  if (isMagicSchoolWithoutPoison(skill.damageType)) {
    stat = caster.magicDamage;
  } else if (skill.damageType === "poison") {
    stat =
      caster.classId === "rogue" &&
      (caster.kind === "player" ||
        (caster.kind === "companion" && companionRoguePoison))
        ? caster.damage + poisonDexterityBonus(caster)
        : caster.magicDamage;
  } else {
    stat = caster.damage;
  }
  if (isMagicWeaponSkill(skill)) stat += caster.damage;
  return stat;
}

function landedNonCriticalDamage(
  intent: number,
  variance: number,
  caster: HitCaster,
  target: HitTarget,
  damageIntent: DamageIntent,
  options: HitEvaluationOptions,
): number {
  if (intent <= 0) return 0;
  let amount = iround(multiplyF32(intent, variance));
  if (options.sameFacing) {
    const enhancedBackstab =
      (caster.kind === "companion" && caster.classId === "rogue") ||
      (caster.kind === "player" && caster.enhancedBackstab === true);
    const bonus = enhancedBackstab ? 0.25 : 0.1;
    amount += ceilToInt(multiplyF32(amount, bonus)) + 1;
  }
  amount += ceilToInt(
    multiplyF32(
      amount,
      clamp(multiplyF32(caster.level - target.level, 0.02), -0.2, 0.2),
    ),
  );
  return damageIntent.bypassAvoidanceAndMitigation
    ? amount
    : mitigateLandedDamage(amount, target, damageIntent.damageType);
}

function offhandDamageForMelee(
  caster: HitCaster,
  normalizeKnownDefects: boolean,
  normalizedDefects: string[],
): number {
  const offhand = occupiedWeapon(caster, 13);
  if (!offhand) return 0;
  if (normalizeKnownDefects && offhand.durability <= 0) {
    normalizedDefects.push("broken offhand subtraction");
    return 0;
  }
  return offhand.damageBonus;
}

function requiredAmmunition(
  caster: HitCaster,
  skill: DamageSkillSpec,
): string | null {
  if (
    caster.kind !== "player" ||
    skill.requiredWeaponCategory.trim().length === 0
  ) {
    return null;
  }
  const weapon =
    caster.classId === "ranger" && skill.requiredWeaponCategory === "Bow"
      ? occupiedWeapon(caster, 13)
      : firstOccupiedWeapon(caster);
  return weapon?.requiredAmmoId ?? null;
}

function ammunitionPerCast(caster: HitCaster, skill: DamageSkillSpec): number {
  if (
    skill.skillClass !== "target_projectile" ||
    !requiredAmmunition(caster, skill)
  ) {
    return 0;
  }
  return caster.classId === "ranger" && caster.endlessQuiver ? 0.5 : 1;
}

function occupiedWeapon(
  caster: HitCaster,
  slot: number,
): EquippedWeapon | undefined {
  return caster.weapons.find(
    (weapon) => weapon.slot === slot && weapon.amount > 0,
  );
}

function activeWeapon(
  caster: HitCaster,
  slot: number,
): EquippedWeapon | undefined {
  const weapon = occupiedWeapon(caster, slot);
  return weapon && weapon.durability > 0 ? weapon : undefined;
}

function firstOccupiedWeapon(caster: HitCaster): EquippedWeapon | undefined {
  return [...caster.weapons]
    .sort((left, right) => left.slot - right.slot)
    .find((weapon) => weapon.amount > 0);
}

function rangedDexterityBonus(caster: HitCaster): number {
  return iround(multiplyF32(Math.max(0, caster.dexterity), 1.5));
}

function poisonDexterityBonus(caster: HitCaster): number {
  return iround(multiplyF32(Math.max(0, caster.dexterity), 2.5));
}

function isMagicSchoolWithoutPoison(damageType: DamageKind): boolean {
  return (
    damageType === "magic" ||
    damageType === "fire" ||
    damageType === "cold" ||
    damageType === "disease"
  );
}

function isMagicWeaponSkill(skill: DamageSkillSpec): boolean {
  return (
    skill.damageType === "magic" &&
    !skill.isSpell &&
    skill.requiredWeaponCategory.startsWith("Weapon")
  );
}

function refusedHit(refused: string): HitEvaluation {
  return {
    refused,
    intent: null,
    avoidanceProbability: 0,
    landedDamage: 0,
    expectedDamage: 0,
    nonCriticalBand: [0, 0],
    ammunitionPerCast: 0,
  };
}
