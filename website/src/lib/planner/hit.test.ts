import { describe, expect, it } from "vitest";
import {
  buildDamageIntent,
  evaluateHit,
  weaponGateRefusal,
  type DamageSkillSpec,
  type HitCaster,
  type HitTarget,
} from "./hit";

const target: HitTarget = {
  level: 55,
  defense: 700,
  magicResist: 0,
  poisonResist: 0,
  fireResist: 0,
  coldResist: 0,
  diseaseResist: 0,
  blockChance: 0,
  currentHealth: 1_000,
  maximumHealth: 1_000,
};

function caster(overrides: Partial<HitCaster> = {}): HitCaster {
  return {
    kind: "player",
    classId: "rogue",
    level: 55,
    damage: 100,
    magicDamage: 50,
    accuracy: 0,
    criticalChance: 0,
    dexterity: 10,
    energyCurrent: 50,
    manaCurrent: 80,
    weapons: [
      {
        slot: 12,
        amount: 1,
        durability: 10,
        category: "Weapon/Dagger",
        damageBonus: 30,
        requiredAmmoId: "arrow",
      },
      {
        slot: 13,
        amount: 1,
        durability: 10,
        category: "Bow",
        damageBonus: 20,
        requiredAmmoId: "arrow",
      },
    ],
    ammunition: { arrow: 10 },
    ...overrides,
  };
}

function skill(overrides: Partial<DamageSkillSpec> = {}): DamageSkillSpec {
  return {
    id: "fixture",
    skillClass: "target_damage",
    damageType: "normal",
    declaredDamage: 10,
    damagePercent: 0,
    isSpell: false,
    requiredWeaponCategory: "",
    ...overrides,
  };
}

describe("damage-class handlers", () => {
  it.each([
    ["normal", 110],
    ["magic", 60],
    ["poison", 135],
    ["fire", 60],
    ["cold", 60],
    ["disease", 60],
  ] as const)("selects the target-damage %s stat", (damageType, expected) => {
    expect(
      buildDamageIntent(caster({ weapons: [] }), skill({ damageType })).amount,
    ).toBe(expected);
  });

  it("does not add a combat stat without declared damage or percentage", () => {
    expect(
      buildDamageIntent(
        caster({ weapons: [] }),
        skill({ declaredDamage: 0, damagePercent: 0 }),
      ).amount,
    ).toBe(0);
  });

  it("adds physical attack power for a non-spell magic weapon skill", () => {
    expect(
      buildDamageIntent(
        caster({ weapons: [] }),
        skill({ damageType: "magic", requiredWeaponCategory: "Weapon" }),
      ).amount,
    ).toBe(160);
  });

  it("keeps frontal and area handler divergences explicit", () => {
    const companionRogue = caster({ kind: "companion", weapons: [] });
    expect(
      buildDamageIntent(
        companionRogue,
        skill({ skillClass: "frontal_damage", damageType: "poison" }),
      ).amount,
    ).toBe(110);
    expect(
      buildDamageIntent(
        caster({ weapons: [] }),
        skill({ skillClass: "area_damage", damageType: "poison" }),
      ).amount,
    ).toBe(110);
  });

  it("ignores the populated frontal-projectile percentage", () => {
    const intent = buildDamageIntent(
      caster({ classId: "ranger", weapons: [] }),
      skill({
        skillClass: "frontal_projectiles",
        damageType: "fire",
        damagePercent: 0.5,
      }),
    );
    expect(intent.amount).toBe(125);
    expect(intent.ignoredPopulatedFields).toContain("damagePercent");
  });

  it("records the secondary weapon category as non-gating", () => {
    const intent = buildDamageIntent(
      caster({ weapons: [] }),
      skill({ requiredWeaponCategory2: "Bow" }),
    );
    expect(intent.ignoredPopulatedFields).toContain("requiredWeaponCategory2");
  });
});

describe("slot-specific damage", () => {
  it("removes half of the Rogue player's offhand damage", () => {
    const rogue = caster({
      damage: 878,
      dexterity: 0,
      weapons: [
        {
          slot: 13,
          amount: 1,
          durability: 10,
          category: "Weapon/Dagger",
          damageBonus: 365,
        },
      ],
    });
    expect(buildDamageIntent(rogue, skill({ declaredDamage: 1 })).amount).toBe(
      696,
    );
  });

  it("does not apply player offhand corrections to companions", () => {
    const ranger = caster({
      kind: "companion",
      classId: "ranger",
      damage: 873,
      dexterity: 140,
      weapons: [],
    });
    expect(
      buildDamageIntent(
        ranger,
        skill({
          skillClass: "target_projectile",
          requiredWeaponCategory: "Bow",
          declaredDamage: 2,
        }),
      ).amount,
    ).toBe(1_085);
  });

  it("normalizes subtraction of a broken offhand that gave no stat", () => {
    const ranger = caster({
      classId: "ranger",
      damage: 500,
      weapons: [
        {
          slot: 13,
          amount: 1,
          durability: 0,
          category: "Bow",
          damageBonus: 100,
        },
      ],
    });
    const normalized = buildDamageIntent(ranger, skill({ declaredDamage: 1 }));
    const engine = buildDamageIntent(
      ranger,
      skill({ declaredDamage: 1 }),
      false,
    );

    expect(normalized.amount).toBe(501);
    expect(normalized.normalizedDefects).toContain(
      "broken offhand subtraction",
    );
    expect(engine.amount).toBe(401);
  });

  it("normalizes a bow subtracting itself when slot 12 is empty", () => {
    const ranger = caster({
      classId: "ranger",
      damage: 409,
      dexterity: 0,
      weapons: [
        {
          slot: 13,
          amount: 1,
          durability: 10,
          category: "Bow",
          damageBonus: 304,
        },
      ],
    });
    const bowSkill = skill({
      skillClass: "target_projectile",
      requiredWeaponCategory: "Bow",
      declaredDamage: 1,
    });
    const normalized = buildDamageIntent(ranger, bowSkill);
    const engine = buildDamageIntent(ranger, bowSkill, false);

    expect(normalized.amount).toBe(410);
    expect(normalized.normalizedDefects).toContain("bow-only self-subtraction");
    expect(engine.amount).toBe(106);
  });
});

