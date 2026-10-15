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
    ).toBe("+4% + 1% × rank critical resist, 1m");
  });
});

describe("formatSkillEffect damage", () => {
  it("multiplies the caster's stats and the listed damage together", () => {
    // Dying Grasp: TargetDamageSkill adds Spell Power to 400, then multiplies the sum by 200%.
    expect(
      formatSkillEffect({
        skill_type: "target_damage",
        damage_type: "Magic",
        damage: { base_value: 400, bonus_per_level: 0 },
        damage_percent: { base_value: 2, bonus_per_level: 0 },
        damage_stats: ["spell_power"],
        monster_damage_stats: ["spell_power"],
      } as Skill),
    ).toBe("(spell power + 400) × 200% magic dmg");
  });

  it("groups a rank-scaled multiplier so it covers the whole sum", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_projectile",
        damage_type: "Physical",
        damage: { base_value: 1, bonus_per_level: 0 },
        damage_percent: { base_value: 2, bonus_per_level: 0.25 },
        damage_stats: ["attack_power", "ranged_dexterity"],
        monster_damage_stats: ["attack_power"],
      } as Skill),
    ).toBe(
      "(attack power + 150% of dexterity + 1) × (175% + 25% × rank) physical dmg",
    );
  });

  it("adds every stat a monster's weapon spell uses before rounding to even", () => {
    expect(
      formatSkillEffect(
        {
          skill_type: "target_damage",
          damage_type: "Magic",
          damage: { base_value: 1, bonus_per_level: 0 },
          damage_percent: { base_value: 0.5, bonus_per_level: 0 },
          damage_stats: ["spell_power", "attack_power"],
          monster_damage_stats: ["spell_power", "attack_power"],
        } as Skill,
        // (1 Spell Power + 3 Attack Power + 1) × 50% = 2.5, which rounds to even.
        { monster: { damage: 3, magicDamage: 1 } },
      ),
    ).toBe("2 magic dmg");
  });
});

describe("formatSkillEffect Bard summaries", () => {
  it.each(["detect_traps", "sharp_senses"])(
    "describes %s without a redundant class label",
    (id) => {
      expect(formatSkillEffect({ id, skill_type: "passive" } as Skill)).toBe(
        "reveal and disarm traps",
      );
    },
  );

  it("states the Virtuosity condition before the bonuses it gates", () => {
    const summary = formatSkillEffect({
      skill_type: "passive",
      is_bard_virtuosity: true,
      additional_damage_percent_per_song: 0.05,
      damage_percent_bonus: { base_value: 0.2, bonus_per_level: 0 },
      magic_damage_percent_bonus: { base_value: 0.2, bonus_per_level: 0 },
    } as Skill);
    expect(summary.indexOf("3+ active songs")).toBeLessThan(
      summary.indexOf("attack power"),
    );
  });

  it("leaves Charisma scaling to the mechanics section", () => {
    expect(
      formatSkillEffect({
        skill_type: "area_buff",
        is_bard_song: true,
        scales_with_charisma: true,
        accuracy_bonus: { base_value: 0.1, bonus_per_level: 0 },
      } as Skill),
    ).toBe("Bard song, +10% accuracy");
  });

  it("shows the post-Charisma cap for Fear Resistance", () => {
    expect(
      formatSkillEffect({
        skill_type: "area_buff",
        is_bard_song: true,
        fear_resist_chance_bonus: {
          base_value: 0.035,
          bonus_per_level: 0.035,
        },
        fear_resist_chance_bonus_cap: 0.7,
      } as Skill),
    ).toBe("Bard song, +3.5% × rank fear resist (max 70%)");
  });

  it("drops the debuff type tag from a charm", () => {
    expect(
      formatSkillEffect({
        skill_type: "area_debuff",
        is_bard_charm: true,
        is_magic_debuff: true,
        charmed_damage_percent: { base_value: 0.45, bonus_per_level: 0 },
      } as Skill),
    ).not.toContain("magic debuff");
  });
});

