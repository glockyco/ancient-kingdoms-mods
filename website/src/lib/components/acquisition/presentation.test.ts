import { render } from "svelte/server";
import { parse } from "node-html-parser";
import { describe, expect, test } from "vitest";
import type {
  ItemUseView,
  MethodView,
  ProbabilityResult,
  RequirementRoot,
  RequirementFacts,
} from "$lib/acquisition/types";
import MethodList from "./MethodList.svelte";
import Inspection from "./Inspection.svelte";
import UseList from "./UseList.svelte";
import {
  probabilityScenarioText,
  questPresentationRequirements,
  skillPresentationRequirements,
} from "./display";
import { BASELINE_ASSUMPTIONS } from "$lib/acquisition/rules";
import {
  combine,
  evaluateRequirement,
  predicate,
} from "$lib/acquisition/conditions";

function recipe(methodId: string, amount: number): MethodView {
  return {
    methodId,
    kind: "recipe",
    ruleId: "crafting",
    phase: "attempt",
    setupMethod: null,
    providers: [],
    homeProviders: [],
    outputs: [
      {
        id: `${methodId}:out`,
        method_id: methodId,
        ordinal: 0,
        resource_kind: "item",
        item_id: "arrows",
        amount_min: amount,
        amount_max: amount,
        yield_rule: "fixed",
        delivery: "inventory",
        slot: null,
        condition_slot: null,
        withheld: 0,
        quantity: { kind: "exact", value: amount },
        requirements: [],
      },
    ],
    costGroups: [
      {
        id: `${methodId}:cost`,
        method_id: methodId,
        phase: "attempt",
        quantity_rule: "fixed",
        consumption_rule: "on_success",
        selection_rule: "always",
        inputs: [
          {
            id: `${methodId}:input`,
            cost_group_id: `${methodId}:cost`,
            ordinal: 0,
            resource_kind: "item",
            item_id: "wood",
            amount: 2,
            withheld: 0,
            role: "material",
          },
        ],
      },
    ],
    requirements: [],
    effects: [],
    repeatability: { kind: "repeatable" },
    probabilityResults: [],
    probabilityFactors: [],
    rooted: true,
    sourceLevelHint: 1,
    detail: {
      id: methodId,
      crafting_recipe_id: "arrows_recipe",
      display_kind: "crafting",
      result_amount: amount,
      tier: 0,
      experience: 0,
    },
  };
}
const items = { arrows: { name: "Arrows" }, wood: { name: "Wood" } };
const learningSkill = {
  id: "skill",
  player_classes: ["druid", "cleric"],
  is_veteran: true,
  required_spent_points: 20,
  prerequisite_skill_id: "predecessor",
  prerequisite_level: 2,
  prerequisite2_skill_id: null,
  prerequisite2_level: 0,
  tier: 2,
  learn_default: false,
} satisfies Parameters<typeof skillPresentationRequirements>[1];

