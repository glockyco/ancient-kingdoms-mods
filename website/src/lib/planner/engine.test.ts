import { describe, expect, it } from "vitest";
import type { CasterBaseCurves, CasterStatInput } from "./caster";
import type { EffectSpec } from "./effects";
import {
  runReplicate,
  type EngineAction,
  type EngineEntityInput,
  type EngineInput,
  type TimelineEvent,
} from "./engine";
import { prepareHit } from "./hit";
import { companionPolicy, priorityPolicy, schedulePolicy } from "./policy";
import { createRandomSource } from "./random";
import { simulate } from "./simulate";

const zero = { base: 0, perLevel: 0 };
const curves: CasterBaseCurves = {
  health: { base: 1_000, perLevel: 0 },
  mana: { base: 100, perLevel: 0 },
  energy: { base: 25, perLevel: 0 },
  damage: { base: 100, perLevel: 0 },
  magicDamage: { base: 50, perLevel: 0 },
  defense: zero,
  magicResist: zero,
  poisonResist: zero,
  fireResist: zero,
  coldResist: zero,
  diseaseResist: zero,
  blockChance: zero,
  accuracy: zero,
  criticalChance: zero,
};

function caster(overrides: Partial<CasterStatInput> = {}): CasterStatInput {
  return {
    kind: "player",
    level: 55,
    attributes: {
      strength: 0,
      constitution: 0,
      dexterity: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    curves,
    learnedBooks: { ids: [], catalog: [] },
    equipment: [],
    ...overrides,
  };
}

function action(overrides: Partial<EngineAction> = {}): EngineAction {
  return {
    id: "strike",
    name: "Strike",
    defaultAttack: false,
    castTime: 0,
    cooldown: 0,
    resourceCost: 0,
    isSpell: false,
    requiredWeaponCategory: "",
    followupDefaultAttack: false,
    offensive: true,
    damage: {
      id: overrides.id ?? "strike",
      skillClass: "target_damage",
      damageType: "normal",
      declaredDamage: 1,
      damagePercent: 0,
      isSpell: false,
      requiredWeaponCategory: "",
    },
    effect: null,
    projectileTravelSeconds: 0,
    ...overrides,
  };
}

function effect(overrides: Partial<EffectSpec> = {}): EffectSpec {
  return {
    skillId: "sigil",
    name: "Sigil",
    category: "Debuff AC",
    duration: 5,
    recipient: "target",
    school: "melee",
    decreasesResists: false,
    debuffPowerAttribute: "strength",
    meleeDebuff: true,
    bonuses: { defense: -100 },
    damagePercent: 0,
    magicDamagePercent: 0,
    manaRecoveryPercent: 0,
    energyRecoveryPercent: 0,
    manaRecoveryFlat: 0,
    energyRecoveryFlat: 0,
    cooldownReductionPercent: 0,
    periodicDamage: 0,
    periodicDamagePercent: 0,
    periodicDamageAttributeMultiplier: 0,
    ...overrides,
  };
}

function entity(overrides: Partial<EngineEntityInput> = {}): EngineEntityInput {
  return {
    id: "player",
    kind: "player",
    classId: "warrior",
    caster: caster(),
    weapons: [
      {
        slot: 12,
        amount: 1,
        durability: 10,
        category: "WeaponSword",
        damageBonus: 0,
      },
    ],
    weaponDelay: 25,
    resourceKind: "energy",
    resourceRecovery: { base: 0, equipmentFlat: 0, passivePercent: 0 },
    actions: [
      action({
        id: "auto",
        defaultAttack: true,
        castTime: 0.5,
        followupDefaultAttack: true,
      }),
    ],
    policy: priorityPolicy([]),
    hasHeals: false,
    endlessQuiver: false,
    enhancedBackstab: false,
    ...overrides,
  };
}

function engineInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    horizon: 10,
    includeHorizonEvents: true,
    entities: [entity()],
    target: {
      id: "dummy",
      stats: {
        level: 55,
        defense: 0,
        magicResist: 0,
        poisonResist: 0,
        fireResist: 0,
        coldResist: 0,
        diseaseResist: 0,
        blockChance: 0,
        criticalResist: 0,
      },
      currentHealth: 1_000_000,
      maximumHealth: 1_000_000,
    },
    initialResources: new Map([["player", 25]]),
    initialCooldowns: [],
    initialEffects: [],
    consumables: [],
    ammunition: [],
    incomingEvents: [],
    ...overrides,
  };
}

