import { describe, expect, it } from "vitest";
import type { EvalCtx } from "$lib/types/formula";
import { evaluate, FORMULA_EXPRS, renderFormula } from "./formula-eval";

const ctx: EvalCtx = {
  str: 11,
  dex: 1,
  int_: 3,
  otherPhys: 7,
  otherMagic: 5,
  weapons: {
    main: { strength: 2, damage: 9, dexterity: 0, magic_damage: 0 },
    off: { strength: 3, damage: 7, dexterity: 0, magic_damage: 0 },
    bow: { strength: 4, damage: 13, dexterity: 2, magic_damage: 0 },
    melee: { strength: 5, damage: 17, dexterity: 0, magic_damage: 0 },
    wand: { strength: 1, damage: 23, dexterity: 0, magic_damage: 19 },
  },
};

describe("server damage formula families", () => {
  // Source: server-scripts/TargetDamageSkill.cs:203-226 and Combat.cs:117-145.
  it("subtracts the Ranger bow and halves the Rogue player's off-hand damage", () => {
    expect(evaluate(FORMULA_EXPRS.normal, ctx)).toBe(29);
    expect(evaluate(FORMULA_EXPRS.ranger_melee, ctx)).toBe(33);
    expect(evaluate(FORMULA_EXPRS.rogue_melee, ctx)).toBe(35);
    expect(evaluate(FORMULA_EXPRS.rogue_melee_merc, ctx)).toBe(39);
  });

  // Source: server-scripts/TargetProjectileSkill.cs:189-200 and FrontalProjectilesSkill.cs:97-100.
  // Source: server-scripts/Dexterity.cs:GetRangedAttackBonusPerPoint.
  it("rounds the combined ranged Dexterity bonus and applies each weapon rule", () => {
    expect(evaluate(FORMULA_EXPRS.ranged_player, ctx)).toBe(44);
    expect(evaluate(FORMULA_EXPRS.ranged_player_frontal, ctx)).toBe(50);
    expect(evaluate(FORMULA_EXPRS.ranged_merc, ctx)).toBe(61);
  });

  // Source: server-scripts/TargetDamageSkill.cs:183-199 and Dexterity.cs:GetPoisonDamageBonusPerPoint.
  it("floors player off-hand damage and rounds poison Dexterity", () => {
    expect(evaluate(FORMULA_EXPRS.poison_rogue, ctx)).toBe(37);
  });

  // Source: server-scripts/Intelligence.cs:GetMagicDamageBonus and TargetDamageSkill.cs:214-226.
  it("rounds Intelligence before adding physical and magic weapon components", () => {
    expect(evaluate(FORMULA_EXPRS.magic_spell, ctx)).toBe(28);
    expect(evaluate(FORMULA_EXPRS.magic_weapon, ctx)).toBe(57);
    expect(evaluate(FORMULA_EXPRS.magic_weapon_ranger, ctx)).toBe(61);
  });

  // Source: server-scripts/Dexterity.cs:GetRangedAttackBonusPerPoint, GetPoisonDamageBonusPerPoint.
  // Source: server-scripts/Intelligence.cs:GetMagicDamageBonus — Mathf.RoundToInt uses even ties.
  it("rounds half-integer attribute damage to the nearest even integer", () => {
    const lowStats = {
      ...ctx,
      int_: 1,
      dex: 1,
      weapons: { ...ctx.weapons, bow: { ...ctx.weapons.bow!, dexterity: 0 } },
    };
    expect(evaluate(FORMULA_EXPRS.magic_spell, lowStats)).toBe(26);
    expect(evaluate(FORMULA_EXPRS.ranged_player, lowStats)).toBe(42);
    expect(evaluate(FORMULA_EXPRS.poison_rogue, lowStats)).toBe(37);
    expect(
      evaluate(
        {
          type: "round_mul",
          factor: 1.5,
          operand: { type: "const", value: -1 },
        },
        ctx,
      ),
    ).toBe(-2);
    expect(
      evaluate(
        {
          type: "round_mul",
          factor: 1.5,
          operand: { type: "const", value: -3 },
        },
        ctx,
      ),
    ).toBe(-4);
    expect(renderFormula(FORMULA_EXPRS.magic_spell)).toContain(
      "round(INT × 1.5)",
    );
  });

  it("does not produce weapon damage without the required weapon", () => {
    expect(
      evaluate(FORMULA_EXPRS.ranged_player, {
        ...ctx,
        weapons: { main: ctx.weapons.main },
      }),
    ).toBeNull();
    expect(evaluate(FORMULA_EXPRS.bard_final_cadence, ctx)).toBeNull();
    expect(evaluate(FORMULA_EXPRS.manaburn, ctx)).toBeNull();
    expect(evaluate(FORMULA_EXPRS.monster_melee, ctx)).toBeNull();
    expect(evaluate(FORMULA_EXPRS.monster_magic, ctx)).toBeNull();
  });
});
