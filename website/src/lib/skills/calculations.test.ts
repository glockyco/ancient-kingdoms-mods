import { describe, expect, test } from "vitest";
import type { SkillDetailView } from "$lib/types/skills";
import {
  bloodPactCalculation,
  channelCalculation,
  deathBloomCalculation,
} from "./calculations";

function skill(overrides: Partial<SkillDetailView>): SkillDetailView {
  return { id: "test", max_level: 5, ...overrides } as SkillDetailView;
}
function resultNumbers(result: string): number[] {
  return Array.from(result.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g), (match) =>
    Number(match[0].replaceAll(",", "")),
  );
}

describe("Hit Points conversion calculations", () => {
  test("Blood Pact computes missing Mana from readable current and maximum values", () => {
    const calculation = bloodPactCalculation(
      skill({
        health_cost_percent: { base_value: 0.05, bonus_per_level: 0.05 },
        mana_restored_percent: { base_value: 0.05, bonus_per_level: 0.05 },
      }),
    );
    expect(calculation.inputs?.map((input) => input.key)).toEqual([
      "rank",
      "maxHealth",
      "maxMana",
      "currentMana",
    ]);
    const values = { rank: 2, maxHealth: 201, maxMana: 1001, currentMana: 970 };
    expect(resultNumbers(calculation.example!(values).result)).toEqual([
      21, 31,
    ]);
    expect(
      resultNumbers(calculation.example!({ ...values, currentMana: 0 }).result),
    ).toEqual([21, 100]);
    expect(
      resultNumbers(
        calculation.example!({ ...values, currentMana: 1001 }).result,
      ),
    ).toEqual([21, 0]);
  });
  test("Death Bloom derives its pre-critical heal from Hit Points cost and Intelligence", () => {
    const calculation = deathBloomCalculation(
      skill({
        health_cost_percent: { base_value: 0.5, bonus_per_level: 0 },
        healing_percent: { base_value: 2, bonus_per_level: 0.25 },
        healing_percent_per_intelligence: 0.001,
      }),
    );
    expect(
      resultNumbers(
        calculation.example!({ rank: 1, maxHealth: 2000, intelligence: 100 })
          .result,
      ),
    ).toEqual([2100]);
    expect(
      resultNumbers(
        calculation.example!({ rank: 2, maxHealth: 2001, intelligence: 0 })
          .result,
      ),
    ).toEqual([2252]);
  });
});

describe("channel pulse timing", () => {
  test.each([
    [0, [1, 2, 3]],
    [0.75, [0.25, 0.5, 0.75]],
    [-0.75, [1.75, 3.5, 5.25]],
    [1, [0.02, 0.03, 0.05]],
    [1.5, [0.02, 0.03, 0.05]],
  ] as [number, number[]][])(
    "uses the full haste sum %s and the channel minimum",
    (spellHaste, times) => {
      const calculation = channelCalculation(
        skill({
          is_spell: true,
          channel_pulses: 3,
          cast_time: { base_value: 3, bonus_per_level: 0 },
        }),
      );
      expect(
        resultNumbers(calculation.example!({ spellHaste }).result),
      ).toEqual(times);
    },
  );
});