function events<K extends TimelineEvent["kind"]>(
  trace: readonly TimelineEvent[],
  kind: K,
): Extract<TimelineEvent, { kind: K }>[] {
  return trace.filter(
    (event): event is Extract<TimelineEvent, { kind: K }> =>
      event.kind === kind,
  );
}

describe("event ordering", () => {
  it("resolves two events at one timestamp in insertion order", () => {
    // A zero-cast-time skill scheduled at t=0 completes before the tick at t=1 recovers.
    const result = runReplicate(
      engineInput({
        horizon: 1,
        entities: [
          entity({
            actions: [action({ id: "spend", resourceCost: 5, cooldown: 100 })],
            policy: priorityPolicy(["spend"]),
          }),
        ],
        incomingEvents: [
          {
            atSeconds: 1,
            targetEntityId: "player",
            amount: 100,
            damageType: "normal",
          },
        ],
      }),
      createRandomSource(1),
    );
    const at1 = result.trace.filter((event) => event.at === 1);
    expect(at1.map((event) => event.kind)).toEqual(["resource"]);
    expect(
      events(result.trace, "resource").map((event) => event.cause),
    ).toEqual(["spend cost", "incoming damage return"]);
  });

  it("applies recovery only on whole seconds", () => {
    const result = runReplicate(
      engineInput({
        horizon: 2.5,
        entities: [
          entity({
            resourceRecovery: { base: 3, equipmentFlat: 0, passivePercent: 0 },
            actions: [],
          }),
        ],
        initialResources: new Map([["player", 0]]),
      }),
      createRandomSource(1),
    );
    expect(
      events(result.trace, "resource").map((event) => [
        event.at,
        event.current,
      ]),
    ).toEqual([
      [1, 3],
      [2, 6],
    ]);
  });
});

describe("resource handler", () => {
  it("reproduces the measured Warrior and Rogue divergence after matched returns", () => {
    // Harness task 7.13: a 20-damage follow-up returns 5, a 100-damage received hit returns 3,
    // a cost of 4 leaves both classes at 4, then three ticks keep the Warrior at 4 and take a Rogue
    // with Fury (-0.04 maximum per second) to 1.
    const run = (classId: "warrior" | "rogue", fury: boolean) =>
      runReplicate(
        engineInput({
          horizon: 4,
          entities: [
            entity({
              classId,
              caster: caster({
                curves: { ...curves, damage: { base: 19, perLevel: 0 } },
              }),
              actions: [
                action({
                  id: "auto",
                  defaultAttack: true,
                  followupDefaultAttack: true,
                  cooldown: 100,
                }),
                action({
                  id: "spend",
                  resourceCost: 4,
                  castTime: 0.5,
                  cooldown: 100,
                  damage: null,
                  offensive: false,
                }),
              ],
              policy: schedulePolicy({
                steps: ["auto", "spend"],
                repeat: false,
              }),
            }),
          ],
          initialResources: new Map([["player", 0]]),
          incomingEvents: [
            {
              atSeconds: 0.5,
              targetEntityId: "player",
              amount: 100,
              damageType: "normal",
            },
          ],
          initialEffects: fury
            ? [
                {
                  sourceId: "player",
                  recipientId: "player",
                  spec: effect({
                    skillId: "fury",
                    category: "",
                    recipient: "self",
                    school: null,
                    bonuses: {},
                    energyRecoveryPercent: -0.04,
                    duration: 10,
                  }),
                  remainingSeconds: 10,
                },
              ]
            : [],
        }),
        createRandomSource(5),
      );
    const warrior = events(run("warrior", false).trace, "resource");
    const returned = warrior[0].current;
    expect([4, 5]).toContain(returned);
    expect(
      warrior.map((event) => [event.at, event.cause, event.current]),
    ).toEqual([
      [0, "auto return", returned],
      [0.5, "incoming damage return", returned + 3],
      [0.5, "spend cost", returned - 1],
    ]);
    const rogue = events(run("rogue", true).trace, "resource");
    expect(rogue.map((event) => [event.at, event.current])).toEqual([
      [0, returned],
      [0.5, returned + 3],
      [0.5, returned - 1],
      [1, returned - 2],
      [2, returned - 3],
      [3, returned - 4],
    ]);
  });
});

