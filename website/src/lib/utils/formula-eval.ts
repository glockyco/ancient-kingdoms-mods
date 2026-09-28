// formula-eval.ts
// Single source of truth for every damage formula in the game:
//   1. FORMULA_EXPRS — the expression tree registry
//   2. evaluate()   — numeric interpreter (for the DPS simulator)
//   3. renderFormula()        — compact formula string (for labels)
//   4. renderFormulaDisplay() — structured breakdown (for skill detail pages)
//
// Adding a new DamageFormulaKind:
//   • Add one entry to FORMULA_EXPRS  →  TypeScript enforces exhaustiveness via `satisfies`
//   • Add one case to renderFormulaDisplay for the structured breakdown
//   • evaluate() and renderFormula() require no changes unless you add a new Expr node type

import type {
  Expr,
  StatExpr,
  SlotStatExpr,
  OtherExpr,
  AddExpr,
  MulExpr,
  RoundMulExpr,
  FloorMulExpr,
  RequireSlotExpr,
  SpecialExpr,
  EvalCtx,
  FormulaDisplay,
} from "$lib/types/formula";
import type { DamageFormulaKind, WeaponSlotName } from "$lib/types/skills";

// ─── Builder DSL ──────────────────────────────────────────────────────────────
// Small constructors so formula definitions read naturally.

const s = (stat: "str" | "dex" | "int"): StatExpr => ({ type: "stat", stat });
const w = (
  slot: WeaponSlotName,
  field: "strength" | "damage" | "dexterity" | "magic_damage",
): SlotStatExpr => ({ type: "slot_stat", slot, field });
const other = (category: "phys" | "magic"): OtherExpr => ({
  type: "other",
  category,
});
const add = (operands: Expr[]): AddExpr => ({ type: "add", operands });
const mul = (factor: number, operand: Expr): MulExpr => ({
  type: "mul",
  factor,
  operand,
});
const rmul = (factor: number, operand: Expr): RoundMulExpr => ({
  type: "round_mul",
  factor,
  operand,
});
const fmul = (factor: number, operand: Expr): FloorMulExpr => ({
  type: "floor_mul",
  factor,
  operand,
});
const req = (slot: WeaponSlotName, then: Expr): RequireSlotExpr => ({
  type: "require_slot",
  slot,
  then,
});
const special = (description: string): SpecialExpr => ({
  type: "special",
  description,
});

// ─── Formula registry ─────────────────────────────────────────────────────────
// One entry per DamageFormulaKind.  `satisfies` makes TypeScript error here if
// a kind is missing or the value is not a valid Expr — adding a new kind to the
// union is therefore automatically caught at compile time.
//
// Source citations: server-scripts/TargetDamageSkill.cs, TargetProjectileSkill.cs,
//                   FrontalProjectilesSkill.cs, FrontalDamageSkill.cs

