import { describe, expect, it } from "vitest";
import {
  attributeBuff,
  attackInterval,
  avoidanceChance,
  bardPower,
  bardBonus,
  avoidanceCalculation,
  songCalculation,
  lifetapCalculation,
  receivedHitCalculation,
  healingCalculation,
  wisdomHeal,
  lifetapHeal,
  mitigate,
  mitigationCalculation,
  parryDamage,
  receivedRage,
  songValue,
  spellInterval,
  wildStrikeDamage,
  buffCalculation,
  buffAttribute,
  timingCalculation,
} from "./combat";
import {
  characterDamage,
  damageOverTimeBonuses,
  extraCleanseChance,
  hitPipelineExample,
  hitThreat,
  characterDamageCalculation,
  pipelineCalculation,
  advantageCalculation,
  damageOverTimeCalculation,
  threatCalculation,
  cleanseCalculation,
  dispelCalculation,
  dealtRageCalculation,
} from "./combat-rules";
import { DEFENSE, FIRE_RESIST, SPELL_HASTE } from "./inputs";

describe("combat calculations", () => {
  it("rounds mitigation up and bounds the stat percentage", () => {
    expect(mitigate(10, 100)).toMatchObject({ prevented: 1, taken: 9 });
    expect(mitigate(100, 100_000)).toMatchObject({ prevented: 90, taken: 10 });
    expect(mitigate(100, -100)).toMatchObject({ prevented: 0, taken: 100 });
  });

  it("keeps the reader's actual defensive stat key", () => {
    expect(mitigationCalculation().inputs).toEqual([DEFENSE]);
    expect(mitigationCalculation(FIRE_RESIST).inputs).toEqual([FIRE_RESIST]);
    const calculation = mitigationCalculation(FIRE_RESIST);
    expect(calculation.example?.({ fireResist: 100 })).toBeDefined();
  });

  it("caps the level contribution separately from elemental avoidance", () => {
    expect(avoidanceChance(100, 4, 0.03)).toBeCloseTo(0.04);
    expect(avoidanceChance(0, 100, 0)).toBeCloseTo(0.1);
    expect(avoidanceChance(5000, -100, 0)).toBeCloseTo(0.9);
    expect(avoidanceChance(0, -100, 1)).toBe(0);
  });

  it("caps physical block before adding the capped level term", () => {
    expect(avoidanceChance(100, 4, 0.03, true, 0.05, 0.02)).toBeCloseTo(0.07);
    expect(avoidanceChance(10_000, -100, 0, true)).toBeCloseTo(0.7);
  });

  it("distinguishes exact healing halves from float32 near-halves", () => {
    const ordinary = healingCalculation();
    const ranger = healingCalculation(true);
    // Ordinary 125 Wisdom gives exactly 50%. Triple Wisdom × 0.4% is slightly above 150% in float32.
    expect(wisdomHeal(1, 125)).toMatchObject({ bonus: 0, total: 1 });
    expect(wisdomHeal(3, 125)).toMatchObject({ bonus: 2, total: 5 });
    expect(wisdomHeal(1, 125, true)).toMatchObject({ bonus: 2, total: 3 });
    expect(wisdomHeal(3, 125, true)).toMatchObject({ bonus: 5, total: 8 });
    expect(ordinary.example?.({ baseValue: 1, wisdom: 125 })).toBeDefined();
    expect(ranger.example?.({ baseValue: 1, wisdom: 125 })).toBeDefined();
    expect(attributeBuff(10, 10_000, 0.004, true)).toMatchObject({
      bonus: 50,
      total: 60,
    });
  });

  it("rounds song power before Melody, including even half cases", () => {
    expect(songValue(1, 500)).toMatchObject({ scaled: 2, total: 2 });
    expect(songValue(3, 500, 0.25)).toMatchObject({ scaled: 4, total: 5 });
    expect(songValue(2, 500, 0.5)).toMatchObject({ scaled: 3, total: 4 });
    expect(songValue(3, 50_000)).toMatchObject({ power: 3, scaled: 9 });
    expect(songValue(3, -100)).toMatchObject({ power: 1, scaled: 3 });
  });

  it("rounds each buff's attribute addition before adding the base", () => {
    expect(attributeBuff(1, 10, 0.15)).toEqual({ bonus: 2, total: 3 });
    expect(attributeBuff(1, 30, 0.15)).toEqual({ bonus: 4, total: 5 });
    expect(attributeBuff(1, 2, 0.75)).toEqual({ bonus: 2, total: 3 });
    expect(attributeBuff(1, 5, 0.3)).toEqual({ bonus: 2, total: 3 });
    expect(
      buffCalculation()
        .inputs?.filter((input) => input.remember)
        .map((input) => input.key),
    ).toEqual(["wisdom", "intelligence", "constitution", "charisma"]);
  });

  it("derives buff attributes from readable stats with Ranger and mercenary rules", () => {
    expect(buffAttribute(101, 203, 100, 100, 0, false)).toBe(101);
    expect(buffAttribute(101, 203, 100, 100, 0, true)).toBe(203);
    expect(buffAttribute(101, 203, 100, 100, 1, false)).toBe(303);
    expect(buffAttribute(101, 203, 100, 100, 1, true)).toBe(609);
    expect(buffAttribute(101, 203, 100, 100, 2, true)).toBe(100);
    expect(buffAttribute(103, 203, 100, 100, 2, false)).toBe(102);
    expect(buffAttribute(101, 203, 100, 100, 3, false)).toBe(150);
    expect(buffAttribute(103, 203, 100, 100, 3, true)).toBe(152);
    const leadership = buffCalculation("leadership");
    expect(
      leadership.inputs?.find((input) => input.key === "caster")?.value,
    ).toBe(3);
    expect(
      leadership.inputs
        ?.find((input) => input.key === "caster")
        ?.choices?.map((choice) => choice.value),
    ).toEqual([3]);
    expect(
      buffCalculation()
        .inputs?.find((input) => input.key === "caster")
        ?.choices?.map((choice) => choice.value),
    ).toEqual([0, 1, 2]);
    expect(leadership.steps[1].rounding).toBeUndefined();
    expect(
      attributeBuff(30, buffAttribute(100, 100, 100, 100, 3, false), 1),
    ).toEqual({ bonus: 150, total: 180 });
  });

  it("uses bounded Haste and subtracts the rounded float product before division", () => {
    expect(attackInterval(1, 30, 0.2).wait).toBeCloseTo(0.96);
    expect(attackInterval(1, 30, 2).wait).toBe(0.25);
    expect(attackInterval(1, 100, -2).wait).toBe(2);
  });

  it("uses full Spell Haste rather than the displayed 50% cap", () => {
    expect(spellInterval(2, 0.75)).toEqual({ casting: 0.5, total: 1.25 });
    expect(timingCalculation(true).inputs?.[1]).toBe(SPELL_HASTE);
  });

  it("adds independent float durations without narrowing the double interval", () => {
    const attack = attackInterval(0.1, 30, 0.2);
    expect(attack.total).toBe(Math.fround(0.1) + attack.wait);
    expect(attack.total).not.toBe(Math.fround(attack.total));
    const spell = spellInterval(0.1, 0);
    expect(spell.total).toBe(Math.fround(0.1) + 0.75);
    expect(spell.total).not.toBe(Math.fround(spell.total));
  });

  it("shares Bard power with float32 addition and the 200% bonus cap", () => {
    expect(bardPower(-100)).toBe(1);
    expect(bardPower(1)).toBe(Math.fround(1 + Math.fround(0.001)));
    expect(bardPower(2000)).toBe(3);
    expect(bardPower(50_000)).toBe(3);
  });

  it("exposes raw values before shared healing, song, and interval bounds", () => {
    const healing = wisdomHeal(100, 3000);
    expect(healing.rawShare).toBeCloseTo(12);
    expect(healing.share).toBe(5);
    const bonus = bardBonus(3000);
    expect(bonus.raw).toBeCloseTo(3);
    expect(bonus.limited).toBe(2);
    expect(bardBonus(-100)).toEqual({ raw: 0, limited: 0 });
    const interval = attackInterval(1, 100, 0.2);
    expect(interval.rawWait).toBeCloseTo(3.2);
    expect(interval.wait).toBe(2);
  });

  it("floors lifetap after both multiplications", () => {
    expect(lifetapHeal(201, 0.2, 0.25)).toBe(50);
    expect(lifetapHeal(3, 0.5, 0)).toBe(1);
    expect(lifetapHeal(0, 0.5, 0.5)).toBe(0);
  });

  it("rounds Wild Strike's complete empowered hit to even", () => {
    expect(wildStrikeDamage(3, 5)).toBe(4);
    expect(wildStrikeDamage(5, 5)).toBe(8);
  });

  it("bounds Parry after rounding and does not counter a fully absorbed hit", () => {
    expect(parryDamage(101)).toBe(50);
    expect(parryDamage(103)).toBe(52);
    expect(parryDamage(1)).toBe(1);
    expect(parryDamage(20_000)).toBe(5000);
    expect(parryDamage(0)).toBe(0);
  });

  it("floors bounded square-root Rage and grants none for zero damage", () => {
    expect(receivedRage(100)).toBe(3);
    expect(receivedRage(1)).toBe(1);
    expect(receivedRage(100_000)).toBe(25);
    expect(receivedRage(0)).toBe(0);
  });

  it("rounds a character-window percentage addition rather than the final sum", () => {
    expect(characterDamage(201, 0.5)).toBe(301);
    expect(characterDamage(203, 0.5)).toBe(305);
    expect(characterDamage(100, -2)).toBe(0);
  });

  it("preserves ordered moving, variance, advantage, level, mitigation, critical and shield stages", () => {
    expect(hitPipelineExample()).toMatchObject({
      moving: 221,
      variance: 232,
      behind: 257,
      leveled: 268,
      mitigation: { prevented: 14, taken: 254 },
      critical: 356,
      healthDamage: 326,
    });
  });

  it("rounds layers up before separately rounding Reaper Form and execute", () => {
    expect(damageOverTimeBonuses(101, 2, 0.5, 0.1)).toEqual({
      layered: 86,
      transformed: 129,
      total: 142,
    });
    expect(damageOverTimeBonuses(3, 3, 0.5, 0)).toEqual({
      layered: 3,
      transformed: 4,
      total: 4,
    });
    expect(damageOverTimeBonuses(1, 1, 0, 0)).toEqual({
      layered: 1,
      transformed: 1,
      total: 1,
    });
  });

  it("skips execute scaling when there is no positive execute bonus", () => {
    expect(damageOverTimeBonuses(101, 3, 0, -0.5)).toEqual({
      layered: 101,
      transformed: 101,
      total: 101,
    });
  });

  it("rounds control threat independently and caps the total at victim Health", () => {
    expect(hitThreat(10, 2000, 201, 0.5, 3, 0.1, 5, 5000)).toEqual({
      stun: 15,
      fear: 5,
      total: 2231,
    });
    expect(hitThreat(0, 2000, 201, 0.25, 1, 0, 0, 1000)).toEqual({
      stun: 2,
      fear: 0,
      total: 203,
    });
    expect(hitThreat(10, 2000, 201, 0, 0, 0, 0, 100)).toMatchObject({
      total: 100,
    });
  });

  it("bounds extra Cleanse rolls after Accuracy multiplies the remaining chance", () => {
    expect(extraCleanseChance(0.5, 0.2)).toBeCloseTo(0.6);
    expect(extraCleanseChance(0.1, 1)).toBe(1);
    expect(extraCleanseChance(1, 1)).toBe(0);
  });

  it("keeps worked lines named and in declared step order", () => {
    const calculations = [
      mitigationCalculation(),
      avoidanceCalculation(),
      avoidanceCalculation(true),
      healingCalculation(),
      healingCalculation(true),
      songCalculation(),
      buffCalculation(),
      buffCalculation("capacity"),
      buffCalculation("shield"),
      buffCalculation("shortHeal"),
      buffCalculation("longHeal"),
      buffCalculation("leadership"),
      timingCalculation(),
      timingCalculation(true),
      lifetapCalculation(),
      receivedHitCalculation(),
      characterDamageCalculation,
      pipelineCalculation,
      advantageCalculation,
      damageOverTimeCalculation,
      threatCalculation,
      cleanseCalculation,
      dispelCalculation,
      dealtRageCalculation,
    ];
    for (const calculation of calculations) {
      const values = Object.fromEntries(
        (calculation.inputs ?? []).map((input) => [input.key, input.value]),
      );
      const example = calculation.example!(values);
      const names = calculation.steps.map((step) => step.name);
      let previous = -1;
      for (const line of example.working) {
        const index = names.indexOf(line.split(":")[0]);
        expect(index, line).toBeGreaterThanOrEqual(0);
        expect(index, line).toBeGreaterThanOrEqual(previous);
        previous = index;
      }
    }
  });
});
