import { describe, expect, it } from "vitest";
import {
  buildDamageIntent,
  prepareHit,
  sampleHit,
  weaponGateRefusal,
  type DamageSkillSpec,
  type HitCaster,
  type HitTarget,
  type PreparedHit,
} from "./hit";
import { createRandomSource } from "./random";

function ready(hit: PreparedHit): Extract<PreparedHit, { refused: null }> {
  if (hit.refused !== null) throw new Error(hit.refused);
  return hit;
}

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

  it("subtracts a broken offhand that gave no stat, as the game does", () => {
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
    expect(buildDamageIntent(ranger, skill({ declaredDamage: 1 })).amount).toBe(
      401,
    );
  });

  it("lets a bow subtract itself when slot 12 is empty, as the game does", () => {
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
    expect(buildDamageIntent(ranger, bowSkill).amount).toBe(106);
  });
});

describe("hit gates", () => {
  it("accepts assassination at one quarter health and refuses above it", () => {
    const assassination = skill({ isAssassination: true });
    expect(
      prepareHit(caster(), { ...target, currentHealth: 250 }, assassination)
        .refused,
    ).toBeNull();
    expect(
      prepareHit(caster(), { ...target, currentHealth: 251 }, assassination)
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
    expect(prepareHit(ranger, target, projectile).refused).toContain(
      "requires ammunition arrow",
    );
    const supplied = ready(
      prepareHit({ ...ranger, ammunition: { arrow: 1 } }, target, projectile),
    );
    expect(supplied.ammunitionPerCast).toBe(0.5);
  });

  it("does not require or consume ammunition without a weapon gate", () => {
    const result = ready(
      prepareHit(
        caster({ ammunition: { arrow: 0 } }),
        target,
        skill({ skillClass: "target_projectile" }),
      ),
    );
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
    const result = ready(
      prepareHit(rogue, target, skill({ declaredDamage: 1 })),
    );

    expect(result.intent.amount).toBe(464);
    expect(result.landed(1)).toBe(271);
    expect(result.supportBand).toEqual([245, 298]);
  });

  it("draws avoidance, variance, and the critical roll from the random source", () => {
    const rogue = caster({
      level: 50,
      damage: 463,
      dexterity: 0,
      criticalChance: 0.5,
      weapons: [],
    });
    const hit = ready(
      prepareHit(
        rogue,
        { ...target, blockChance: 0.1 },
        skill({ declaredDamage: 1 }),
      ),
    );
    const outcomes = Array.from({ length: 4 }, () =>
      sampleHit(hit, createRandomSource(42)),
    );
    expect(new Set(outcomes.map((outcome) => outcome.damage)).size).toBe(1);
    const [outcome] = outcomes;
    expect(outcome.avoided).toBe(false);
    expect(outcome.damage).toBeGreaterThanOrEqual(245);
    expect(outcome.damage).toBeLessThanOrEqual(hit.critical(298));

    let avoided = 0;
    const random = createRandomSource(7);
    for (let index = 0; index < 10_000; index += 1) {
      if (sampleHit(hit, random).avoided) avoided += 1;
    }
    expect(avoided / 10_000).toBeCloseTo(hit.avoidanceProbability, 1);
  });

  it("uses the enhanced facing bonus only when the Rogue skill is active", () => {
    const ordinary = ready(
      prepareHit(caster({ classId: "rogue", weapons: [] }), target, skill(), {
        sameFacing: true,
      }),
    );
    const enhanced = ready(
      prepareHit(
        caster({ classId: "rogue", enhancedBackstab: true, weapons: [] }),
        target,
        skill(),
        { sameFacing: true },
      ),
    );
    expect(ordinary.landed(1)).toBe(79);
    expect(enhanced.landed(1)).toBe(90);
  });

  it("does not apply target-skill facing bonuses to area damage", () => {
    const result = ready(
      prepareHit(
        caster({ weapons: [] }),
        { ...target, level: 55 },
        skill({ skillClass: "area_damage" }),
        { sameFacing: true },
      ),
    );
    expect(result.intent.amount).toBe(110);
    expect(result.landed(1)).toBe(71);
  });

  it("applies critical resistance after mitigation with midpoint rounding", () => {
    const result = ready(
      prepareHit(
        caster({ level: 50, damage: 463, dexterity: 0, weapons: [] }),
        target,
        skill({ declaredDamage: 1 }),
      ),
    );
    expect(result.critical(271)).toBe(406);
    const resisted = ready(
      prepareHit(
        caster({ level: 50, damage: 463, dexterity: 0, weapons: [] }),
        { ...target, criticalResist: 0.5 },
        skill({ declaredDamage: 1 }),
      ),
    );
    expect(resisted.critical(271)).toBe(339);
  });

  it("bypasses avoidance and mitigation for resource burn", () => {
    const result = ready(
      prepareHit(
        caster({ classId: "rogue", energyCurrent: 500, criticalChance: 0 }),
        { ...target, defense: 10_000, blockChance: 0.9 },
        skill({ isManaburn: true, declaredDamage: 0 }),
      ),
    );

    expect(result.intent.amount).toBe(1_000);
    expect(result.intent.resourceSpent).toEqual({
      resource: "energy",
      amount: 500,
    });
    expect(result.avoidanceProbability).toBe(0);
    expect(result.landed(1)).toBe(1_000);
  });

  it("keeps resource-burn bypass for handlers that do not replace intent", () => {
    const result = ready(
      prepareHit(
        caster({ weapons: [] }),
        { ...target, defense: 10_000, blockChance: 0.9 },
        skill({ skillClass: "area_damage", isManaburn: true }),
      ),
    );
    expect(result.intent.amount).toBe(110);
    expect(result.intent.resourceSpent).toBeNull();
    expect(result.avoidanceProbability).toBe(0);
    expect(result.landed(1)).toBe(110);
  });
});
