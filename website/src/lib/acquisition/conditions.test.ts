import { describe, expect, it } from "vitest";
import {
  combine,
  describeRequirement,
  evaluateRequirement,
  predicate,
  skillLearningAtRank,
} from "./conditions";
import { evaluateAllCarriedBatch, professionAttempt } from "./rules";
import type {
  RequirementExpression,
  RequirementFacts,
  RequirementRoot,
  SubjectFacts,
} from "./types";

function root(expression: RequirementExpression): RequirementRoot {
  return { phase: "use", subject: "player", enforcement: "both", expression };
}
function player(facts: SubjectFacts): RequirementFacts {
  return { subjects: { player: facts } };
}
const item = predicate({
  kind: "item_count",
  itemId: "key",
  location: "inventory",
  amount: 5,
});
const withheld = predicate({ kind: "withheld", reason: "unpublished_target" });

describe("three-valued requirements", () => {
  it("uses complete collections only to prove absence", () => {
    expect(
      evaluateRequirement(
        root(item),
        player({
          items: {
            inventory: {
              entries: [{ itemId: "key", amount: 3 }],
              complete: false,
            },
          },
        }),
      ).status,
    ).toBe("unknown");
    expect(
      evaluateRequirement(
        root(item),
        player({
          items: {
            inventory: {
              entries: [{ itemId: "key", amount: 3 }],
              complete: true,
            },
          },
        }),
      ).status,
    ).toBe("unmet");
    expect(
      evaluateRequirement(
        root(item),
        player({
          items: {
            inventory: {
              entries: [{ itemId: "key", amount: 5 }],
              complete: false,
            },
          },
        }),
      ).status,
    ).toBe("met");
  });
  it("preserves all and any truth tables including withheld operands", () => {
    const met = predicate({
      kind: "metric_at_least",
      metric: "level",
      amount: 5,
      unit: "levels",
    });
    const unmet = predicate({
      kind: "metric_at_least",
      metric: "level",
      amount: 20,
      unit: "levels",
    });
    const facts = player({
      metrics: { level: { known: true, value: 10, provenance: "entered" } },
    });
    for (const [operands, all, any] of [
      [[met, met], "met", "met"],
      [[met, unmet], "unmet", "met"],
      [[met, withheld], "unknown", "met"],
      [[unmet, withheld], "unmet", "unknown"],
      [[withheld, withheld], "unknown", "unknown"],
      [[unmet, unmet], "unmet", "unmet"],
    ] as const) {
      expect(
        evaluateRequirement(root(combine("all", operands)), facts).status,
      ).toBe(all);
      expect(
        evaluateRequirement(root(combine("any", operands)), facts).status,
      ).toBe(any);
    }
    expect(() => combine("all", [])).toThrow("empty all");
    expect(() => combine("any", [])).toThrow("empty any");
  });
  it("does not borrow bank, equipment or backpack items for base slots", () => {
    const base = root(
      predicate({
        kind: "item_count",
        itemId: "key",
        location: "base_inventory",
        amount: 1,
      }),
    );
    const backpackOnly = player({
      items: {
        inventory: { entries: [{ itemId: "key", amount: 5 }], complete: true },
        bank: { entries: [{ itemId: "key", amount: 10 }], complete: true },
      },
    });
    expect(evaluateRequirement(base, backpackOnly).status).toBe("unknown");
    const knownBase = player({
      items: {
        base_inventory: {
          entries: [{ itemId: "key", amount: 5 }],
          complete: false,
        },
        inventory: { entries: [{ itemId: "key", amount: 5 }], complete: true },
      },
    });
    expect(evaluateRequirement(base, knownBase).status).toBe("met");
    expect(evaluateRequirement(root(item), knownBase).status).toBe("met");
    expect(
      evaluateRequirement(
        root(
          predicate({
            kind: "item_count",
            itemId: "key",
            location: "inventory",
            amount: 6,
          }),
        ),
        knownBase,
      ).status,
    ).toBe("unmet");
  });
  it("counts learned base ranks rather than equipment bonuses", () => {
    const requirement = root(
      predicate({ kind: "skill_base_rank", skillId: "skill", rank: 4 }),
    );
    expect(
      evaluateRequirement(
        requirement,
        player({
          skills: {
            entries: [
              { skillId: "skill", baseRank: 3, tier: 1, defaultRank: 0 },
            ],
            complete: true,
          },
        }),
      ).status,
    ).toBe("unmet");
  });
  it("permits upgrading an already chosen skill at a full tier", () => {
    const facts = player({
      skills: {
        entries: [
          { skillId: "one", baseRank: 3, tier: 2, defaultRank: 1 },
          { skillId: "default", baseRank: 1, tier: 2, defaultRank: 1 },
        ],
        complete: true,
      },
    });
    expect(
      evaluateRequirement(
        root(
          predicate({
            kind: "skill_tier_choice",
            skillId: "one",
            tier: 2,
            defaultRank: 1,
          }),
        ),
        facts,
      ).status,
    ).toBe("met");
    expect(
      evaluateRequirement(
        root(
          predicate({
            kind: "skill_tier_choice",
            skillId: "other",
            tier: 2,
            defaultRank: 1,
          }),
        ),
        facts,
      ).status,
    ).toBe("unmet");
  });
  it("uses current world observations, not historical kill identity", () => {
    const gate = root(
      predicate(
        { kind: "current_monster_dead", monsterSpawnId: "spawn" },
        "current_world",
      ),
    );
    expect(
      evaluateRequirement(gate, {
        world: {
          instanceToken: "new",
          monsters: {
            entries: [
              { monsterSpawnId: "spawn", instanceToken: "old", dead: true },
            ],
            complete: true,
          },
        },
      }).status,
    ).toBe("unknown");
    expect(
      evaluateRequirement(gate, {
        world: {
          instanceToken: "new",
          monsters: {
            entries: [
              { monsterSpawnId: "spawn", instanceToken: "new", dead: true },
            ],
            complete: false,
          },
        },
      }).status,
    ).toBe("met");
  });
  it("distinguishes selected broken instance UI and server eligibility", () => {
    const facts: RequirementFacts = {
      subjects: {
        selected_instance: {
          instances: {
            entries: [
              { itemId: "sword", definitionEligible: true, durability: 0 },
            ],
            complete: true,
          },
        },
      },
    };
    expect(
      evaluateRequirement(
        root(
          predicate(
            { kind: "instance_eligible", itemId: "sword", rule: "essence_ui" },
            "selected_instance",
          ),
        ),
        facts,
      ).status,
    ).toBe("unmet");
    expect(
      evaluateRequirement(
        root(
          predicate(
            {
              kind: "instance_eligible",
              itemId: "sword",
              rule: "essence_server",
            },
            "selected_instance",
          ),
        ),
        facts,
      ).status,
    ).toBe("met");
  });
  it("does not replace successful brew counters with owned potions", () => {
    const gate = root(
      predicate({
        kind: "quest_progress",
        questId: "brew",
        objectiveId: "brew-counter",
        counterKind: "brew",
        amount: 3,
      }),
    );
    const facts = player({
      items: {
        inventory: {
          entries: [{ itemId: "potion", amount: 3 }],
          complete: true,
        },
      },
      questProgress: {
        entries: [{ questId: "brew", objectiveId: "brew-counter", amount: 0 }],
        complete: true,
      },
    });
    expect(evaluateRequirement(gate, facts).status).toBe("unmet");
  });
});

