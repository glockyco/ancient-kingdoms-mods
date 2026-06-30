import { describe, expect, it } from "vitest";
import { formatSkillEffect, type Skill } from "./formatSkillEffect";

function movementDebuff(speed: number): Skill {
  return {
    skill_type: "target_debuff",
    damage_type: null,
    speed_bonus: { base_value: speed, bonus_per_level: 0 },
    duration_base: 10,
  } as Skill;
}

describe("formatSkillEffect movement debuffs", () => {
  it("treats -10 speed as root but -9 speed as a slow", () => {
    expect(formatSkillEffect(movementDebuff(-9))).toBe("-9 speed, 10s");
    expect(formatSkillEffect(movementDebuff(-10))).toBe("root, 10s");
  });

  it("keeps -50 speed as sleep", () => {
    expect(formatSkillEffect(movementDebuff(-50))).toBe("sleep, 10s");
  });
});

describe("formatSkillEffect stat bonuses", () => {
  it("formats critical resist bonuses", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        critical_resist_bonus: { base_value: 0.05, bonus_per_level: 0.01 },
        duration_base: 60,
      } as Skill),
    ).toBe("+5% (+1%/lvl) critical resist, 1m");
  });
});