describe("effect handler", () => {
  it("removes an expired target debuff at its expiry and records its uptime", () => {
    const result = runReplicate(
      engineInput({
        horizon: 8,
        entities: [
          entity({
            actions: [
              action({
                id: "sigil",
                damage: null,
                effect: effect({ duration: 2.5 }),
                cooldown: 100,
              }),
              action({
                id: "auto",
                defaultAttack: true,
                castTime: 0,
                cooldown: 100,
              }),
            ],
            policy: schedulePolicy({ steps: ["sigil", "auto"], repeat: false }),
            weaponDelay: 0,
          }),
        ],
        target: {
          ...engineInput().target,
          stats: { ...engineInput().target.stats, defense: 100 },
        },
      }),
      createRandomSource(1),
    );
    expect(events(result.trace, "effect_applied")).toHaveLength(1);
    expect(
      events(result.trace, "effect_expired").map((event) => event.at),
    ).toEqual([2.5]);
    expect(result.effectUptime.get("dummy")?.get("sigil")).toBe(2.5);
  });

  it("applies resisted flat and maximum-health damage on fixed ticks", () => {
    const result = runReplicate(
      engineInput({
        horizon: 3,
        entities: [
          entity({
            actions: [
              action({
                id: "burn",
                damage: null,
                effect: effect({
                  skillId: "burn",
                  duration: 2.5,
                  bonuses: {},
                  periodicDamage: 100,
                  periodicDamagePercent: 0.01,
                }),
                cooldown: 100,
              }),
            ],
            policy: schedulePolicy({ steps: ["burn"], repeat: false }),
          }),
        ],
        target: {
          ...engineInput().target,
          stats: { ...engineInput().target.stats, defense: 200 },
          currentHealth: 1_000,
          maximumHealth: 1_000,
        },
      }),
      createRandomSource(1),
    );

    expect(
      events(result.trace, "hit").map((event) => [event.at, event.damage]),
    ).toEqual([
      [1, 100],
      [2, 100],
    ]);
    expect(result.damageByEntity.get("player")).toBe(200);
  });

  it("lets a weaker second source replace a stronger effect on the same recipient", () => {
    const result = runReplicate(
      engineInput({
        horizon: 3,
        entities: [
          entity({
            actions: [
              action({
                id: "strong",
                damage: null,
                effect: effect({ skillId: "strong" }),
                cooldown: 100,
              }),
            ],
            policy: schedulePolicy({ steps: ["strong"], repeat: false }),
          }),
          entity({
            id: "companion",
            kind: "companion",
            actions: [
              action({
                id: "weak",
                defaultAttack: true,
                damage: null,
                effect: effect({ skillId: "weak", bonuses: { defense: -10 } }),
                cooldown: 100,
                castTime: 1,
              }),
            ],
            policy: companionPolicy(),
          }),
        ],
        initialResources: new Map([
          ["player", 25],
          ["companion", 25],
        ]),
      }),
      createRandomSource(1),
    );
    const applied = events(result.trace, "effect_applied");
    expect(
      applied.map((event) => [event.sourceId, event.skillId, event.replaced]),
    ).toEqual([
      ["player", "strong", []],
      ["companion", "weak", ["strong"]],
    ]);
  });
});

