import { addF32, ceilToInt, clamp, iround, multiplyF32 } from "./engine-math";
import type { RandomSource } from "./random";
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
  ignoredPopulatedFields: string[];
}

export interface HitOptions {
  sameFacing?: boolean;
  movingPlayerTarget?: boolean;
}

/** A hit whose deterministic terms are fixed; only the draws remain. */
export type PreparedHit =
  | { refused: string; intent: null }
  | {
      refused: null;
      intent: DamageIntent;
      avoidanceProbability: number;
      criticalChance: number;
      ammunitionPerCast: number;
      /** Landed non-critical damage for one variance roll in [0.9, 1.1]. */
      landed: (varianceRoll: number) => number;
      /** Landed non-critical damage at the extreme variance rolls. */
      supportBand: [number, number];
      /** Critical damage for a landed amount. Source: server-scripts/Combat.cs:864-880. */
      critical: (landedDamage: number) => number;
    };

export interface HitOutcome {
  avoided: boolean;
  critical: boolean;
  varianceRoll: number;
  damage: number;
}

/**
 * Fixes every deterministic term of one hit from current caster and target state. Source order:
 * server-scripts/Combat.cs:702 (avoidance), :774 (variance), :865 (critical).
 */
export function prepareHit(
  caster: HitCaster,
  target: HitTarget,
  skill: DamageSkillSpec,
  options: HitOptions = {},
): PreparedHit {
  const refusal = hitRefusal(caster, target, skill);
  if (refusal) return { refused: refusal, intent: null };
  if (isInvulnerable(target))
    return { refused: "target is invulnerable", intent: null };

  const intent = buildDamageIntent(caster, skill);
  const positional =
    options.sameFacing === true &&
    (skill.skillClass === "target_damage" ||
      skill.skillClass === "target_projectile");
  const pipelineOptions: HitOptions = { ...options, sameFacing: positional };
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
  const landed = (varianceRoll: number): number =>
    landedNonCriticalDamage(
      movingIntent,
      varianceRoll,
      caster,
      target,
      intent,
      pipelineOptions,
    );
  const criticalMultiplier = addF32(
    1,
    multiplyF32(0.5, 1 - clamp(target.criticalResist ?? 0, 0, 1)),
  );
  return {
    refused: null,
    intent,
    avoidanceProbability,
    criticalChance: caster.criticalChance,
    ammunitionPerCast: ammunitionPerCast(caster, skill),
    landed,
    supportBand: [landed(0.9), landed(1.1)],
    critical: (landedDamage) =>
      iround(multiplyF32(landedDamage, criticalMultiplier)),
  };
}

/** Draws avoidance, variance, and the critical roll in the engine's order. */
export function sampleHit(
  hit: Extract<PreparedHit, { refused: null }>,
  random: RandomSource,
): HitOutcome {
  if (random.bernoulli(hit.avoidanceProbability))
    return { avoided: true, critical: false, varianceRoll: 1, damage: 0 };
  const varianceRoll = random.range(0.9, 1.1);
  const landed = hit.landed(varianceRoll);
  const critical = landed > 3 && random.bernoulli(hit.criticalChance);
  return {
    avoided: false,
    critical,
    varianceRoll,
    damage: critical ? hit.critical(landed) : landed,
  };
}

/**
 * Sources: server-scripts/TargetDamageSkill.cs:159-236,
 * FrontalDamageSkill.cs:60-101 and AreaDamageSkill.cs:85-106.
 */
/**
 * Sources: server-scripts/TargetProjectileSkill.cs:181-221 and
 * FrontalProjectilesSkill.cs:95-111.
 */
export function buildDamageIntent(
  caster: HitCaster,
  skill: DamageSkillSpec,
): DamageIntent {
  const resourceBurn = resourceBurnIntent(caster, skill);
  if (resourceBurn) return resourceBurn;

  const ignoredPopulatedFields: string[] = [];
  let stat = handlerCombatStat(caster, skill);
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
    ignoredPopulatedFields,
  };
}

/** Source: server-scripts/ScriptableSkill.cs:84-120. */
export function weaponGateRefusal(
  caster: Pick<HitCaster, "kind" | "classId" | "weapons">,
  skill: Pick<DamageSkillSpec, "id" | "requiredWeaponCategory">,
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

/**
 * Sources: server-scripts/PlayerSkills.cs:349-389 and
 * server-scripts/TargetProjectileSkill.cs:44-64.
 */
export function hitRefusal(
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
    const ammunition = requiredAmmunitionForSkill(caster, skill);
    if (ammunition && (caster.ammunition?.[ammunition] ?? 0) <= 0) {
      return `skill ${skill.id} requires ammunition ${ammunition}`;
    }
  }
  return null;
}

