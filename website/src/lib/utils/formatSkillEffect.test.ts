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
    ).toBe("+4% + 1% × skill lvl critical resist, 1m");
  });
});

describe("formatSkillEffect scaling formulas", () => {
  it("uses one exact, unwrapped formula for every scaling effect", () => {
    const attack = {
      skill_type: "target_damage",
      damage_type: "Physical",
      damage: { base_value: 30, bonus_per_level: 30 },
      stun_chance: { base_value: 0.01, bonus_per_level: 0.003 },
      stun_time: { base_value: 1, bonus_per_level: 0 },
    } as Skill;

    expect(formatSkillEffect(attack)).toBe(
      "30 × skill lvl physical dmg, 0.7% + 0.3% × skill lvl stun (1s)",
    );
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

  it("places the Virtuosity condition after its damage bonuses", () => {
    expect(
      formatSkillEffect({
        skill_type: "passive",
        is_bard_virtuosity: true,
        damage_percent_bonus: { base_value: 0.2, bonus_per_level: 0 },
        magic_damage_percent_bonus: { base_value: 0.2, bonus_per_level: 0 },
      } as Skill),
    ).toBe(
      "+20% phys dmg, +20% magic dmg, while performing the maximum number of songs you can sustain",
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
    ).toBe("Bard song, +3.5% × skill lvl fear resist (max 70%)");
  });

  it("identifies charm damage as a base value", () => {
    expect(
      formatSkillEffect({
        skill_type: "area_debuff",
        is_bard_charm: true,
        charmed_damage_percent: { base_value: 0.45, bonus_per_level: 0 },
      } as Skill),
    ).toBe("charms target at 45% base damage");
  });
});

describe("formatSkillEffect enrage passives", () => {
  const enrageSkill = {
    skill_type: "passive",
    damage_type: null,
    is_enrage: true,
  } as Skill;

  it("formats the passive enrage threshold without a monster context", () => {
    expect(formatSkillEffect(enrageSkill)).toBe("+50-75% damage below 10% HP");
  });

  it("formats the passive enrage threshold with a monster context", () => {
    expect(
      formatSkillEffect(enrageSkill, {
        monster: { damage: 0, magicDamage: 0 },
      }),
    ).toBe("+50-75% damage below 10% HP");
  });
});

describe("formatSkillEffect Necromancer mechanics", () => {
  it("shows Blood Pact rounding and missing-mana cap", () => {
    expect(
      formatSkillEffect({
        skill_type: "health_to_mana",
        is_necromancer_blood_pact: true,
        health_cost_percent: { base_value: 0.05, bonus_per_level: 0.05 },
        mana_restored_percent: { base_value: 0.05, bonus_per_level: 0.05 },
      } as Skill),
    ).toBe(
      "spend ceil(max hp × (5% × skill lvl)), restore floor(max mana × (5% × skill lvl)) (capped at missing mana)",
    );
  });

  it("uses health spent and Intelligence rather than heals_health for Death Bloom", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_heal",
        is_necromancer_death_bloom: true,
        health_cost_percent: { base_value: 0.5, bonus_per_level: 0 },
        healing_percent: { base_value: 1.5, bonus_per_level: 0.125 },
        healing_percent_per_intelligence: 0.001,
        heals_health: { base_value: 0, bonus_per_level: 0 },
      } as Skill),
    ).toBe(
      "spend ceil(max hp × (50%)), heal target for round(health spent × (137.5% + 12.5% × skill lvl + 0.1% × max(0, INT)))",
    );
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
    ).toBe("buffs your combat pet, +5% × skill lvl haste");
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        also_buff_active_pet: true,
        ward_bonus: { base_value: 50, bonus_per_level: 50 },
      } as Skill),
    ).toBe(
      "when self-cast, also buffs your combat pet in range, +50 × skill lvl ward",
    );
  });

  it.each(["Poison", "Disease"] as const)(
    "shows the Intelligence contribution to %s DoTs",
    (type) => {
      const skill = {
        skill_type: "target_debuff",
        damage_over_time_type: type,
        is_poison_debuff: type === "Poison",
        is_disease_debuff: type === "Disease",
        poison_disease_scales_with_intelligence: true,
        damage_over_time_bonus_per_intelligence_point: 1.25,
        healing_per_second_bonus: { base_value: -180, bonus_per_level: -60 },
      } as Skill;
      expect(formatSkillEffect(skill)).toBe(
        `120 + 60 × skill lvl + round(INT × 1.25) ${type.toLowerCase()} dmg/s`,
      );
      expect(formatSkillEffect({ ...skill, scales_with_charisma: true })).toBe(
        `120 + 60 × skill lvl ${type.toLowerCase()} dmg/s`,
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
    ).toBe("+5% × skill lvl DoT dmg vs targets below 30% hp");
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        lifetap_healing_percent_bonus: {
          base_value: 0.2,
          bonus_per_level: 0.05,
        },
      } as Skill),
    ).toBe("+15% + 5% × skill lvl lifetap healing");
  });

  it("identifies damage as distributed over channel pulses", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_damage",
        damage_type: "Magic",
        damage: { base_value: 20, bonus_per_level: 20 },
        channel_pulses: 3,
      } as Skill),
    ).toBe("20 × skill lvl magic dmg, channeled over 3 pulses");
  });

  it("assigns an owner's pet passive max-health bonus to the combat pet", () => {
    const skill = {
      skill_type: "passive",
      is_pet_skill: true,
      health_max_percent_bonus: { base_value: 0.02, bonus_per_level: 0.02 },
    } as Skill;
    expect(formatSkillEffect(skill)).toBe("+2% × skill lvl combat pet max hp");
    expect(formatSkillEffect({ ...skill, is_pet_skill: false })).toBe(
      "+2% × skill lvl max hp",
    );
  });
});