export const FORMULA_EXPRS = {
  // ── Physical ────────────────────────────────────────────────────────────────

  // Warrior melee_attack, caster staff_strike, any "normal" physical skill.
  // Caller maps wand → "main" slot for staff modes.
  normal: req(
    "main",
    add([
      mul(1.0, add([s("str"), w("main", "strength")])),
      w("main", "damage"),
      other("phys"),
    ]),
  ),

  // Ranger swift_slash: bow.STR contributes to the multiplier; bow.dmg is
  // subtracted server-side (slot 13 bonus) so it is not in the formula.
  // Source: TargetDamageSkill.cs:218-221
  ranger_melee: req(
    "main",
    add([
      mul(1.0, add([s("str"), w("main", "strength"), w("bow", "strength")])),
      w("main", "damage"),
      other("phys"),
    ]),
  ),

  // Rogue player stab: off-hand at ⌊dmg×0.5⌋, full STR from both hands.
  // Source: TargetDamageSkill.cs:223-226 — `caster is Player { className: "Rogue" }`
  rogue_melee: req(
    "main",
    add([
      mul(1.0, add([s("str"), w("main", "strength"), w("off", "strength")])),
      w("main", "damage"),
      fmul(0.5, w("off", "damage")),
      other("phys"),
    ]),
  ),

  // Rogue merc pierce: BOTH daggers at full damage — the Player-only 0.5× guard
  // does not fire for Pet/merc casters.
  // Source: TargetDamageSkill.cs:223-226 guard is `caster is Player { className: "Rogue" }`
  rogue_melee_merc: req(
    "main",
    add([
      mul(1.0, add([s("str"), w("main", "strength"), w("off", "strength")])),
      w("main", "damage"),
      w("off", "damage"),
      other("phys"),
    ]),
  ),

  // ── Ranged ──────────────────────────────────────────────────────────────────

  // Ranger archer_shot: melee slot's STR contributes but its damage is subtracted
  // server-side; the formula includes only the STR part.
  // Source: TargetProjectileSkill.cs:195-200
  ranged_player: req(
    "bow",
    add([
      mul(1.0, add([s("str"), w("melee", "strength"), w("bow", "strength")])),
      w("bow", "damage"),
      // Source: server-scripts/Dexterity.cs:GetRangedAttackBonusPerPoint — round DEX × 1.5 to an even integer on ties.
      rmul(1.5, add([s("dex"), w("bow", "dexterity")])),
      other("phys"),
    ]),
  ),

  // Ranger frontal projectiles (e.g. forest_guardians_aid): all equipment
  // contributes, no subtraction, DEX×1.5 on top.
  // Source: FrontalProjectilesSkill.cs:97-100
  ranged_player_frontal: req(
    "bow",
    add([
      mul(1.0, add([s("str"), w("main", "strength"), w("bow", "strength")])),
      w("main", "damage"),
      w("bow", "damage"),
      // Source: server-scripts/Dexterity.cs:GetRangedAttackBonusPerPoint — round the combined DEX bonus.
      rmul(1.5, add([s("dex"), w("bow", "dexterity")])),
      other("phys"),
    ]),
  ),

  // Ranger merc explorer_shot: both weapons contribute fully, no subtraction.
  // Source: TargetProjectileSkill.cs — Pet path, no slot subtraction
  ranged_merc: req(
    "bow",
    add([
      mul(1.0, add([s("str"), w("bow", "strength"), w("melee", "strength")])),
      w("bow", "damage"),
      w("melee", "damage"),
      // Source: server-scripts/Dexterity.cs:GetRangedAttackBonusPerPoint — mercenary DEX uses the same method.
      rmul(1.5, add([s("dex"), w("bow", "dexterity")])),
      other("phys"),
    ]),
  ),

  // ── Poison ──────────────────────────────────────────────────────────────────

  // Rogue poison skills: rogue_melee phys component + DEX×2.5 (player DEX only).
  // Source: Dexterity.cs — poisonDamageBonusPerPoint = 2.5
  poison_rogue: req(
    "main",
    add([
      mul(1.0, add([s("str"), w("main", "strength"), w("off", "strength")])),
      w("main", "damage"),
      fmul(0.5, w("off", "damage")),
      // Source: server-scripts/Dexterity.cs:GetPoisonDamageBonusPerPoint — round DEX × 2.5 to an even integer on ties.
      rmul(2.5, s("dex")),
      other("phys"),
    ]),
  ),

  // ── Magic ────────────────────────────────────────────────────────────────────

  // Pure spell damage: INT×1.5 + wand magic stat + other magic equipment.
  // Source: server-scripts/Intelligence.cs:GetMagicDamageBonus — rounded INT × 1.5.
  magic_spell: req(
    "wand",
    add([rmul(1.5, s("int")), w("wand", "magic_damage"), other("magic")]),
  ),

  // Magic + weapon (e.g. holy_wrath): magic and physical components additive.
  // Both resist paths apply separately server-side.
  magic_weapon: req(
    "wand",
    add([
      // magic component
      // Source: server-scripts/Intelligence.cs:GetMagicDamageBonus — round INT × 1.5 to an even integer on ties.
      rmul(1.5, s("int")),
      w("wand", "magic_damage"),
      other("magic"),
      // physical component
      mul(1.0, add([s("str"), w("main", "strength")])),
      w("main", "damage"),
      other("phys"),
    ]),
  ),

  // Generic Ranger magic-weapon formula: melee weapon + bow.STR contribution;
  // bow.dmg is excluded (same reduction as ranger_melee). Wild Strike uses a
  // skill-specific buffed-hit override instead of this reusable breakdown.
  // Source: TargetDamageSkill.cs:214-221
  magic_weapon_ranger: req(
    "main",
    add([
      // magic component
      // Source: server-scripts/Intelligence.cs:GetMagicDamageBonus — round before combining magic and physical damage.
      rmul(1.5, s("int")),
      w("wand", "magic_damage"),
      other("magic"),
      // physical component
      mul(1.0, add([s("str"), w("main", "strength"), w("bow", "strength")])),
      w("main", "damage"),
      other("phys"),
    ]),
  ),

  // ── Special ──────────────────────────────────────────────────────────────────

  // Source: BardFinalCadenceSkill.cs:45-54 and Charisma.cs:21-36.
  bard_final_cadence: special(
    "round(skill damage at this level × (1 + min(max(CHA, 0) × 0.001, 2)))",
  ),
  // Source: server-scripts/TargetDamageSkill.cs:127-155, TargetProjectileSkill.cs:211-220 — Rageblow uses Rage ×2; Mana Burn uses Mana ×3.
  manaburn: special(
    "Current Rage × 2 (Rageblow) or current Mana × 3 (Mana Burn) — ignores armor and resistance",
  ),
  monster_melee: special("monster's base physical damage at this level"),
  monster_magic: special("monster's base magic damage at this level"),
} satisfies Record<DamageFormulaKind, Expr>;

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Numerically evaluate an expression tree given a context.
 * Returns null when a required slot is absent (formula cannot be computed).
 */