/**
 * A burn skill spends the caster's whole resource pool and deals a multiple of it, bypassing
 * avoidance and mitigation. The multiplier differs per handler: rage burn doubles, mana burn
 * triples.
 * Sources: server-scripts/TargetDamageSkill.cs:152-157 and
 * server-scripts/TargetProjectileSkill.cs:216-221.
 */
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
      ignoredPopulatedFields: [],
    };
  }
  if (skill.skillClass === "target_projectile" && caster.classId === "wizard") {
    return {
      amount: caster.manaCurrent * 3,
      damageType: skill.damageType,
      bypassAvoidanceAndMitigation: true,
      resourceSpent: { resource: "mana", amount: caster.manaCurrent },
      ignoredPopulatedFields: [],
    };
  }
  return null;
}

function handlerCombatStat(caster: HitCaster, skill: DamageSkillSpec): number {
  if (
    skill.skillClass !== "frontal_projectiles" &&
    skill.declaredDamage <= 0 &&
    skill.damagePercent <= 0
  ) {
    return 0;
  }
  switch (skill.skillClass) {
    case "target_damage":
      return targetDamageStat(caster, skill);
    case "frontal_damage":
      return frontalDamageStat(caster, skill);
    case "area_damage":
      return areaDamageStat(caster, skill);
    case "target_projectile":
      return targetProjectileStat(caster, skill);
    case "frontal_projectiles":
      return frontalProjectilesStat(caster, skill);
  }
}

/**
 * Source: server-scripts/TargetDamageSkill.cs:218-223. A broken offhand still subtracts the damage
 * it no longer grants; see docs/game-bugs/broken-offhand-subtracts-damage-it-never-gave.md.
 */
function targetDamageStat(caster: HitCaster, skill: DamageSkillSpec): number {
  let stat = baseCombatStat(caster, skill, true);
  if (caster.kind === "player" && caster.classId === "ranger") {
    stat -= offhandDamageForMelee(caster);
  }
  if (caster.kind === "player" && caster.classId === "rogue") {
    const offhand = occupiedWeapon(caster, 13);
    if (offhand) stat -= ceilToInt(multiplyF32(offhand.damageBonus, 0.5));
  }
  return stat;
}

function frontalDamageStat(caster: HitCaster, skill: DamageSkillSpec): number {
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
    stat -= offhandDamageForMelee(caster);
  }
  return stat;
}

function areaDamageStat(caster: HitCaster, skill: DamageSkillSpec): number {
  return isMagicSchoolWithoutPoison(skill.damageType)
    ? caster.magicDamage
    : caster.damage;
}

/**
 * Source: server-scripts/TargetProjectileSkill.cs:196-201. A bow without a melee weapon subtracts its own
 * damage; see docs/game-bugs/a-bow-without-a-melee-weapon-cancels-its-own-damage.md.
 */
function targetProjectileStat(
  caster: HitCaster,
  skill: DamageSkillSpec,
): number {
  let stat: number;
  if (isMagicSchoolWithoutPoison(skill.damageType)) {
    stat = caster.magicDamage;
  } else if (
    caster.kind === "player" &&
    skill.requiredWeaponCategory === "Bow"
  ) {
    stat = caster.damage + rangedDexterityBonus(caster);
    const weaponToRemove = firstOccupiedWeapon(caster);
    if (weaponToRemove) stat -= weaponToRemove.damageBonus;
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

/** Source: server-scripts/Combat.cs:774-860. */
function landedNonCriticalDamage(
  intent: number,
  variance: number,
  caster: HitCaster,
  target: HitTarget,
  damageIntent: DamageIntent,
  options: HitOptions,
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

function offhandDamageForMelee(caster: HitCaster): number {
  return occupiedWeapon(caster, 13)?.damageBonus ?? 0;
}

/** Source: server-scripts/TargetProjectileSkill.cs:44-104. */
export function requiredAmmunitionForSkill(
  caster: Pick<HitCaster, "kind" | "classId" | "weapons">,
  skill: Pick<DamageSkillSpec, "requiredWeaponCategory">,
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
    !requiredAmmunitionForSkill(caster, skill)
  ) {
    return 0;
  }
  return caster.classId === "ranger" && caster.endlessQuiver ? 0.5 : 1;
}

function occupiedWeapon(
  caster: Pick<HitCaster, "weapons">,
  slot: number,
): EquippedWeapon | undefined {
  return caster.weapons.find(
    (weapon) => weapon.slot === slot && weapon.amount > 0,
  );
}

function firstOccupiedWeapon(
  caster: Pick<HitCaster, "weapons">,
): EquippedWeapon | undefined {
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