describe("effect handler isolation", () => {
  it("keeps same-category effects on different recipients", () => {
    const result = runReplicate(
      engineInput({
        horizon: 3,
        entities: [
          entity({
            actions: [
              action({
                id: "self",
                damage: null,
                effect: effect({
                  skillId: "self",
                  recipient: "self",
                  school: null,
                  bonuses: { damage: 10 },
                }),
                cooldown: 100,
              }),
              action({
                id: "hex",
                damage: null,
                effect: effect({ skillId: "hex" }),
                cooldown: 100,
              }),
            ],
            policy: schedulePolicy({ steps: ["self", "hex"], repeat: false }),
          }),
        ],
      }),
      createRandomSource(1),
    );
    expect(
      events(result.trace, "effect_applied").map((event) => [
        event.recipientId,
        event.skillId,
        event.replaced,
      ]),
    ).toEqual([
      ["player", "self", []],
      ["dummy", "hex", []],
    ]);
  });
});

describe("hit handler", () => {
  it("samples a mean within three standard errors of the numerically integrated expectation", () => {
    const stats = { ...engineInput().target.stats, blockChance: 0.3 };
    const reference = prepareHit(
      {
        kind: "player",
        classId: "warrior",
        level: 55,
        damage: 100,
        magicDamage: 50,
        accuracy: 0,
        criticalChance: 0.5,
        dexterity: 0,
        energyCurrent: 0,
        manaCurrent: 0,
        weapons: [],
      },
      { ...stats, currentHealth: 1, maximumHealth: 1 },
      action().damage!,
    );
    if (reference.refused !== null) throw new Error(reference.refused);
    const steps = 20_000;
    let integral = 0;
    for (let step = 0; step < steps; step += 1) {
      const landed = reference.landed(0.9 + (0.2 * (step + 0.5)) / steps);
      integral += 0.5 * landed + 0.5 * reference.critical(landed);
    }
    const expectedLanded =
      (1 - reference.avoidanceProbability) * (integral / steps);
    const samples: number[] = [];
    for (let index = 0; index < 100; index += 1) {
      const result = runReplicate(
        engineInput({
          horizon: 100,
          entities: [
            entity({
              caster: caster({
                curves: {
                  ...curves,
                  criticalChance: { base: 0.5, perLevel: 0 },
                },
              }),
              actions: [
                action({
                  id: "auto",
                  defaultAttack: true,
                  castTime: 0,
                  cooldown: 1,
                }),
              ],
              weaponDelay: 0,
            }),
          ],
          target: { ...engineInput().target, stats },
        }),
        createRandomSource(index),
      );
      for (const hit of events(result.trace, "hit")) samples.push(hit.damage);
    }
    const mean =
      samples.reduce((total, value) => total + value, 0) / samples.length;
    const variance =
      samples.reduce((total, value) => total + (value - mean) ** 2, 0) /
      (samples.length - 1);
    const standardError = Math.sqrt(variance / samples.length);
    expect(samples.length).toBeGreaterThan(9_000);
    expect(Math.abs(mean - expectedLanded)).toBeLessThan(3 * standardError);
  });

  it("voids a projectile that arrives after the target died", () => {
    const result = runReplicate(
      engineInput({
        horizon: 5,
        entities: [
          entity({
            actions: [
              action({
                id: "arrow",
                projectileTravelSeconds: 1,
                cooldown: 100,
                damage: {
                  ...action().damage!,
                  id: "arrow",
                  skillClass: "target_projectile",
                },
              }),
              action({ id: "finisher", cooldown: 100 }),
            ],
            policy: schedulePolicy({
              steps: ["arrow", "finisher"],
              repeat: false,
            }),
          }),
        ],
        target: {
          ...engineInput().target,
          currentHealth: 50,
          maximumHealth: 50,
        },
      }),
      createRandomSource(2),
    );
    const hits = events(result.trace, "hit");
    expect(hits.map((hit) => hit.actionId)).toEqual(["finisher"]);
    expect(result.targetDiedAt).toBe(0);
    expect(
      events(result.trace, "cast_complete").map((event) => event.actionId),
    ).toEqual(["arrow", "finisher"]);
  });
});

