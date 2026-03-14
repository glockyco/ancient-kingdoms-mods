// formula-eval.ts
// Single source of truth for every damage formula in the game:
//   1. FORMULA_EXPRS — the expression tree registry
//   2. evaluate()   — numeric interpreter (for the DPS simulator)
//   3. renderFormula()        — compact formula string (for labels, FORMULA_TABLE)
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
      mul(1.5, add([s("dex"), w("bow", "dexterity")])),
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
      mul(1.5, add([s("dex"), w("bow", "dexterity")])),
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
      mul(1.5, add([s("dex"), w("bow", "dexterity")])),
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
      mul(2.5, s("dex")),
      other("phys"),
    ]),
  ),

  // ── Magic ────────────────────────────────────────────────────────────────────

  // Pure spell damage: INT×1.5 + wand magic stat + other magic equipment.
  // Source: Intelligence.cs — magicDamageBonusPerPoint = 1.5
  magic_spell: req(
    "wand",
    add([mul(1.5, s("int")), w("wand", "magic_damage"), other("magic")]),
  ),

  // Magic + weapon (e.g. holy_wrath): magic and physical components additive.
  // Both resist paths apply separately server-side.
  magic_weapon: req(
    "wand",
    add([
      // magic component
      mul(1.5, s("int")),
      w("wand", "magic_damage"),
      other("magic"),
      // physical component
      mul(1.0, add([s("str"), w("main", "strength")])),
      w("main", "damage"),
      other("phys"),
    ]),
  ),

  // Magic + weapon for Ranger: uses melee weapon + bow.STR contribution;
  // bow.dmg is excluded (same reduction as ranger_melee).
  // Source: TargetDamageSkill.cs:214-221
  magic_weapon_ranger: req(
    "main",
    add([
      // magic component
      mul(1.5, s("int")),
      w("wand", "magic_damage"),
      other("magic"),
      // physical component
      mul(1.0, add([s("str"), w("main", "strength"), w("bow", "strength")])),
      w("main", "damage"),
      other("phys"),
    ]),
  ),

  // ── Special ──────────────────────────────────────────────────────────────────

  manaburn: special("Current Rage or Mana × 2 — bypasses mitigation"),
  scroll: special("Player Level × 15"),
  monster_melee: special("baseDamage(level)"),
  monster_magic: special("baseMagicDamage(level)"),
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

// Notation used in rendered strings:
//   Player stats:  STR  DEX  INT
// Notation used in rendered formula strings:
//   Player stats:   STR  DEX  INT
//   Weapon flat:    main.dmg  off.dmg  bow.dmg  melee.dmg  wand.magic
// Notation used in rendered formula strings:
//   Player stats:   STR  DEX  INT
//   Weapon flat:    main.dmg  off.dmg  bow.dmg  melee.dmg  wand.magic
//   Other equip:    equip.dmg   equip.magic
//
// Weapon strength and dexterity bonuses are NOT listed separately — they contribute
// to the same multiplier as the player's STR/DEX attribute and players see them as
// part of their total stat value. Only flat damage stats (weapon.dmg) are named
// explicitly because they appear as a distinct additive term.

const FIELD_SHORT: Record<string, string> = {
  strength: "STR", // not used in rendered output (collapsed into player stat)
  damage: "dmg",
  dexterity: "DEX", // not used in rendered output (collapsed into player stat)
  magic_damage: "magic",
};

function fmtFactor(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : String(n);
}

/**
 * Render an expression tree as a compact human-readable formula string.
 *
 * Weapon strength/dexterity bonuses are collapsed into the adjacent player stat term:
 * (STR + main.STR + bow.STR) × 1 → STR × 1, because players see a single STR value
 * in-game that already includes all weapon strength contributions.
 *
 * Only weapon flat damage stats (main.dmg, off.dmg, etc.) remain explicit, since
 * those are a genuinely separate additive term from the stat multiplier.
 */
export function renderFormula(expr: Expr): string {
  switch (expr.type) {
    case "stat":
      return expr.stat === "int" ? "INT" : expr.stat.toUpperCase();
    case "slot_stat":
      // Strength and dexterity on weapons scale with the same multiplier as the
      // player's STR/DEX attribute; collapse them to empty so they merge cleanly.
      if (expr.field === "strength" || expr.field === "dexterity") return "";
      return `${expr.slot}.${FIELD_SHORT[expr.field]}`;
    case "other":
      return expr.category === "phys" ? "equip.dmg" : "equip.magic";
    case "const":
      return String(expr.value);
    case "add": {
      // Stat-scaler terms (mul nodes: STR × 1, DEX × 1.5, …) first, then flat
      // additive terms (weapon damage, equip.dmg, …). Keeps interleaved formulas
      // like ranged_player readable: STR × 1 + DEX × 1.5 + bow.dmg + equip.dmg.
      const statTerms = expr.operands.filter((op) => op.type === "mul");
      const flatTerms = expr.operands.filter((op) => op.type !== "mul");
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

const PIPELINE_SUFFIX = " × (1 + passive% + buff%)";

/**
 * Build the structured breakdown shown on skill detail pages.
 *
 * Physical formulas → one "Attack Damage" row.
 * Magic formulas    → one "Magic Damage" row.
 * Dual formulas     → separate rows for each damage type (different resist paths server-side).
 * Special formulas  → a prose note instead of a table.
 */
export function renderFormulaDisplay(kind: DamageFormulaKind): FormulaDisplay {
  const expr = FORMULA_EXPRS[kind];

  switch (kind) {
    // ── Special prose ────────────────────────────────────────────────────────

    case "manaburn":
      return {
        preMitigation: null,
        terms: [],
        specialNote:
          "Consumes all Rage (Warrior/Rogue) or all Mana (Wizard) and deals that amount × 2 as damage. " +
          "Completely bypasses armor, resistance, and all other mitigation.",
      };

    case "scroll":
      return {
        preMitigation: null,
        terms: [],
        specialNote: `Damage = ${renderFormula(expr)}. Not affected by equipment, stats, passive bonuses, or mitigation.`,
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
      // magic component: INT×1.5 + wand.magic + other magic
      const magicStr = renderFormula(
        add([mul(1.5, s("int")), w("wand", "magic_damage"), other("magic")]),
      );
      // physical component: (STR + main.STR) × 1 + main.dmg + other phys
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
      // magic component: same as magic_spell
      const magicStr = renderFormula(
        add([mul(1.5, s("int")), w("wand", "magic_damage"), other("magic")]),
      );
      // physical component: ranger_melee style (bow.STR contributes, bow.dmg excluded)
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
