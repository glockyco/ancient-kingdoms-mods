import { describe, expect, it } from "vitest";
import {
  activeArmorSetStates,
  buildCasterStatSheet,
  type CasterBaseCurves,
  type CasterStatInput,
} from "./caster";

const zero = { base: 0, perLevel: 0 };
const curves: CasterBaseCurves = {
  health: { base: 1_000, perLevel: 0 },
  mana: { base: 500, perLevel: 0 },
  energy: { base: 10, perLevel: 0 },
  damage: { base: 100, perLevel: 0 },
  magicDamage: { base: 50, perLevel: 0 },
  defense: { base: 100, perLevel: 0 },
  magicResist: zero,
  poisonResist: zero,
  fireResist: zero,
  coldResist: zero,
  diseaseResist: zero,
  blockChance: { base: 0.01, perLevel: 0 },
  accuracy: zero,
  criticalChance: zero,
};

function input(): CasterStatInput {
  return {
    kind: "player",
    level: 50,
    attributes: {
      strength: 10,
      constitution: 20,
      dexterity: 100,
      intelligence: 30,
      wisdom: 0,
      charisma: 0,
    },
    curves,
    equipment: [
      {
        slot: 12,
        amount: 1,
        durability: 10,
        item: {
          strength: 2,
          health: 100,
          healthPercent: 0.1,
          mana: 50,
          manaPercent: 0.1,
          energy: 5,
          damage: 20,
          magicDamage: 5,
          defense: 50,
          accuracy: 0.01,
          haste: 1,
          spellHaste: -1,
        },
      },
      {
        slot: 1,
        amount: 1,
        durability: 0,
        item: {
          strength: 1_000,
          damage: 1_000,
          criticalChance: 1,
        },
        augment: { damage: 1_000 },
      },
    ],
    passives: [
      {
        damagePercent: 0.1,
        magicDamagePercent: 0.2,
        resourceDepending: true,
      },
    ],
    damagePercentBuffs: [0.05],
    magicDamagePercentBuffs: [0.05],
    energyFraction: 0.5,
    manaFraction: 0.5,
    healthMultiplier: 1.05,
    manaMultiplier: 0.95,
    energyMultiplier: 10,
  };
}