export function evaluate(expr: Expr, ctx: EvalCtx): number | null {
  switch (expr.type) {
    case "stat":
      return expr.stat === "str"
        ? ctx.str
        : expr.stat === "dex"
          ? ctx.dex
          : ctx.int_;
    case "slot_stat":
      return ctx.weapons[expr.slot]?.[expr.field] ?? 0;
    case "other":
      return expr.category === "phys" ? ctx.otherPhys : ctx.otherMagic;
    case "const":
      return expr.value;
    case "add": {
      let sum = 0;
      for (const op of expr.operands) {
        const v = evaluate(op, ctx);
        if (v === null) return null;
        sum += v;
      }
      return sum;
    }
    case "mul": {
      const v = evaluate(expr.operand, ctx);
      return v === null ? null : v * expr.factor;
    }
    case "round_mul": {
      const v = evaluate(expr.operand, ctx);
      if (v === null) return null;
      const product = v * expr.factor;
      const lower = Math.floor(product);
      return product - lower === 0.5
        ? lower + (lower % 2 === 0 ? 0 : 1)
        : Math.round(product);
    }
    case "floor_mul": {
      const v = evaluate(expr.operand, ctx);
      return v === null ? null : Math.floor(v * expr.factor);
    }
    case "require_slot":
      return ctx.weapons[expr.slot] ? evaluate(expr.then, ctx) : null;
    case "special":
      // Not computable from slot stats — caller must handle null gracefully.
      return null;
  }
}

// ─── Formula renderer ─────────────────────────────────────────────────────────

// Notation used in rendered formula strings:
//   Player stats:   STR  DEX  INT
//   Weapon flat:    main.dmg  off.dmg  bow.dmg  melee.dmg  wand.magic
//   Other equip:    equip.dmg   equip.magic
//
// Weapon strength and dexterity bonuses are not listed separately. They add to
// the same multiplier as the player's STR/DEX attribute, and players see them as
// part of their total stat value. Only flat damage stats (weapon.dmg) are named,
// because they appear as a distinct additive term.
// Weapon damage uses slot names such as "main-hand weapon damage".
// Other equipment damage is a separate term.
// Weapon Strength and Dexterity bonuses are part of the player's total
// displayed stat and do not appear again as weapon terms.

const FIELD_SHORT: Record<string, string> = {
  strength: "Strength", // not used in rendered output (collapsed into player stat)
  damage: "damage",
  dexterity: "Dexterity", // not used in rendered output (collapsed into player stat)
  magic_damage: "magic damage",
};

