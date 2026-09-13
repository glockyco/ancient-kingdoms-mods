import { describe, expect, test } from "vitest";
import type { SkillDetailView } from "$lib/types/skills";
import { computeMechanicsSpec } from "./skillMechanics";

function bardSkill(overrides: Partial<SkillDetailView>): SkillDetailView {
  return {
    id: "bard_skill",
    player_classes: ["bard"],
    skill_type: "area_buff",
    is_bard_song: true,
    scales_with_charisma: true,
    is_bard_final_cadence: false,
    is_spell: true,
    is_manaburn_skill: false,
    is_melee_debuff: false,
    is_poison_debuff: false,
    is_disease_debuff: false,
    is_mercenary_skill: false,
    is_pet_skill: false,
    is_relic: false,
    followup_default_attack: false,
    ...overrides,
  } as SkillDetailView;
}

describe("Bard mechanics contexts", () => {
  test("uses Charisma for scaled buff songs", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        accuracy_bonus: { base_value: 0.02, bonus_per_level: 0.02 },
      }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([
      {
        casterLabels: ["Bard (player)"],
        bonusAttrSource: "player_cha",
        isAreaBuff: true,
      },
    ]);
  });

  test("does not claim Charisma scaling for song speed", () => {
    const spec = computeMechanicsSpec(
      bardSkill({ speed_bonus: { base_value: 1, bonus_per_level: 0 } }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([]);
  });

  test("does not scale fields that bypass Charisma in Buff", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        mana_max_percent_bonus: { base_value: 0.1, bonus_per_level: 0 },
        heal_on_hit_percent: { base_value: 0.1, bonus_per_level: 0 },
        damage_shield: { base_value: 10, bonus_per_level: 0 },
      }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([]);
  });

  test("detects percentage-only debuff song scaling", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        skill_type: "area_debuff",
        damage_percent_bonus: { base_value: -0.02, bonus_per_level: -0.02 },
      }),
      [],
      false,
    );

    expect(spec.debuffContexts).toEqual([
      { casterLabels: ["Bard (player)"], bonusAttrKind: "cha" },
    ]);
  });

  test("uses the custom Final Cadence damage formula", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        id: "final_cadence",
        skill_type: "area_damage",
        is_bard_song: false,
        scales_with_charisma: false,
        is_bard_final_cadence: true,
        damage_type: "Magic",
        damage: { base_value: 3000, bonus_per_level: 0 },
      }),
      [],
      false,
    );

    expect(spec.damageContexts).toEqual([
      { casterLabels: ["Bard (player)"], formula: "bard_final_cadence" },
    ]);
  });
});