describe("policies", () => {
  it("never reorders a declared schedule and records a gated step as refused", () => {
    const result = runReplicate(
      engineInput({
        horizon: 5,
        entities: [
          entity({
            actions: [
              action({
                id: "bow",
                cooldown: 100,
                damage: {
                  ...action().damage!,
                  id: "bow",
                  requiredWeaponCategory: "Bow",
                },
              }),
              action({ id: "strike", cooldown: 100 }),
              action({ id: "auto", defaultAttack: true, cooldown: 100 }),
            ],
            policy: schedulePolicy({
              steps: ["strike", "bow", "auto"],
              repeat: false,
            }),
          }),
        ],
      }),
      createRandomSource(1),
    );
    expect(
      result.trace
        .filter(
          (event) => event.kind === "cast_complete" || event.kind === "refused",
        )
        .map((event) =>
          event.kind === "refused" ? `${event.actionId}!` : event.actionId,
        ),
    ).toEqual(["strike", "bow!", "auto"]);
    expect(result.counts.get("player")?.get("bow")).toMatchObject({
      refused: 1,
      cast: 0,
    });
  });

  it("skips a gated skill in a priority list and falls back to the default attack", () => {
    const result = runReplicate(
      engineInput({
        horizon: 3,
        entities: [
          entity({
            actions: [
              action({
                id: "bow",
                cooldown: 100,
                damage: {
                  ...action().damage!,
                  id: "bow",
                  requiredWeaponCategory: "Bow",
                },
              }),
              action({ id: "costly", cooldown: 100, resourceCost: 1_000 }),
              action({
                id: "auto",
                defaultAttack: true,
                castTime: 0.5,
                cooldown: 0,
                requiredWeaponCategory: "Weapon",
                damage: {
                  ...action().damage!,
                  id: "auto",
                  requiredWeaponCategory: "Weapon",
                },
              }),
            ],
            policy: priorityPolicy(["bow", "costly", "auto"]),
            weaponDelay: 25,
          }),
        ],
      }),
      createRandomSource(1),
    );
    const completions = events(result.trace, "cast_complete");
    expect(new Set(completions.map((event) => event.actionId))).toEqual(
      new Set(["auto"]),
    );
    // Cast time 0.5 plus the weapon interval 1.0 gives one swing every 1.5 s: t=0.5, 2.0.
    expect(completions.map((event) => event.at)).toEqual([0.5, 2]);
  });

  it("applies the player refractory period to every follow-up attack", () => {
    const result = runReplicate(
      engineInput({
        horizon: 3,
        entities: [
          entity({
            actions: [
              action({ id: "auto", defaultAttack: true }),
              action({
                id: "alternate",
                castTime: 0.5,
                followupDefaultAttack: true,
              }),
            ],
            policy: priorityPolicy(["alternate"]),
          }),
        ],
      }),
      createRandomSource(1),
    );

    const completions = events(result.trace, "cast_complete").filter(
      (event) => event.actionId === "alternate",
    );
    expect(completions.map((event) => event.at)).toEqual([0.5, 1.75, 3]);
  });

  it("casts companion skills when the game ignores their resource gate", () => {
    const result = runReplicate(
      engineInput({
        horizon: 1,
        entities: [
          entity({
            id: "companion",
            kind: "companion",
            classId: "rogue",
            ignoreResourceAffordability: true,
            actions: [
              action({ id: "auto", defaultAttack: true, cooldown: 100 }),
              action({ id: "special", resourceCost: 1_000, cooldown: 100 }),
            ],
            policy: companionPolicy(),
          }),
        ],
        initialResources: new Map([["companion", 25]]),
      }),
      createRandomSource(1),
    );

    expect(
      events(result.trace, "cast_complete").map((event) => event.actionId),
    ).toEqual(["special", "auto"]);
  });

  it("allows a damaging companion skill when its side effect is active", () => {
    const sideEffect = effect();
    const result = runReplicate(
      engineInput({
        horizon: 0.1,
        entities: [
          entity({
            id: "companion",
            kind: "companion",
            actions: [
              action({ id: "auto", defaultAttack: true, cooldown: 100 }),
              action({ id: "special", cooldown: 100, effect: sideEffect }),
            ],
            policy: companionPolicy(),
          }),
        ],
        initialResources: new Map([["companion", 25]]),
        initialEffects: [
          {
            sourceId: "companion",
            recipientId: "dummy",
            spec: sideEffect,
            remainingSeconds: 5,
          },
        ],
      }),
      createRandomSource(1),
    );

    expect(events(result.trace, "cast_complete")[0]?.actionId).toBe("special");
  });

  it("prioritizes both Warrior taunts over attack skills", () => {
    const result = runReplicate(
      engineInput({
        horizon: 1,
        entities: [
          entity({
            id: "companion",
            kind: "companion",
            classId: "warrior",
            actions: [
              action({ id: "auto", defaultAttack: true, cooldown: 100 }),
              action({ id: "challenge", name: "Challenge", cooldown: 100 }),
              action({ id: "shout", name: "Battle Shout", cooldown: 100 }),
              action({ id: "special", cooldown: 100 }),
            ],
            policy: companionPolicy(),
          }),
        ],
        initialResources: new Map([["companion", 1_000]]),
      }),
      createRandomSource(1),
    );

    expect(
      events(result.trace, "cast_complete")
        .slice(0, 2)
        .map((event) => event.actionId),
    ).toEqual(["shout", "challenge"]);
  });

  it("samples the companion special timer from two to four seconds", () => {
    const gaps: number[] = [];
    for (let index = 0; index < 1_000; index += 1) {
      const result = runReplicate(
        engineInput({
          horizon: 60,
          entities: [
            entity({
              id: "companion",
              kind: "companion",
              actions: [
                action({
                  id: "auto",
                  defaultAttack: true,
                  castTime: 0.4,
                  cooldown: 100,
                }),
                action({ id: "special", castTime: 0.2, cooldown: 0 }),
              ],
              policy: companionPolicy(),
            }),
          ],
          initialResources: new Map([["companion", 25]]),
        }),
        createRandomSource(index),
      );
      const starts = events(result.trace, "cast_start")
        .filter((event) => event.actionId === "special")
        .map((event) => event.at);
      for (let position = 1; position < starts.length; position += 1)
        gaps.push(starts[position] - starts[position - 1]);
    }
    expect(gaps.length).toBeGreaterThan(3_000);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(4.2);
  });
});