describe("canonical acquisition presentation", () => {
  test("preserves quest alternatives and item quantities without weakening canonical availability", () => {
    const inactive = predicate({
      kind: "quest_state",
      questId: "quest",
      state: "not_active",
    });
    const tokens = predicate({
      kind: "item_count",
      itemId: "token",
      location: "inventory",
      amount: 5,
    });
    const root: RequirementRoot = {
      phase: "accept",
      subject: "player",
      enforcement: "server",
      expression: combine("all", [inactive, tokens]),
    };
    const facts = (active: boolean, amount: number) => ({
      subjects: {
        player: {
          quests: {
            complete: true,
            entries: [{ questId: "quest", active, completed: false }],
          },
          items: {
            inventory: {
              complete: true,
              entries: [{ itemId: "token", amount }],
            },
          },
        },
      },
    });
    const displayed = questPresentationRequirements([root], "quest", {
      requiredLevel: 1,
      restrictions: true,
    })[0];
    expect(evaluateRequirement(displayed, facts(true, 4)).status).toBe("unmet");
    expect(evaluateRequirement(displayed, facts(true, 5)).status).toBe("met");
    expect(evaluateRequirement(root, facts(true, 5)).status).toBe("unmet");
    const alternative: RequirementRoot = {
      ...root,
      expression: combine("any", [inactive, tokens]),
    };
    const visibleAlternative = questPresentationRequirements(
      [alternative],
      "quest",
      { requiredLevel: 1, restrictions: true },
    )[0];
    expect(
      evaluateRequirement(visibleAlternative, facts(false, 4)).status,
    ).toBe("met");
  });
  test("omits only represented learning gates without mutating canonical availability", () => {
    const hidden = predicate({
      kind: "withheld",
      reason: "unpublished_target",
    });
    const root: RequirementRoot = {
      phase: "learn",
      subject: "player",
      enforcement: "server",
      expression: combine("all", [
        combine(
          "any",
          learningSkill.player_classes.map((id) =>
            predicate({ kind: "identity_is", identityKind: "class", id }),
          ),
        ),
        predicate({
          kind: "metric_at_least",
          metric: "level",
          amount: 10,
          unit: "levels",
        }),
        predicate({
          kind: "metric_at_least",
          metric: "available_veteran_points",
          amount: 3,
          unit: "points",
        }),
        predicate({
          kind: "metric_at_least",
          metric: "spent_veteran_points",
          amount: 20,
          unit: "points",
        }),
        predicate({
          kind: "skill_base_rank",
          skillId: "predecessor",
          rank: 2,
        }),
        hidden,
      ]),
    };
    const facts: RequirementFacts = {
      subjects: {
        player: {
          identities: {
            class: { known: true, value: "rogue", provenance: "entered" },
          },
          metrics: {
            level: { known: true, value: 0, provenance: "entered" },
            available_veteran_points: {
              known: true,
              value: 0,
              provenance: "entered",
            },
            spent_veteran_points: {
              known: true,
              value: 0,
              provenance: "entered",
            },
          },
          skills: { complete: true, entries: [] },
        },
      },
    };
    const learning = { requiredLevel: 10, pointCost: 3 };
    const displayed = skillPresentationRequirements(
      [root],
      learningSkill,
      learning,
    )[0];
    expect(evaluateRequirement(displayed, facts).status).toBe("unknown");
    expect(evaluateRequirement(root, facts).status).toBe("unmet");
    const additionalLevel: RequirementRoot = {
      ...root,
      expression: combine("all", [
        root.expression,
        predicate({
          kind: "metric_at_least",
          metric: "level",
          amount: 11,
          unit: "levels",
        }),
      ]),
    };
    expect(
      evaluateRequirement(
        skillPresentationRequirements(
          [additionalLevel],
          learningSkill,
          learning,
        )[0],
        facts,
      ).status,
    ).toBe("unmet");
  });

  test("preserves mixed alternatives and class sets not represented by the page", () => {
    const level = predicate({
      kind: "metric_at_least",
      metric: "level",
      amount: 10,
      unit: "levels",
    });
    const root: RequirementRoot = {
      phase: "learn",
      subject: "player",
      enforcement: "server",
      expression: combine("any", [
        level,
        predicate({ kind: "withheld", reason: "unpublished_target" }),
      ]),
    };
    const learning = { requiredLevel: 10, pointCost: 3 };
    const displayed = skillPresentationRequirements(
      [root],
      learningSkill,
      learning,
    )[0];
    const levelFacts = (value: number): RequirementFacts => ({
      subjects: {
        player: {
          metrics: {
            level: { known: true, value, provenance: "entered" },
          },
        },
      },
    });
    expect(evaluateRequirement(displayed, levelFacts(9)).status).toBe(
      "unknown",
    );
    expect(evaluateRequirement(displayed, levelFacts(10)).status).toBe("met");
    const classes: RequirementRoot = {
      ...root,
      expression: combine(
        "any",
        ["druid", "ranger"].map((id) =>
          predicate({ kind: "identity_is", identityKind: "class", id }),
        ),
      ),
    };
    const classFacts: RequirementFacts = {
      subjects: {
        player: {
          identities: {
            class: { known: true, value: "cleric", provenance: "entered" },
          },
        },
      },
    };
    expect(
      evaluateRequirement(
        skillPresentationRequirements([classes], learningSkill, learning)[0],
        classFacts,
      ).status,
    ).toBe("unmet");
    expect(
      skillPresentationRequirements(
        [
          {
            ...classes,
            expression: combine("any", [
              predicate({
                kind: "identity_is",
                identityKind: "class",
                id: "cleric",
              }),
              predicate({
                kind: "identity_is",
                identityKind: "class",
                id: "druid",
              }),
            ]),
          },
        ],
        learningSkill,
        learning,
      ),
    ).toEqual([]);
  });

  test("retains one quest objective preview when no separate objective view is shown", () => {
    const progress = predicate({
      kind: "quest_progress",
      questId: "quest",
      objectiveId: "objective",
      counterKind: "kill",
      amount: 15,
    });
    const fulfill: RequirementRoot = {
      phase: "fulfill",
      subject: "player",
      enforcement: "server",
      expression: progress,
    };
    const complete: RequirementRoot = {
      ...fulfill,
      phase: "complete",
      expression: combine("all", [
        predicate({ kind: "quest_state", questId: "quest", state: "active" }),
        progress,
      ]),
    };
    const displayed = questPresentationRequirements(
      [fulfill, complete],
      "quest",
      { objectives: false },
    );
    expect(displayed.map((root) => root.phase)).toEqual(["fulfill"]);
    const facts = (amount: number): RequirementFacts => ({
      subjects: {
        player: {
          questProgress: {
            complete: true,
            entries: [{ questId: "quest", objectiveId: "objective", amount }],
          },
          quests: { complete: true, entries: [] },
        },
      },
    });
    expect(evaluateRequirement(displayed[0], facts(14)).status).toBe("unmet");
    expect(evaluateRequirement(displayed[0], facts(15)).status).toBe("met");
    expect(evaluateRequirement(complete, facts(15)).status).toBe("unmet");
  });

  test("keeps complete alternatives and consumed material amounts visible", () => {
    const root = parse(
      render(MethodList, {
        props: { methods: [recipe("first", 25), recipe("second", 50)], items },
      }).body,
    );
    expect(root.querySelectorAll("article")).toHaveLength(2);
    expect(root.textContent).toContain("25");
    expect(root.textContent).toContain("50");
    expect(root.querySelectorAll('a[href="/items/wood"]')).toHaveLength(2);
    expect(root.textContent).toContain("×2");
  });

  test("does not expose suppressed provider focus links", () => {
    const method = recipe("first", 25);
    const methods: MethodView[] = [
      {
        ...method,
        providers: [
          {
            ref: { kind: "crafting_stations", id: "hidden_station" },
            name: "Station",
            offerIndex: 0,
            requirements: [],
            location: {
              provider: { kind: "crafting_stations", id: "hidden_station" },
              name: "Station",
              zoneId: null,
              subZoneId: null,
              position: null,
              geometryVisibility: "suppressed",
              purpose: "award",
              methodIds: ["first"],
              approximate: false,
            },
          },
        ],
      },
    ];
    const root = parse(render(MethodList, { props: { methods, items } }).body);
    expect(root.querySelector('a[href*="entity=hidden_station"]')).toBeNull();
    expect(root.textContent).toContain("location not published");
  });

  test("shows an offered pack as an offer rather than claiming carried delivery", () => {
    const method = { ...recipe("offer", 25), kind: "vendor" as const };
    const root = parse(
      render(Inspection, {
        props: {
          inspection: {
            offeredAssets: [method],
            initiatingMemberships: [],
            fixedContents: [
              {
                itemId: "arrows",
                withheld: false,
                amount: { kind: "exact", value: 25 },
                poolId: null,
                ordinal: 0,
                probability: 1,
              },
            ],
            randomOutcomes: [],
            portableChestOutcomes: [],
            offerLocations: [],
          },
          items,
        },
      }).body,
    );
    expect(root.querySelectorAll('a[href="/items/arrows"]')).toHaveLength(2);
    expect(root.textContent).toContain("25");
  });
  test("retains a portal origin map link without inventing a destination", () => {
    const uses: ItemUseView[] = [
      {
        itemId: "key",
        kind: "requirement",
        method: null,
        phase: "enter",
        role: "portal_key",
        amount: { kind: "exact", value: 1 },
        consumed: false,
        requirements: [],
        entity: { kind: "portal", id: "origin_portal" },
        useLocations: [
          {
            provider: { kind: "portals", id: "origin_portal" },
            name: "Origin zone, destination unpublished",
            zoneId: "origin",
            subZoneId: null,
            position: { x: 1, y: 2, z: 0 },
            geometryVisibility: "visible",
            purpose: "use",
            methodIds: [],
            approximate: false,
          },
        ],
      },
    ];
    const root = parse(render(UseList, { props: { uses } }).body);
    expect(
      root.querySelector(
        'a[href*="entity=origin_portal"][href*="etype=portal"]',
      ),
    ).not.toBeNull();
    expect(root.textContent).toContain("destination unpublished");
  });

  test("renders canonical augment compatibility and recovery without a fabricated origin", () => {
    const uses: ItemUseView[] = [
      {
        itemId: "augment",
        kind: "augment",
        method: null,
        phase: "use",
        role: "attachment",
        amount: { kind: "exact", value: 1 },
        consumed: true,
        requirements: [],
        entity: null,
        useLocations: [],
        compatibility: {
          categoryRule: "in",
          categories: ["Shield", "Chest"],
          excludedItemTypes: ["Ammo", "Augment"],
          recoverable: true,
          normalRecoveryGold: 10000,
        },
      },
    ];
    const root = parse(render(UseList, { props: { uses } }).body);
    expect(root.textContent).toContain("Shield");
    expect(root.textContent).toContain("10,000 gold");
    expect(root.querySelector('a[href*="/map"]')).toBeNull();
    expect(root.textContent).not.toContain("Not consumed");
  });
  test("keeps long service alternatives inspectable behind disclosure", () => {
    const methods: MethodView[] = Array.from({ length: 8 }, (_, index) => ({
      ...recipe(`essence_${index}`, index + 1),
      kind: "essence",
      detail: { id: `essence_${index}`, service_role: "essence" },
    }));
    const root = parse(
      render(MethodList, {
        props: { methods, items, selectedItemId: "arrows" },
      }).body,
    );
    expect(root.querySelectorAll("article")).toHaveLength(8);
    expect(root.querySelector("details")?.hasAttribute("open")).toBe(false);
    expect(root.querySelectorAll("details")).toHaveLength(9);
  });
  test("formats only applicable probability inputs and converts skill fractions to percent", () => {
    const result: ProbabilityResult = {
      methodId: "chest",
      outcomeKey: "arrows",
      target: { kind: "item", itemId: "arrows", delivery: "inventory" },
      event: "opening",
      quantityMeaning: "at_least_one",
      probability: 0.25,
      expectedQuantity: 0.25,
      assumptions: { ...BASELINE_ASSUMPTIONS, treasureHunter: 0.35 },
    };
    expect(probabilityScenarioText(result, ["treasure_hunter"])).toContain(
      "35%",
    );
    expect(probabilityScenarioText(result, ["treasure_hunter"])).not.toContain(
      "Fatecharm",
    );
    expect(probabilityScenarioText(result, [])).toBe("");
  });
});