describe("formatSkillEffect enrage passives", () => {
  const enrageSkill = {
    skill_type: "passive",
    damage_type: null,
    is_enrage: true,
  } as Skill;

  it("describes the passive enrage threshold the same way with a monster context", () => {
    expect(
      formatSkillEffect(enrageSkill, {
        monster: { damage: 0, magicDamage: 0 },
      }),
    ).toBe(formatSkillEffect(enrageSkill));
  });
});

describe("formatSkillEffect Necromancer mechanics", () => {
  it("uses health spent and Intelligence rather than heals_health for Death Bloom", () => {
    const summary = formatSkillEffect({
      skill_type: "target_heal",
      is_necromancer_death_bloom: true,
      health_cost_percent: { base_value: 0.5, bonus_per_level: 0 },
      healing_percent: { base_value: 1.5, bonus_per_level: 0.125 },
      healing_percent_per_intelligence: 0.001,
      heals_health: { base_value: 999, bonus_per_level: 0 },
    } as Skill);
    expect(summary).not.toContain("999");
    expect(summary).toContain("0.1%");
  });

  it("identifies Reaper Form's toggle and max-health drain", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        is_necromancer_reaper_form: true,
        is_permanent: true,
        duration_base: 10,
        health_percent_per_second_bonus: {
          base_value: -0.05,
          bonus_per_level: 0,
        },
      } as Skill),
    ).toBe("toggle form, 5% max hp drain/s");
  });

  it("identifies combat-pet buffs separately from self-cast pet sharing", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        is_necromancer_pet_buff: true,
        haste_bonus: { base_value: 0.05, bonus_per_level: 0.05 },
      } as Skill),
    ).toBe("buffs your companion, +5% × rank haste");
    const sharing = {
      skill_type: "target_buff",
      also_buff_active_pet: true,
      cast_range: 12,
      ward_bonus: { base_value: 50, bonus_per_level: 50 },
    } as Skill;
    expect(formatSkillEffect(sharing)).not.toContain("self-cast");
    expect(formatSkillEffect({ ...sharing, can_buff_others: true })).toContain(
      "when self-cast",
    );
  });

  it.each(["Poison", "Disease"] as const)(
    "omits attribute contributions from %s DoT summaries",
    (type) => {
      const skill = {
        skill_type: "target_debuff",
        damage_over_time_type: type,
        is_poison_debuff: type === "Poison",
        is_disease_debuff: type === "Disease",
        healing_per_second_bonus: { base_value: -180, bonus_per_level: -60 },
      } as Skill;
      expect(formatSkillEffect(skill)).toBe(
        `120 + 60 × rank ${type.toLowerCase()} dmg/s`,
      );
      expect(formatSkillEffect({ ...skill, scales_with_charisma: true })).toBe(
        `120 + 60 × rank ${type.toLowerCase()} dmg/s`,
      );
    },
  );

  it("shows DoT execute and lifetap-healing bonuses without implying direct damage bonuses", () => {
    expect(
      formatSkillEffect({
        skill_type: "passive",
        damage_over_time_execute_bonus: {
          base_value: 0.05,
          bonus_per_level: 0.05,
        },
      } as Skill),
    ).toBe("+5% × rank DoT dmg vs targets below 30% hp");
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        lifetap_healing_percent_bonus: {
          base_value: 0.2,
          bonus_per_level: 0.05,
        },
      } as Skill),
    ).toBe("+15% + 5% × rank lifetap healing");
  });

  it("identifies damage as distributed over channel pulses", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_damage",
        damage_type: "Magic",
        damage: { base_value: 20, bonus_per_level: 20 },
        damage_stats: ["spell_power"],
        monster_damage_stats: ["spell_power"],
        channel_pulses: 3,
      } as Skill),
    ).toContain("channeled over 3 pulses");
  });

  it("assigns an owner's pet passive max-health bonus to the companion", () => {
    const skill = {
      skill_type: "passive",
      is_pet_skill: true,
      health_max_percent_bonus: { base_value: 0.02, bonus_per_level: 0.02 },
    } as Skill;
    expect(formatSkillEffect(skill)).toBe("+2% × rank companion max hp");
    expect(formatSkillEffect({ ...skill, is_pet_skill: false })).toBe(
      "+2% × rank max hp",
    );
  });
});