const SLOT_LABELS: Record<WeaponSlotName, string> = {
  main: "main-hand weapon",
  off: "off-hand weapon",
  bow: "bow",
  melee: "melee weapon",
  wand: "casting weapon",
};

function fmtFactor(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : String(n);
}

/**
 * Render an expression tree as a compact human-readable formula string.
 *
 * Weapon Strength and Dexterity are included in the player's displayed STR
 * and DEX. Only flat weapon damage remains a separate term.
 */
export function renderFormula(expr: Expr): string {
  switch (expr.type) {
    case "stat":
      return expr.stat === "int" ? "INT" : expr.stat.toUpperCase();
    case "slot_stat":
      // Strength and dexterity on weapons scale with the same multiplier as the
      // player's STR/DEX attribute; collapse them to empty so they merge cleanly.
      if (expr.field === "strength" || expr.field === "dexterity") return "";
      return `${SLOT_LABELS[expr.slot]} ${FIELD_SHORT[expr.field]}`;
    case "other":
      return expr.category === "phys"
        ? "other equipment damage"
        : "other equipment magic damage";
    case "const":
      return String(expr.value);
    case "add": {
      // Put stat terms before flat weapon and other-equipment damage.
      const statTerms = expr.operands.filter(
        (op) => op.type === "mul" || op.type === "round_mul",
      );
      const flatTerms = expr.operands.filter(
        (op) => op.type !== "mul" && op.type !== "round_mul",
      );
      const parts = [...statTerms, ...flatTerms]
        .map(renderFormula)
        .filter(Boolean);
      return parts.join(" + ");
    }
    case "mul": {
      const inner = renderFormula(expr.operand);
      if (!inner) return ""; // fully-collapsed node (shouldn't occur in practice)
      // Use content-based paren check: add parentheses only when the inner
      // expression is a sum — i.e. contains " + " after collapsing empties.
      const needsParens = inner.includes(" + ");
      return `${needsParens ? `(${inner})` : inner} × ${fmtFactor(expr.factor)}`;
    }
    case "round_mul": {
      const inner = renderFormula(expr.operand);
      if (!inner) return "";
      const product = `${inner.includes(" + ") ? `(${inner})` : inner} × ${fmtFactor(expr.factor)}`;
      return `round(${product})`;
    }
    case "floor_mul": {
      const inner = renderFormula(expr.operand);
      return inner ? `⌊${inner} × ${fmtFactor(expr.factor)}⌋` : "";
    }
    case "require_slot":
      // Slot presence is implied by context; render the body as-is.
      return renderFormula(expr.then);
    case "special":
      return expr.description;
  }
}

// ─── Structured display builder ───────────────────────────────────────────────

const PIPELINE_SUFFIX = " × (1 + passive damage bonus + buff damage bonus)";

/**
 * Build the structured breakdown shown on skill detail pages.
 *
 * Physical formulas → one "Attack Damage" row.
 * Magic formulas    → one "Magic Damage" row.
 * Dual formulas     → separate rows for each damage type (different resist paths server-side).
 * Special formulas  → a prose note instead of a table.
 */