describe("hit gates", () => {
  it("accepts assassination at one quarter health and refuses above it", () => {
    const assassination = skill({ isAssassination: true });
    expect(
      evaluateHit(caster(), { ...target, currentHealth: 250 }, assassination)
        .refused,
    ).toBeNull();
    expect(
      evaluateHit(caster(), { ...target, currentHealth: 251 }, assassination)
        .refused,
    ).toContain("one quarter");
  });

  it("uses archetype-specific slot 13 gates", () => {
    const ranger = caster({ classId: "ranger", weapons: [] });
    expect(
      weaponGateRefusal(ranger, skill({ requiredWeaponCategory: "Bow" })),
    ).toContain("slot 13");
    expect(
      weaponGateRefusal(
        caster({ classId: "warrior", weapons: [] }),
        skill({ requiredWeaponCategory: "Shield" }),
      ),
    ).toContain("slot 13");
  });

  it("requires and accounts for player ammunition", () => {
    const projectile = skill({
      skillClass: "target_projectile",
      requiredWeaponCategory: "Bow",
    });
    const ranger = caster({
      classId: "ranger",
      ammunition: { arrow: 0 },
      endlessQuiver: true,
    });
    expect(evaluateHit(ranger, target, projectile).refused).toContain(
      "requires ammunition arrow",
    );
    const supplied = evaluateHit(
      { ...ranger, ammunition: { arrow: 1 } },
      target,
      projectile,
    );
    expect(supplied.ammunitionPerCast).toBe(0.5);
  });

  it("does not require or consume ammunition without a weapon gate", () => {
    const result = evaluateHit(
      caster({ ammunition: { arrow: 0 } }),
      target,
      skill({ skillClass: "target_projectile" }),
    );
    expect(result.refused).toBeNull();
    expect(result.ammunitionPerCast).toBe(0);
  });
});

describe("ordered landed-hit pipeline", () => {
  it("matches the source-derived Cyclops landed-hit centre and band", () => {
    const rogue = caster({
      level: 50,
      damage: 463,
      dexterity: 0,
      weapons: [],
    });
    const result = evaluateHit(rogue, target, skill({ declaredDamage: 1 }));

    expect(result.intent?.amount).toBe(464);
    expect(result.landedDamage).toBe(271);
    expect(result.nonCriticalBand).toEqual([245, 298]);
  });

  it("uses the enhanced facing bonus only when the Rogue skill is active", () => {
    const ordinary = evaluateHit(
      caster({ classId: "rogue", weapons: [] }),
      target,
      skill(),
      { sameFacing: true },
    );
    const enhanced = evaluateHit(
      caster({ classId: "rogue", enhancedBackstab: true, weapons: [] }),
      target,
      skill(),
      { sameFacing: true },
    );
    expect(ordinary.landedDamage).toBe(79);
    expect(enhanced.landedDamage).toBe(90);
  });

  it("does not apply target-skill facing bonuses to area damage", () => {
    const result = evaluateHit(
      caster({ weapons: [] }),
      { ...target, level: 55 },
      skill({ skillClass: "area_damage" }),
      { sameFacing: true },
    );
    expect(result.intent?.amount).toBe(110);
    expect(result.landedDamage).toBe(71);
  });

  it("applies critical resistance after mitigation with midpoint rounding", () => {
    const result = evaluateHit(
      caster({
        level: 50,
        damage: 463,
        dexterity: 0,
        criticalChance: 1,
        accuracy: 0.025,
        weapons: [],
      }),
      target,
      skill({ declaredDamage: 1 }),
    );
    expect(result.landedDamage).toBe(271);
    expect(result.expectedDamage).toBe(406);
  });

  it("bypasses avoidance and mitigation for resource burn", () => {
    const result = evaluateHit(
      caster({
        classId: "rogue",
        energyCurrent: 500,
        criticalChance: 0,
      }),
      { ...target, defense: 10_000, blockChance: 0.9 },
      skill({ isManaburn: true, declaredDamage: 0 }),
    );

    expect(result.intent?.amount).toBe(1_000);
    expect(result.intent?.resourceSpent).toEqual({
      resource: "energy",
      amount: 500,
    });
    expect(result.avoidanceProbability).toBe(0);
    expect(result.landedDamage).toBe(1_000);
  });

  it("keeps resource-burn bypass for handlers that do not replace intent", () => {
    const result = evaluateHit(
      caster({ weapons: [] }),
      { ...target, defense: 10_000, blockChance: 0.9 },
      skill({ skillClass: "area_damage", isManaburn: true }),
    );
    expect(result.intent?.amount).toBe(110);
    expect(result.intent?.resourceSpent).toBeNull();
    expect(result.avoidanceProbability).toBe(0);
    expect(result.landedDamage).toBe(110);
  });
});
