import type { WeaponSlotName } from "$lib/types/skills";

// ─── Leaf nodes ───────────────────────────────────────────────────────────────

/** Player base stat (before equipment/buff bonuses). */
export type StatExpr = { type: "stat"; stat: "str" | "dex" | "int" };

/** A specific stat field from a weapon slot. Fields not present on a slot return 0. */
export type SlotStatExpr = {
  type: "slot_stat";
  slot: WeaponSlotName;
  field: "strength" | "damage" | "dexterity" | "magic_damage";
};

/**
 * Catch-all equipment bonus not modelled as a weapon slot (armor, rings, etc.).
 * category separates physical vs. magic resist pools.
 */
export type OtherExpr = { type: "other"; category: "phys" | "magic" };

/** Literal constant. */
export type ConstExpr = { type: "const"; value: number };

// ─── Composite nodes ──────────────────────────────────────────────────────────

/** Sum of two or more operands. */
export type AddExpr = { type: "add"; operands: Expr[] };

/** Scaled product: operand × factor. */
export type MulExpr = { type: "mul"; factor: number; operand: Expr };

/**
 * Floor-product: ⌊operand × factor⌋ (Mathf.FloorToInt in server code).
 * Used for the rogue player off-hand 0.5× penalty.
 */
export type FloorMulExpr = { type: "floor_mul"; factor: number; operand: Expr };

/**
 * Null-gate: evaluates to null when the required slot is absent.
 * Marks which slot is PRIMARY — the whole formula fails without it
 * (e.g. no result without a bow equipped for archer_shot).
 */
export type RequireSlotExpr = {
  type: "require_slot";
  slot: WeaponSlotName;
  then: Expr;
};

/**
 * Formula that cannot be expressed as slot/stat arithmetic.
 * evaluate() always returns null; description is rendered as-is.
 */
export type SpecialExpr = { type: "special"; description: string };

export type Expr =
  | StatExpr
  | SlotStatExpr
  | OtherExpr
  | ConstExpr
  | AddExpr
  | MulExpr
  | FloorMulExpr
  | RequireSlotExpr
  | SpecialExpr;

// ─── Evaluation context ───────────────────────────────────────────────────────

/**
 * Minimal weapon stats needed by the evaluator.
 * WeaponItem (combat-sim.ts) satisfies this interface.
 */
export interface WeaponStats {
  strength: number;
  damage: number;
  dexterity: number;
  magic_damage: number;
}

export type WeaponSlotMap = Partial<Record<WeaponSlotName, WeaponStats>>;

export interface EvalCtx {
  weapons: WeaponSlotMap;
  str: number;
  dex: number;
  int_: number;
  otherPhys: number;
  otherMagic: number;
}

// ─── Display output ───────────────────────────────────────────────────────────

/** A single labelled component row in the formula breakdown. */
export interface FormulaTerm {
  label: string;
  /** Rendered formula string for this damage component. */
  formula: string;
}

/**
 * Structured display data derived from an Expr tree.
 * Consumed by FormulaDisplay.svelte — no formula-kind knowledge needed there.
 */
export interface FormulaDisplay {
  /** Short composition summary, e.g. "Skill Damage + Attack Damage". Null for special-only formulas. */
  preMitigation: string | null;
  /** Per-component breakdown rows. */
  terms: FormulaTerm[];
  /**
   * For formulas where prose beats a table (manaburn, scroll).
   * When set, rendered instead of the normal preMitigation + terms layout.
   */
  specialNote?: string;
}
