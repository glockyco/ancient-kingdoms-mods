import { addF32, clamp, f32, iround, multiplyF32 } from "./engine-math";

export interface AttributeSet {
  strength: number;
  constitution: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CasterBonuses extends AttributeSet {
  health: number;
  healthPercent: number;
  mana: number;
  manaPercent: number;
  energy: number;
  damage: number;
  magicDamage: number;
  defense: number;
  magicResist: number;
  poisonResist: number;
  fireResist: number;
  coldResist: number;
  diseaseResist: number;
  accuracy: number;
  blockChance: number;
  criticalChance: number;
  criticalResist: number;
  haste: number;
  spellHaste: number;
}

export interface CasterEquipmentPiece {
  slot: number;
  amount: number;
  durability: number;
  armorSetId?: string | null;
  item: Partial<CasterBonuses>;
  augment?: Partial<CasterBonuses> | null;
}

export interface LinearStat {
  base: number;
  perLevel: number;
}

export interface CasterBaseCurves {
  health: LinearStat;
  mana: LinearStat;
  energy: LinearStat;
  damage: LinearStat;
  magicDamage: LinearStat;
  defense: LinearStat;
  magicResist: LinearStat;
  poisonResist: LinearStat;
  fireResist: LinearStat;
  coldResist: LinearStat;
  diseaseResist: LinearStat;
  blockChance: LinearStat;
  accuracy: LinearStat;
  criticalChance: LinearStat;
}

export interface PassiveDamageBonus {
  damagePercent: number;
  magicDamagePercent: number;
  resourceDepending?: boolean;
}

export interface ArmorSetDefinition {
  id: string;
  attributeBonuses: Partial<AttributeSet>;
}

export interface CasterStatInput {
  kind: "player" | "companion";
  level: number;
  attributes: AttributeSet;
  curves: CasterBaseCurves;
  equipment: readonly CasterEquipmentPiece[];
  armorSets?: readonly ArmorSetDefinition[];
  extraBonuses?: Partial<CasterBonuses>;
  passives?: readonly PassiveDamageBonus[];
  damagePercentBuffs?: readonly number[];
  magicDamagePercentBuffs?: readonly number[];
  energyFraction?: number;
  manaFraction?: number;
  healthMultiplier?: number;
  manaMultiplier?: number;
  energyMultiplier?: number;
}

export interface CasterStatSheet {
  attributes: AttributeSet;
  health: number;
  mana: number;
  energy: number;
  damage: number;
  magicDamage: number;
  defense: number;
  magicResist: number;
  poisonResist: number;
  fireResist: number;
  coldResist: number;
  diseaseResist: number;
  accuracy: number;
  blockChance: number;
  criticalChance: number;
  criticalResist: number;
  haste: number;
  spellHaste: number;
}

const ZERO_BONUSES: CasterBonuses = {
  strength: 0,
  constitution: 0,
  dexterity: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
  health: 0,
  healthPercent: 0,
  mana: 0,
  manaPercent: 0,
  energy: 0,
  damage: 0,
  magicDamage: 0,
  defense: 0,
  magicResist: 0,
  poisonResist: 0,
  fireResist: 0,
  coldResist: 0,
  diseaseResist: 0,
  accuracy: 0,
  blockChance: 0,
  criticalChance: 0,
  criticalResist: 0,
  haste: 0,
  spellHaste: 0,
};

const BONUS_KEYS = Object.keys(ZERO_BONUSES) as Array<keyof CasterBonuses>;
const FLOAT_BONUS_KEYS = new Set<keyof CasterBonuses>([
  "healthPercent",
  "manaPercent",
  "accuracy",
  "blockChance",
  "criticalChance",
  "criticalResist",
  "haste",
  "spellHaste",
]);
const ATTRIBUTE_KEYS: Array<keyof AttributeSet> = [
  "strength",
  "constitution",
  "dexterity",
  "intelligence",
  "wisdom",
  "charisma",
];

/** Builds the properties read from Combat, Health, Mana, and Energy. */
export function buildCasterStatSheet(input: CasterStatInput): CasterStatSheet {
  const equipment = aggregateActiveEquipment(input.equipment);
  const setStates = activeArmorSetStates(input.equipment);
  const activeSetBonuses = (input.armorSets ?? [])
    .filter(
      (definition) =>
        setStates.find((state) => state.id === definition.id)?.attributesActive,
    )
    .map((definition) => definition.attributeBonuses);
  const extra = sumBonuses(input.extraBonuses ?? {}, ...activeSetBonuses);
  const attributes = { ...input.attributes };
  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] += equipment[key] + extra[key];
  }

  const strength = Math.max(0, attributes.strength);
  const constitution = Math.max(0, attributes.constitution);
  const dexterity = Math.max(0, attributes.dexterity);
  const intelligence = Math.max(0, attributes.intelligence);

  const directDamage =
    curveAt(input.curves.damage, input.level) +
    equipment.damage +
    extra.damage +
    iround(strength);
  const directMagicDamage =
    curveAt(input.curves.magicDamage, input.level) +
    equipment.magicDamage +
    extra.magicDamage +
    iround(multiplyF32(intelligence, 1.5));
  const damagePercent = damagePercentTotal(input, "damagePercent");
  const magicDamagePercent = damagePercentTotal(input, "magicDamagePercent");

  const defense = Math.max(
    0,
    curveAt(input.curves.defense, input.level) +
      equipment.defense +
      extra.defense,
  );
  const magicResist = nonNegativeStat(
    input.curves.magicResist,
    input.level,
    equipment.magicResist + extra.magicResist,
  );
  const poisonResist = nonNegativeStat(
    input.curves.poisonResist,
    input.level,
    equipment.poisonResist +
      extra.poisonResist +
      iround(multiplyF32(constitution, 0.25)),
  );
  const fireResist = nonNegativeStat(
    input.curves.fireResist,
    input.level,
    equipment.fireResist + extra.fireResist,
  );
  const coldResist = nonNegativeStat(
    input.curves.coldResist,
    input.level,
    equipment.coldResist + extra.coldResist,
  );
  const diseaseResist = nonNegativeStat(
    input.curves.diseaseResist,
    input.level,
    equipment.diseaseResist + extra.diseaseResist,
  );

  const healthBase = iround(
    multiplyF32(
      curveAt(input.curves.health, input.level),
      input.healthMultiplier ?? 1,
    ),
  );
  const healthFlat = equipment.health + extra.health + constitution * 25;
  const healthSubtotal = healthBase + healthFlat;
  const healthPercent = addF32(equipment.healthPercent, extra.healthPercent);

  const manaBase = iround(
    multiplyF32(
      curveAt(input.curves.mana, input.level),
      input.manaMultiplier ?? 1,
    ),
  );
  const manaFlat = equipment.mana + extra.mana + intelligence * 20;
  const manaSubtotal = manaBase + manaFlat;
  const manaPercent = addF32(equipment.manaPercent, extra.manaPercent);

  const accuracyBonus = sumF32(
    equipment.accuracy,
    extra.accuracy,
    multiplyF32(dexterity, 0.0005),
  );
  const blockBonus = sumF32(
    equipment.blockChance,
    extra.blockChance,
    multiplyF32(constitution, 0.0003),
    multiplyF32(defense, 0.0001),
  );
  const criticalBonus = sumF32(
    equipment.criticalChance,
    extra.criticalChance,
    multiplyF32(dexterity, 0.0003),
  );

  return {
    attributes,
    health: healthSubtotal + iround(multiplyF32(healthPercent, healthSubtotal)),
    mana: manaSubtotal + iround(multiplyF32(manaPercent, manaSubtotal)),
    // Energy.max does not read multiplierEnergy.
    energy:
      curveAt(input.curves.energy, input.level) +
      equipment.energy +
      extra.energy +
      strength * 10,
    damage: Math.max(
      0,
      directDamage + iround(multiplyF32(directDamage, damagePercent)),
    ),
    magicDamage: Math.max(
      0,
      directMagicDamage +
        iround(multiplyF32(directMagicDamage, magicDamagePercent)),
    ),
    defense,
    magicResist,
    poisonResist,
    fireResist,
    coldResist,
    diseaseResist,
    accuracy: clamp(
      addF32(floatCurveAt(input.curves.accuracy, input.level), accuracyBonus),
      -0.5,
      1,
    ),
    blockChance: clamp(
      addF32(floatCurveAt(input.curves.blockChance, input.level), blockBonus),
      0,
      0.8,
    ),
    criticalChance: clamp(
      addF32(
        floatCurveAt(input.curves.criticalChance, input.level),
        criticalBonus,
      ),
      0,
      0.7,
    ),
    criticalResist: clamp(
      sumF32(
        equipment.criticalResist,
        extra.criticalResist,
        multiplyF32(dexterity, 0.0005),
      ),
      0,
      1,
    ),
    haste: clamp(sumF32(equipment.haste, extra.haste), -0.8, 0.8),
    spellHaste: clamp(
      sumF32(equipment.spellHaste, extra.spellHaste),
      -0.5,
      0.5,
    ),
  };
}