describe("season conditions", () => {
  function season(name: "halloween" | "christmas"): RequirementRoot {
    return {
      phase: "purchase",
      subject: "current_world",
      enforcement: "server",
      expression: predicate(
        { kind: "season_active", season: name },
        "current_world",
      ),
    };
  }
  const at = (nowUtc: string): RequirementFacts => ({
    nowUtc: { known: true, value: nowUtc, provenance: "entered" },
  });

  it("wraps the Winter Festival across the new year", () => {
    expect(
      evaluateRequirement(season("christmas"), at("2027-01-03T12:00:00Z"))
        .status,
    ).toBe("met");
    expect(
      evaluateRequirement(season("christmas"), at("2026-12-18T23:59:00Z"))
        .status,
    ).toBe("unmet");
  });

  it("includes the last day of Halloween", () => {
    expect(
      evaluateRequirement(season("halloween"), at("2026-11-01T23:00:00Z"))
        .status,
    ).toBe("met");
    expect(
      evaluateRequirement(season("halloween"), at("2026-11-02T00:00:00Z"))
        .status,
    ).toBe("unmet");
  });

  it("is unknown without a current time", () => {
    expect(evaluateRequirement(season("halloween"), {}).status).toBe("unknown");
  });

  it("names the season and its dates", () => {
    expect(describeRequirement(season("christmas"))[0].text).toBe(
      "During the Winter Festival, December 19 to January 6",
    );
  });
});

