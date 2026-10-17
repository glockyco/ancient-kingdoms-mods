import { describe, expect, it } from "vitest";
import { formatSkillEffect } from "./formatSkillEffect";

describe("formatSkillEffect movement debuffs", () => {
  const debuff = (speed: number) =>
    formatSkillEffect({
      skill_type: "target_debuff",
      speed_bonus: { base_value: speed, bonus_per_level: 0 },
      duration_base: 10,
    });

  it("treats -10 speed as root but -9 speed as a slow", () => {
    expect(debuff(-9)).not.toContain("root");
    expect(debuff(-9)).toContain("Movement Speed");
    expect(debuff(-10)).toContain("root");
  });

  it("keeps -50 speed as sleep", () => {
    expect(debuff(-50)).toContain("sleep");
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
        damage_terms: ["spell_power"],
      }),
    ).toMatch(/^\(Spell Power \+ 400\) × 200%/);
  });

  it("subtracts weapon Base Damage inside the sum the multiplier covers", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_projectile",
        damage_type: "Physical",
        damage: { base_value: 1, bonus_per_level: 0 },
        damage_percent: { base_value: 2, bonus_per_level: 0.25 },
        damage_terms: ["attack_power", "ranged_dexterity", "main_hand"],
      }),
    ).toMatch(
      /^\(Attack Power \+ 150% of Dexterity − main-hand Base Damage \+ 1\) × \(200% \+ 25% × \(rank − 1\)\)/,
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
          damage_terms: ["spell_power", "attack_power"],
          monster_damage_terms: ["spell_power", "attack_power"],
        },
        // (1 Spell Power + 3 Attack Power + 1) × 50% = 2.5, which rounds to even.
        { monster: { damage: 3, magicDamage: 1 } },
      ),
    ).toMatch(/^2\b/);
  });
});

describe("formatSkillEffect caster notes", () => {
  const heal = {
    skill_type: "target_heal",
    heals_health: { base_value: 250, bonus_per_level: 250 },
    notes: { heals_health: "0.4% more per WIS" },
  };

  it("qualifies the value an attribute scales", () => {
    expect(formatSkillEffect(heal)).toContain("Hit Points (0.4% more per WIS)");
  });

  it("drops the reader's attribute notes from a monster's cast", () => {
    expect(
      formatSkillEffect(heal, { monster: { damage: 0, magicDamage: 0 } }),
    ).not.toContain("WIS");
  });

  it("merges resists only when their amounts and notes match", () => {
    const resist = { base_value: 10, bonus_per_level: 0 };
    const summary = formatSkillEffect({
      skill_type: "area_buff",
      poison_resist_bonus: resist,
      disease_resist_bonus: resist,
      fire_resist_bonus: resist,
      notes: {
        poison_resist_bonus: "+0.15 per WIS",
        disease_resist_bonus: "+0.15 per WIS",
      },
    });
    expect(summary.match(/\+0.15 per WIS/g)).toHaveLength(1);
    expect(summary).toContain("+10 Fire Resist");
  });
});

describe("formatSkillEffect Bard summaries", () => {
  it.each(["detect_traps", "sharp_senses"])(
    "describes %s without a redundant class label",
    (id) => {
      expect(formatSkillEffect({ id, skill_type: "passive" })).not.toContain(
        "Bard",
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
    });
    expect(summary.indexOf("3+ active songs")).toBeLessThan(
      summary.indexOf("Attack Power"),
    );
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
      }),
    ).toContain("max 70%");
  });

  it("drops the debuff type tag from a charm", () => {
    expect(
      formatSkillEffect({
        skill_type: "area_debuff",
        is_bard_charm: true,
        is_magic_debuff: true,
        charmed_damage_percent: { base_value: 0.45, bonus_per_level: 0 },
      }),
    ).not.toContain("magic debuff");
  });

  it("gives Final Cadence's damage and healing one note", () => {
    const summary = formatSkillEffect({
      skill_type: "area_damage",
      damage_type: "Magic",
      is_bard_final_cadence: true,
      damage: { base_value: 3000, bonus_per_level: 0 },
      heals_health: { base_value: 3000, bonus_per_level: 0 },
      notes: { damage: "song note" },
    });
    expect(summary.match(/song note/g)).toHaveLength(1);
    expect(summary.indexOf("Hit Points")).toBeLessThan(
      summary.indexOf("song note"),
    );
  });
});