export interface ArmorSetState {
  id: string;
  activePieces: number;
  attributesActive: boolean;
  skillsActive: boolean;
}

/** Source: server-scripts/PlayerEquipment.cs:186-327,1615-1627. */
export function activeArmorSetStates(
  equipment: readonly CasterEquipmentPiece[],
): ArmorSetState[] {
  const counts = new Map<string, number>();
  for (const piece of equipment) {
    if (!isActivePiece(piece) || !piece.armorSetId) continue;
    counts.set(piece.armorSetId, (counts.get(piece.armorSetId) ?? 0) + 1);
  }
  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, activePieces]) => ({
      id,
      activePieces,
      attributesActive: activePieces >= 3,
      skillsActive: activePieces >= 5,
    }));
}

export function aggregateActiveEquipment(
  equipment: readonly CasterEquipmentPiece[],
): CasterBonuses {
  return sumBonuses(
    ...equipment
      .filter(isActivePiece)
      .flatMap((piece) => [piece.item, piece.augment ?? {}]),
  );
}

function isActivePiece(piece: CasterEquipmentPiece): boolean {
  return piece.amount > 0 && piece.durability > 0;
}

function damagePercentTotal(
  input: CasterStatInput,
  field: keyof Pick<PassiveDamageBonus, "damagePercent" | "magicDamagePercent">,
): number {
  let total = 0;
  const resourceFraction =
    field === "damagePercent"
      ? clamp(input.energyFraction ?? 1, 0, 1)
      : clamp(input.manaFraction ?? 1, 0, 1);
  for (const passive of input.passives ?? []) {
    const scale =
      input.kind === "player" && passive.resourceDepending
        ? resourceFraction
        : 1;
    total = addF32(total, multiplyF32(passive[field], scale));
  }
  const buffs =
    field === "damagePercent"
      ? input.damagePercentBuffs
      : input.magicDamagePercentBuffs;
  for (const bonus of buffs ?? []) total = addF32(total, bonus);
  return total;
}

function sumBonuses(...sources: Array<Partial<CasterBonuses>>): CasterBonuses {
  const total = { ...ZERO_BONUSES };
  for (const source of sources) {
    for (const key of BONUS_KEYS) {
      const value = source[key] ?? 0;
      total[key] = FLOAT_BONUS_KEYS.has(key)
        ? addF32(total[key], value)
        : total[key] + value;
    }
  }
  return total;
}

function sumF32(...values: number[]): number {
  return values.reduce(addF32, f32(0));
}

function curveAt(curve: LinearStat, level: number): number {
  return curve.base + curve.perLevel * (level - 1);
}

function floatCurveAt(curve: LinearStat, level: number): number {
  return addF32(curve.base, multiplyF32(curve.perLevel, level - 1));
}

function nonNegativeStat(
  curve: LinearStat,
  level: number,
  bonus: number,
): number {
  return Math.max(0, curveAt(curve, level) + bonus);
}