describe("learning and quantities", () => {
  it("evaluates both curves at the described base rank and preserves zero costs", () => {
    expect(
      skillLearningAtRank(
        {
          maxRank: 5,
          levelRequirement: { base_value: 5, bonus_per_level: 3 },
          skillPointCost: { base_value: 1, bonus_per_level: 2 },
        },
        3,
      ),
    ).toEqual({ requiredLevel: 11, pointCost: 5 });
    expect(
      skillLearningAtRank(
        {
          maxRank: 1,
          levelRequirement: { base_value: 0, bonus_per_level: 0 },
          skillPointCost: { base_value: 0, bonus_per_level: 0 },
        },
        1,
      ),
    ).toEqual({ requiredLevel: 0, pointCost: 0 });
    expect(() =>
      skillLearningAtRank(
        {
          maxRank: 1,
          levelRequirement: { base_value: 0, bonus_per_level: 0 },
          skillPointCost: { base_value: 0, bonus_per_level: 0 },
        },
        2,
      ),
    ).toThrow();
    expect(() =>
      skillLearningAtRank(
        {
          maxRank: 0,
          levelRequirement: { base_value: 0, bonus_per_level: 0 },
          skillPointCost: { base_value: 0, bonus_per_level: 0 },
        },
        1,
      ),
    ).toThrow(RangeError);
  });
  it("preserves all-carried batch knowledge without inventing an exact amount", () => {
    expect(evaluateAllCarriedBatch(3, true)).toEqual({
      runes: { kind: "exact", value: 3 },
      gold: { kind: "exact", value: 225 },
    });
    expect(evaluateAllCarriedBatch(3, false)).toEqual({
      runes: { kind: "range", min: 3, max: null },
      gold: { kind: "range", min: 225, max: null },
    });
  });
});

describe("profession attempt floors", () => {
  it.each(["mining", "fishing"] as const)(
    "%s distinguishes a real quality zero from a missing tool",
    (profession) => {
      expect(professionAttempt(profession, 4, 0, 3)).toEqual({
        raw: 0.15000000000000002,
        qualified: false,
        displayed: 0,
      });
      expect(professionAttempt(profession, 4, 0, 4)).toEqual({
        raw: 0.2,
        qualified: true,
        displayed: 0.2,
      });
      const gate = root(
        predicate({ kind: "profession_floor", profession, tier: 4 }),
      );
      expect(
        evaluateRequirement(
          gate,
          player({
            professions: {
              [profession]: { known: true, value: 0, provenance: "entered" },
            },
          }),
        ).status,
      ).toBe("unknown");
      expect(
        evaluateRequirement(
          gate,
          player({
            professions: {
              [profession]: { known: true, value: 0, provenance: "entered" },
            },
            tools: {
              entries: [
                {
                  category: profession === "mining" ? "Pickaxe" : "Fishing Rod",
                  quality: 0,
                  durability: 1,
                },
              ],
              complete: true,
            },
          }),
        ).status,
      ).toBe("unmet");
    },
  );
  it.each(["alchemy", "herbalism"] as const)(
    "%s retains the ten-percent qualification boundary",
    (profession) => {
      expect(professionAttempt(profession, 4, 0.09, null).qualified).toBe(
        false,
      );
      expect(professionAttempt(profession, 4, 0.1, null).qualified).toBe(true);
    },
  );
  it("qualifies cooking before treating a non-food result as certain", () => {
    expect(professionAttempt("cooking", 4, 0.1, null, false).displayed).toBe(1);
    expect(
      professionAttempt("cooking", 4, 0.1, null, true).displayed,
    ).toBeCloseTo(0.1);
    expect(professionAttempt("cooking", 4, 0.09, null, false).qualified).toBe(
      false,
    );
  });
});