describe("buildCasterStatSheet", () => {
  it("matches engine aggregation, rounding, and durability gates", () => {
    const sheet = buildCasterStatSheet(input());

    expect(sheet.attributes.strength).toBe(12);
    expect(sheet.health).toBe(1_815);
    expect(sheet.mana).toBe(1_237);
    expect(sheet.energy).toBe(135);
    expect(sheet.damage).toBe(145);
    expect(sheet.magicDamage).toBe(115);
    expect(sheet.defense).toBe(150);
    expect(sheet.magicResist).toBe(0);
    expect(sheet.poisonResist).toBe(5);
    expect(sheet.fireResist).toBe(0);
    expect(sheet.coldResist).toBe(0);
    expect(sheet.diseaseResist).toBe(0);
    expect(sheet.accuracy).toBeCloseTo(0.06);
    expect(sheet.blockChance).toBeCloseTo(0.031);
    expect(sheet.criticalChance).toBeCloseTo(0.03);
    expect(sheet.criticalResist).toBeCloseTo(0.05);
    expect(sheet.haste).toBe(0.8);
    expect(sheet.spellHaste).toBe(-0.5);
  });

  it("ignores the stored energy multiplier for capacity", () => {
    const exaggerated = buildCasterStatSheet(input());
    const neutral = buildCasterStatSheet({ ...input(), energyMultiplier: 1 });
    expect(exaggerated.energy).toBe(neutral.energy);
  });

  it("does not scale companion resource-dependent passives by current resource", () => {
    const player = buildCasterStatSheet(input());
    const companion = buildCasterStatSheet({ ...input(), kind: "companion" });

    expect(player.damage).toBe(145);
    expect(companion.damage).toBe(152);
    expect(player.magicDamage).toBe(115);
    expect(companion.magicDamage).toBe(125);
  });

  it("clamps negative attributes before their coefficients", () => {
    const sheet = buildCasterStatSheet({
      ...input(),
      attributes: {
        strength: -100,
        constitution: -100,
        dexterity: -100,
        intelligence: -100,
        wisdom: 0,
        charisma: 0,
      },
      equipment: [],
      passives: [],
      damagePercentBuffs: [],
      magicDamagePercentBuffs: [],
      extraBonuses: {
        accuracy: -2,
        blockChance: 2,
        criticalChance: 2,
        criticalResist: 2,
      },
    });

    expect(sheet.damage).toBe(100);
    expect(sheet.magicDamage).toBe(50);
    expect(sheet.accuracy).toBe(-0.5);
    expect(sheet.blockChance).toBe(0.8);
    expect(sheet.criticalChance).toBe(0.7);
    expect(sheet.criticalResist).toBe(1);
  });

  it("matches the measured Rogue attack-power durability boundary", () => {
    const measuredCurves = { ...curves, damage: { base: 463, perLevel: 0 } };
    const base = {
      ...input(),
      curves: measuredCurves,
      attributes: {
        strength: 0,
        constitution: 0,
        dexterity: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      equipment: [],
      passives: [],
      damagePercentBuffs: [],
      magicDamagePercentBuffs: [],
    };
    expect(buildCasterStatSheet(base).damage).toBe(463);

    const offhand = {
      slot: 13,
      amount: 1,
      durability: 10,
      item: { damage: 415 },
    };
    expect(buildCasterStatSheet({ ...base, equipment: [offhand] }).damage).toBe(
      878,
    );
    expect(
      buildCasterStatSheet({
        ...base,
        equipment: [{ ...offhand, durability: 0 }],
      }).damage,
    ).toBe(463);
  });
});

describe("activeArmorSetStates", () => {
  const pieces = Array.from({ length: 5 }, (_, index) => ({
    slot: index,
    amount: 1,
    durability: 10,
    armorSetId: "warden",
    item: {},
  }));

  it.each([
    [2, false, false],
    [3, true, false],
    [4, true, false],
    [5, true, true],
  ])(
    "applies the %i-piece thresholds",
    (count, attributesActive, skillsActive) => {
      expect(activeArmorSetStates(pieces.slice(0, count))).toEqual([
        { id: "warden", activePieces: count, attributesActive, skillsActive },
      ]);
    },
  );

  it("applies declared attributes only at three active pieces", () => {
    const base = input();
    const armorSets = [{ id: "warden", attributeBonuses: { strength: 10 } }];
    expect(
      buildCasterStatSheet({
        ...base,
        equipment: pieces.slice(0, 2),
        armorSets,
      }).attributes.strength,
    ).toBe(10);
    expect(
      buildCasterStatSheet({
        ...base,
        equipment: pieces.slice(0, 3),
        armorSets,
      }).attributes.strength,
    ).toBe(20);
  });

  it("applies every simultaneously active armor set", () => {
    const base = input();
    const secondSet = pieces.slice(0, 3).map((piece, index) => ({
      ...piece,
      slot: index + 5,
      armorSetId: "sage",
    }));
    const sheet = buildCasterStatSheet({
      ...base,
      equipment: [...pieces.slice(0, 3), ...secondSet],
      armorSets: [
        { id: "warden", attributeBonuses: { strength: 10 } },
        { id: "sage", attributeBonuses: { intelligence: 12 } },
      ],
    });
    expect(sheet.attributes.strength).toBe(20);
    expect(sheet.attributes.intelligence).toBe(42);
  });

  it("does not count broken pieces", () => {
    const broken = pieces.map((piece, index) =>
      index === 2 ? { ...piece, durability: 0 } : piece,
    );
    expect(activeArmorSetStates(broken)[0]?.activePieces).toBe(4);
  });
});