describe("simulate", () => {
  it("returns byte-identical results for identical inputs", () => {
    const input = {
      build: {
        serializedSchemaVersion: 3,
        modelVersion: "1",
        gameData: { gameVersion: "0", steamBuildId: "0", assemblySha256: "0" },
      } as const,
      seed: 9,
      replicates: 8,
      engine: engineInput({
        target: {
          ...engineInput().target,
          stats: { ...engineInput().target.stats, blockChance: 0.2 },
        },
      }),
    };
    expect(JSON.stringify(simulate(input))).toBe(
      JSON.stringify(simulate(input)),
    );
  });

  it("gives two builds under one seed the same draws while their event orders agree", () => {
    const run = (damage: number) =>
      runReplicate(
        engineInput({
          entities: [
            entity({
              caster: caster({
                curves: { ...curves, damage: { base: damage, perLevel: 0 } },
              }),
            }),
          ],
          target: {
            ...engineInput().target,
            stats: { ...engineInput().target.stats, blockChance: 0.2 },
          },
        }),
        createRandomSource(11),
      );
    const left = events(run(100).trace, "hit");
    const right = events(run(200).trace, "hit");
    expect(left.map((hit) => hit.avoided)).toEqual(
      right.map((hit) => hit.avoided),
    );
    expect(left.length).toBeGreaterThan(3);
  });
});