export function renderFormulaDisplay(
  kind: DamageFormulaKind,
  skillType: string,
): FormulaDisplay {
  const expr = FORMULA_EXPRS[kind];

  switch (kind) {
    // ── Special prose ────────────────────────────────────────────────────────

    case "bard_final_cadence":
      return {
        preMitigation: "Charisma-scaled Skill Damage",
        terms: [],
        specialNote: renderFormula(expr),
      };

    // Source: server-scripts/TargetDamageSkill.cs:127-155, TargetProjectileSkill.cs:211-220 — resource and multiplier depend on the skill.
    case "manaburn":
      return {
        preMitigation: null,
        terms: [],
        specialNote:
          skillType === "target_projectile"
            ? "Mana Burn consumes all the Wizard's Mana and deals three times that amount as damage. Armor and resistance do not reduce this damage."
            : "Rageblow consumes all the Warrior's or Rogue's Rage and deals twice that amount as damage. Armor and resistance do not reduce this damage.",
      };

    // ── Monster / NPC (level-scaled) ─────────────────────────────────────────

    case "monster_melee":
    case "monster_magic": {
      const isMagic = kind === "monster_magic";
      return {
        preMitigation: `Skill Damage + ${isMagic ? "Magic Damage" : "Attack Damage"}`,
        terms: [
          {
            label: isMagic ? "Magic Damage" : "Attack Damage",
            // monsters have no stats/equipment so the raw level-scaled value is all there is
            formula: `${renderFormula(expr)}${PIPELINE_SUFFIX}`,
          },
        ],
      };
    }

    // ── Pure magic ───────────────────────────────────────────────────────────

    case "magic_spell":
      return {
        preMitigation: "Skill Damage + Magic Damage",
        terms: [
          {
            label: "Magic Damage",
            formula: `(${renderFormula(expr)})${PIPELINE_SUFFIX}`,
          },
        ],
      };

    // ── Dual damage: magic + physical ────────────────────────────────────────
    // These formulas contain both a magic component and a physical component.
    // The server applies separate mitigation to each, so we split them for display.

    case "magic_weapon": {
      // Magic component: INT × 1.5 + casting weapon magic damage + other equipment magic damage.
      const magicStr = renderFormula(
        add([rmul(1.5, s("int")), w("wand", "magic_damage"), other("magic")]),
      );
      // Physical component: STR × 1 + main-hand weapon damage + other equipment damage.
      const physStr = renderFormula(
        add([
          mul(1.0, add([s("str"), w("main", "strength")])),
          w("main", "damage"),
          other("phys"),
        ]),
      );
      return {
        preMitigation: "Skill Damage + Magic Damage + Attack Damage",
        terms: [
          { label: "Magic Damage", formula: `(${magicStr})${PIPELINE_SUFFIX}` },
          { label: "Attack Damage", formula: `(${physStr})${PIPELINE_SUFFIX}` },
        ],
      };
    }

    case "magic_weapon_ranger": {
      // Generic Ranger magic-weapon skills: magic component is same as
      // magic_spell; physical component is ranger_melee-style (bow.STR
      // contributes, bow.dmg excluded). Wild Strike is rendered through its
      // skill-specific override and does not use this dual-component display.
      const magicStr = renderFormula(
        add([rmul(1.5, s("int")), w("wand", "magic_damage"), other("magic")]),
      );
      const physStr = renderFormula(
        add([
          mul(
            1.0,
            add([s("str"), w("main", "strength"), w("bow", "strength")]),
          ),
          w("main", "damage"),
          other("phys"),
        ]),
      );
      return {
        preMitigation: "Skill Damage + Magic Damage + Attack Damage",
        terms: [
          { label: "Magic Damage", formula: `(${magicStr})${PIPELINE_SUFFIX}` },
          {
            label: "Attack Damage",
            formula: `(${physStr})${PIPELINE_SUFFIX}`,
          },
        ],
      };
    }

    // ── All physical formulas ─────────────────────────────────────────────────
    // ranged and poison formulas include DEX inside the formula string itself.

    default:
      return {
        preMitigation: "Skill Damage + Attack Damage",
        terms: [
          {
            label: "Attack Damage",
            formula: `(${renderFormula(expr)})${PIPELINE_SUFFIX}`,
          },
        ],
      };
  }
}

/**
 * Wild Strike has a skill-specific runtime override rather than the reusable
 * Ranger magic-weapon component breakdown. DamageSkill applies this override
 * after the underlying sword/bow hit is combined, before Combat.DealDamageAt
 * performs the common hit pipeline.
 *
 * Source: server-scripts/DamageSkill.cs:49-67 (TryConsumeWildStrike),
 * TargetDamageSkill.cs:239,282, TargetProjectileSkill.cs:221-222,252-256,
 * Combat.cs:368,774,840-847,944-955 (DealDamageAt).
 */
export function renderWildStrikeFormulaDisplay(): FormulaDisplay {
  return {
    preMitigation: null,
    terms: [],
    specialNote:
      "Wild Strike empowers the Ranger's next sword or bow auto attack. Add Wild Strike's damage to the auto attack and multiply the total by (1 + 0.1 × Wild Strike's level), rounding the result. The whole hit deals magic damage: each 100 Magic Resist reduces it by 5% and adds 5 percentage points to the target's chance to resist.",
  };
}