describe("formatSkillEffect enrage passives", () => {
  const enrageSkill = { skill_type: "passive", is_enrage: true };

  it("describes the passive enrage threshold the same way with a monster context", () => {
    expect(
      formatSkillEffect(enrageSkill, {
        monster: { damage: 0, magicDamage: 0 },
      }),
    ).toBe(formatSkillEffect(enrageSkill));
  });
});

describe("formatSkillEffect area heals", () => {
  it.each([
    ["player", "every player"],
    ["pet", "not players"],
    ["monster", "every monster"],
  ] as const)("names who a %s's area heal reaches", (caster, recipients) => {
    expect(
      formatSkillEffect({
        skill_type: "area_heal",
        cast_range: 10,
        area_heal_caster: caster,
        heals_health: { base_value: 100, bonus_per_level: 0 },
      }),
    ).toContain(recipients);
  });

  it("balances health without healing it", () => {
    expect(
      formatSkillEffect({
        skill_type: "area_heal",
        cast_range: 10,
        area_heal_caster: "player",
        is_balance_health: true,
        heals_health: { base_value: 999, bonus_per_level: 0 },
      }),
    ).not.toContain("999");
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
    });
    expect(summary).not.toContain("999");
    expect(summary).toContain("0.1%");
  });

  it("does not append a duration to a permanent form", () => {
    const summary = formatSkillEffect({
      skill_type: "target_buff",
      is_necromancer_reaper_form: true,
      is_permanent: true,
      duration_base: 10,
      health_percent_per_second_bonus: {
        base_value: -0.05,
        bonus_per_level: 0,
      },
    });
    expect(summary).not.toContain("10s");
  });

  it("identifies combat-pet buffs separately from self-cast pet sharing", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_buff",
        is_necromancer_pet_buff: true,
        is_pet_skill: true,
        cast_range: 12,
        haste_bonus: { base_value: 0.05, bonus_per_level: 0.05 },
      }),
    ).toContain("buffs your companion within 12 yd");
    const sharing = {
      skill_type: "target_buff",
      also_buff_active_pet: true,
      cast_range: 12,
      ward_bonus: { base_value: 50, bonus_per_level: 50 },
    };
    expect(formatSkillEffect(sharing)).not.toContain("self-cast");
    expect(formatSkillEffect({ ...sharing, can_buff_others: true })).toContain(
      "when self-cast",
    );
  });

  it("lets a self-only pet buff reach a familiar at any distance", () => {
    const summary = formatSkillEffect({
      skill_type: "target_buff",
      is_pet_skill: true,
      can_buff_self: true,
      cast_range: 0,
      haste_bonus: { base_value: 0.05, bonus_per_level: 0 },
    });
    expect(summary).toContain("familiar");
    expect(summary).not.toContain("yd");
  });

  it("assigns an owner's pet passive max-health bonus to the companion", () => {
    const skill = {
      skill_type: "passive",
      is_pet_skill: true,
      health_max_percent_bonus: { base_value: 0.02, bonus_per_level: 0.02 },
    };
    expect(formatSkillEffect(skill)).toContain("companion");
    expect(formatSkillEffect({ ...skill, is_pet_skill: false })).not.toContain(
      "companion",
    );
  });
});

describe("formatSkillEffect damage shields", () => {
  it("puts a debuff's shield on the caster's target", () => {
    expect(
      formatSkillEffect({
        skill_type: "target_debuff",
        damage_shield_type: "Fire",
        damage_shield: { base_value: 120, bonus_per_level: 0 },
      }),
    ).toContain("Damage Shield on its target");
  });
});
