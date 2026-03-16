// combat-sim.ts — All types, constants, and pure functions for the combat DPS simulator.
// Source citations refer to Ancient Kingdoms server-scripts/*.cs.
//
// WeaponItem is defined here (canonical) and re-exported from +page.server.ts so
// that +page.svelte can still use `import type { WeaponItem } from "./+page.server"`.

import {
  evaluate,
  FORMULA_EXPRS,
  renderFormula,
} from "$lib/utils/formula-eval";
import type { DamageFormulaKind } from "$lib/types/skills";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeaponItem {
  id: string;
  name: string;
  weapon_category: string;
  weapon_delay: number;
  damage: number;
  magic_damage: number;
  strength: number;
  dexterity: number;
  haste: number;
  spell_haste: number;
  class_required: string[];
  item_level: number;
  quality: number;
  tooltip_html: string;
}

export type PlayerClass =
  | "warrior"
  | "rogue"
  | "ranger"
  | "wizard"
  | "druid"
  | "cleric";

export type AttackMode =
  | "player" // warrior/rogue — melee_attack / stab
  | "merc" // warrior/rogue — sword_strike / pierce
  | "bow_player" // ranger — archer_shot
  | "melee_player" // ranger — swift_slash
  | "bow_merc" // ranger — explorer_shot
  | "spell_player" // wizard/druid/cleric — fire_blast / wind_shock / smite
  | "staff_player" // wizard/druid/cleric — staff_strike / crush_strike
  | "spell_merc"; // wizard/druid/cleric — flame_blast / gale_burst / divine_smite

export type SortKey = "dps" | "damage" | "interval";

export interface CompRow {
  weapon: WeaponItem;
  /** Off-hand weapon; only non-null for rogue player mode (fixed across rows). */
  offWeapon: WeaponItem | null;
  /** null for cooldown/spell modes (delay column hidden). */
  delay: number | null;
  /** null for cooldown/spell modes. */
  softCap: number | null;
  damage: number;
  interval: number;
  dps: number;
  isSelected: boolean;
}

export interface FormulaRow {
  cls: string;
  mode: string;
  skillId: string;
  skillName: string;
  cast: string;
  timing: string;
  damage: string;
  softCap: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CLASSES: readonly PlayerClass[] = [
  "warrior",
  "rogue",
  "ranger",
  "wizard",
  "druid",
  "cleric",
];

export const CLASS_LABEL: Record<PlayerClass, string> = {
  warrior: "Warrior",
  rogue: "Rogue",
  ranger: "Ranger",
  wizard: "Wizard",
  druid: "Druid",
  cleric: "Cleric",
};

export const CLASS_MODES: Record<PlayerClass, AttackMode[]> = {
  warrior: ["player", "merc"],
  rogue: ["player", "merc"],
  ranger: ["bow_player", "melee_player", "bow_merc"],
  wizard: ["spell_player", "staff_player", "spell_merc"],
  druid: ["spell_player", "staff_player", "spell_merc"],
  cleric: ["spell_player", "staff_player", "spell_merc"],
};

export const CLASS_DEFAULT_MODE: Record<PlayerClass, AttackMode> = {
  warrior: "player",
  rogue: "player",
  ranger: "bow_player",
  wizard: "spell_player",
  druid: "spell_player",
  cleric: "spell_player",
};

export const MODE_LABEL: Record<AttackMode, string> = {
  player: "Player",
  merc: "Merc",
  bow_player: "Bow (Player)",
  melee_player: "Melee (Player)",
  bow_merc: "Bow (Merc)",
  spell_player: "Spell (Player)",
  staff_player: "Staff (Player)",
  spell_merc: "Spell (Merc)",
};

// Spell player cast times: fire_blast (wizard 0.9s), wind_shock (druid 1.0s), smite (cleric 1.2s)
// Source: Skills.cs — skill cast_time base_value
export const SPELL_PLAYER_CAST: Partial<Record<PlayerClass, number>> = {
  wizard: 0.9,
  druid: 1.0,
  cleric: 1.2,
};

// Hard cap on spell haste. Source: server-scripts/Combat.cs:332 — Mathf.Clamp(num, -0.5f, 0.5f)
export const SPELL_HASTE_CAP = 0.5;
// Spell merc cast times: flame_blast (wizard 0.8s), gale_burst (druid 1.0s), divine_smite (cleric 1.2s)
export const SPELL_MERC_CAST: Partial<Record<PlayerClass, number>> = {
  wizard: 0.8,
  druid: 1.0,
  cleric: 1.2,
};

// Spell merc cooldowns — NOT reduced by haste (Skills.cs !isSpell gate)
// flame_blast cd=1.0, gale_burst cd=2.0, divine_smite cd=2.0
export const SPELL_MERC_CD: Partial<Record<PlayerClass, number>> = {
  wizard: 1.0,
  druid: 2.0,
  cleric: 2.0,
};

// Static formula reference table for the reference section. Unique key: cls + mode.
export const FORMULA_TABLE: readonly FormulaRow[] = [
  {
    cls: "Warrior",
    mode: "Player",
    skillId: "melee_attack",
    skillName: "Melee Attack",
    cast: "0.5s",
    timing: "cast + clamp(delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["normal"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Warrior",
    mode: "Merc",
    skillId: "sword_strike",
    skillName: "Sword Strike",
    cast: "0.5s",
    timing: "cast + 1.0×(1−h)",
    damage: renderFormula(FORMULA_EXPRS["normal"]),
    softCap: "None (linear)",
  },
  {
    cls: "Rogue",
    mode: "Player",
    skillId: "stab",
    skillName: "Stab",
    cast: "0.4s",
    timing: "cast + clamp(delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["rogue_melee"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Rogue",
    mode: "Merc",
    skillId: "pierce",
    skillName: "Pierce",
    cast: "0.4s",
    timing: "cast + 1.0×(1−h)",
    damage: renderFormula(FORMULA_EXPRS["rogue_melee_merc"]),
    softCap: "None (linear)",
  },
  {
    cls: "Ranger",
    mode: "Bow (Player)",
    skillId: "archer_shot",
    skillName: "Archer Shot",
    cast: "0.8s",
    timing: "cast + clamp(bow_delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["ranged_player"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Ranger",
    mode: "Melee (Player)",
    skillId: "swift_slash",
    skillName: "Swift Slash",
    cast: "0.5s",
    timing: "cast + clamp(melee_delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["ranger_melee"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Ranger",
    mode: "Bow (Merc)",
    skillId: "explorer_shot",
    skillName: "Explorer Shot",
    cast: "0.8s",
    timing: "cast + 1.0×(1−h)",
    damage: renderFormula(FORMULA_EXPRS["ranged_merc"]),
    softCap: "None (linear)",
  },
  {
    cls: "Wizard",
    mode: "Spell (Player)",
    skillId: "fire_blast",
    skillName: "Fire Blast",
    cast: "0.9s",
    timing: "cast × (1 − spell haste)",
    damage: renderFormula(FORMULA_EXPRS["magic_spell"]),
    softCap: "50% spell haste",
  },
  {
    cls: "Wizard",
    mode: "Staff (Player)",
    skillId: "staff_strike",
    skillName: "Staff Strike",
    cast: "0.5s",
    timing: "cast + clamp(delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["normal"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Wizard",
    mode: "Spell (Merc)",
    skillId: "flame_blast",
    skillName: "Flame Blast",
    cast: "0.8s",
    timing: "cast × (1 − spell haste) + 1.0s cooldown",
    damage: renderFormula(FORMULA_EXPRS["magic_spell"]),
    softCap: "50% spell haste",
  },
  {
    cls: "Druid",
    mode: "Spell (Player)",
    skillId: "wind_shock",
    skillName: "Wind Shock",
    cast: "1.0s",
    timing: "cast × (1 − spell haste)",
    damage: renderFormula(FORMULA_EXPRS["magic_spell"]),
    softCap: "50% spell haste",
  },
  {
    cls: "Druid",
    mode: "Staff (Player)",
    skillId: "staff_strike",
    skillName: "Staff Strike",
    cast: "0.5s",
    timing: "cast + clamp(delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["normal"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Druid",
    mode: "Spell (Merc)",
    skillId: "gale_burst",
    skillName: "Gale Burst",
    cast: "1.0s",
    timing: "cast × (1 − spell haste) + 2.0s cooldown",
    damage: renderFormula(FORMULA_EXPRS["magic_spell"]),
    softCap: "50% spell haste",
  },
  {
    cls: "Cleric",
    mode: "Spell (Player)",
    skillId: "smite",
    skillName: "Smite",
    cast: "1.2s",
    timing: "cast × (1 − spell haste)",
    damage: renderFormula(FORMULA_EXPRS["magic_spell"]),
    softCap: "50% spell haste",
  },
  {
    cls: "Cleric",
    mode: "Staff (Player)",
    skillId: "crush_strike",
    skillName: "Crush Strike",
    cast: "0.5s",
    timing: "cast + clamp(delay×(1−h)/25, 0.25, 2.0s)",
    damage: renderFormula(FORMULA_EXPRS["normal"]),
    softCap: "1 − 6.25/delay",
  },
  {
    cls: "Cleric",
    mode: "Spell (Merc)",
    skillId: "divine_smite",
    skillName: "Divine Smite",
    cast: "1.2s",
    timing: "cast × (1 − spell haste) + 2.0s cooldown",
    damage: renderFormula(FORMULA_EXPRS["magic_spell"]),
    softCap: "50% spell haste",
  },
];

// ─── Auto-attack formula mapping ─────────────────────────────────────────────

/**
 * Maps each (AttackMode, PlayerClass) pair to the DamageFormulaKind used for
 * auto-attack damage calculation. Drives both evaluate() and the reference table.
 *
 * Slot assignments assumed by calcDamage():
 *   player/merc + warrior  → main = sword
 *   player + rogue         → main = dagger, off = off-hand dagger
 *   merc + rogue           → main = dagger, off = off-hand dagger (full damage, no penalty)
 *   bow_player/melee_player → bow = bow, main = sword (via melee→main remap)
 *   bow_merc               → bow = bow, melee = sword
 *   spell_*                → wand = wand
 *   staff_player           → main = wand (physical path, via wand→main remap)
 */
export const AUTO_ATTACK_FORMULA_KIND: Record<
  AttackMode,
  DamageFormulaKind | Partial<Record<PlayerClass, DamageFormulaKind>>
> = {
  player: { warrior: "normal", rogue: "rogue_melee" },
  merc: { warrior: "normal", rogue: "rogue_melee_merc" },
  bow_player: "ranged_player",
  melee_player: "ranger_melee",
  bow_merc: "ranged_merc",
  spell_player: "magic_spell",
  staff_player: "normal",
  spell_merc: "magic_spell",
};

export function getAutoAttackKind(
  mode: AttackMode,
  cls: PlayerClass,
): DamageFormulaKind {
  const entry = AUTO_ATTACK_FORMULA_KIND[mode];
  if (typeof entry === "string") return entry;
  const kind = (entry as Partial<Record<PlayerClass, DamageFormulaKind>>)[cls];
  if (!kind) throw new Error(`No auto-attack formula for ${mode}:${cls}`);
  return kind;
}

// ─── Mode predicates ──────────────────────────────────────────────────────────

/** Delay-based: interval = cast + clamp(weapon_delay × (1−haste) / 25, 0.25, 2.0s) */
export function isDelayBased(m: AttackMode): boolean {
  return (
    m === "player" ||
    m === "bow_player" ||
    m === "melee_player" ||
    m === "staff_player"
  );
}

/** Cooldown-based: interval = cast + cooldown × (1−haste); no weapon delay involved. */
export function isCooldownBased(m: AttackMode): boolean {
  return m === "merc" || m === "bow_merc";
}

/** Spell: interval = cast × (1−spellHaste); regular haste has zero effect. */
export function isSpellMode(m: AttackMode): boolean {
  return m === "spell_player" || m === "spell_merc";
}

/**
 * Haste contributed by secondary equipped weapons in modes with two active weapon slots.
 * Rogue player/merc: off-hand dagger. Ranger bow_merc: melee sword. All others: zero.
 */
export function getSecondaryWeaponHaste(
  mode: AttackMode,
  cls: PlayerClass,
  off: WeaponItem | null,
  melee: WeaponItem | null,
): { haste: number; spellHaste: number } {
  if ((mode === "player" || mode === "merc") && cls === "rogue") {
    return { haste: off?.haste ?? 0, spellHaste: off?.spell_haste ?? 0 };
  }
  if (mode === "bow_merc") {
    return { haste: melee?.haste ?? 0, spellHaste: melee?.spell_haste ?? 0 };
  }
  return { haste: 0, spellHaste: 0 };
}

// ─── Physics ──────────────────────────────────────────────────────────────────

/** Source: Player.cs:2783 — refractoryPeriod = clamp(delay*(1−haste)/25, 0.25, 2.0) */
export function clampRefractory(delay: number, haste01: number): number {
  return Math.max(0.25, Math.min(2.0, (delay * (1 - haste01)) / 25));
}

/**
 * Haste % at which the refractory hits its 0.25s floor.
 * Derivation: clamp floor reached when delay*(1−h)/25 = 0.25 → h = 1 − 6.25/delay
 */
export function softCapHaste(delay: number): number {
  return Math.max(0, 1 - 6.25 / delay) * 100;
}

// ─── Core calculators ─────────────────────────────────────────────────────────

/**
 * Attack interval in seconds for the given mode and stats.
 * Source: Player.cs:2783, Skills.cs:762-773
 *
 * @param delay     weapon_delay; ignored for cooldown/spell modes
 * @param haste01   regular haste [0, 0.8] (caller must clamp)
 * @param spellHaste01  spell haste [0, SPELL_HASTE_CAP]; caller must pre-clamp
 */
export function calcInterval(
  mode: AttackMode,
  cls: PlayerClass,
  delay: number,
  haste01: number,
  spellHaste01: number,
): number {
  switch (mode) {
    case "player":
      // melee_attack (warrior 0.5s cast) or stab (rogue 0.4s cast)
      return (cls === "warrior" ? 0.5 : 0.4) + clampRefractory(delay, haste01);
    case "merc":
      // sword_strike / pierce: cast + cooldown*(1−haste)
      // Source: Skills.cs:766-768 — followupDefaultAttack && !isSpell → cooldown*(1-haste)
      return (cls === "warrior" ? 0.5 : 0.4) + 1.0 * (1 - haste01);
    case "bow_player":
      // archer_shot (0.8s cast)
      return 0.8 + clampRefractory(delay, haste01);
    case "melee_player":
      // swift_slash (0.5s cast)
      return 0.5 + clampRefractory(delay, haste01);
    case "bow_merc":
      // explorer_shot (0.8s cast, cd=1.0)
      return 0.8 + 1.0 * (1 - haste01);
    case "spell_player":
      // fire_blast / wind_shock / smite — no cooldown; spell haste reduces cast time
      // Source: Skills.cs:675 spellHasteBonus reduces castTime
      return (SPELL_PLAYER_CAST[cls] ?? 1.0) * (1 - spellHaste01);
    case "staff_player":
      // staff_strike / crush_strike (0.5s cast, regular haste via weapon delay)
      return 0.5 + clampRefractory(delay, haste01);
    case "spell_merc":
      // flame_blast / gale_burst / divine_smite
      // Cooldown is NOT reduced by haste (Skills.cs !isSpell gate)
      return (
        (SPELL_MERC_CAST[cls] ?? 1.0) * (1 - spellHaste01) +
        (SPELL_MERC_CD[cls] ?? 1.0)
      );
  }
}

/**
 * Damage per hit for the given mode, class, and weapon loadout.
 * Returns null when the required primary weapon for the formula is absent.
 *
 * Slot semantics:
 *   melee_player → `melee` is remapped to the formula's "main" slot (sword → "main").
 *   staff_player  → `wand` is remapped to the formula's "main" slot (phys path).
 *   merc + rogue  → `off` carries the off-hand dagger (full damage, no penalty).
 */
export function calcDamage(
  mode: AttackMode,
  cls: PlayerClass,
  slots: {
    main?: WeaponItem | null;
    off?: WeaponItem | null;
    bow?: WeaponItem | null;
    melee?: WeaponItem | null;
    wand?: WeaponItem | null;
  },
  str: number,
  dex: number,
  int_: number,
  otherPhys: number,
  otherMagic: number,
): number | null {
  const kind = getAutoAttackKind(mode, cls);

  // Mode-specific slot remapping:
  //   melee_player: ranger carries a sword in the "melee" slot, but the formula
  //     (ranger_melee) expects it in the "main" slot.
  //   staff_player: the wand is used as a physical weapon in the "main" slot.
  const slotMain =
    mode === "melee_player"
      ? slots.melee
      : mode === "staff_player"
        ? slots.wand
        : slots.main;

  return evaluate(FORMULA_EXPRS[kind], {
    weapons: {
      main: slotMain ?? undefined,
      off: slots.off ?? undefined,
      bow: slots.bow ?? undefined,
      melee: slots.melee ?? undefined,
      wand: slots.wand ?? undefined,
    },
    str,
    dex,
    int_,
    otherPhys,
    otherMagic,
  });
}

// ─── Comparison table builder ─────────────────────────────────────────────────

/**
 * Build and sort the comparison table rows.
 * Pure: no reactive state; all inputs are explicit.
 *
 * weaponList is the list to iterate (varies by mode).
 * fixedOff/fixedMelee are secondary weapons held constant across rows.
 * selectedId marks which row is currently selected (highlighted).
 */
export function buildComparisonRows(params: {
  mode: AttackMode;
  cls: PlayerClass;
  weaponList: WeaponItem[];
  fixedOff: WeaponItem | null;
  fixedMelee: WeaponItem | null;
  selectedId: string;
  str: number;
  dex: number;
  int_: number;
  haste01: number;
  spellHaste01: number;
  otherPhys: number;
  otherMagic: number;
  sortKey: SortKey;
}): CompRow[] {
  const {
    mode,
    cls,
    weaponList,
    fixedOff,
    fixedMelee,
    selectedId,
    str,
    dex,
    int_,
    haste01,
    spellHaste01,
    otherPhys,
    otherMagic,
    sortKey,
  } = params;

  const rows: CompRow[] = [];

  // Computed once — secondary haste doesn't vary per weapon in the list.
  const { haste: secondaryHaste, spellHaste: secondarySpellHaste } =
    getSecondaryWeaponHaste(mode, cls, fixedOff, fixedMelee);

  for (const w of weaponList) {
    // Place 'w' in the correct argument position for this mode.
    let dmg: number | null;
    switch (mode) {
      case "player":
        dmg = calcDamage(
          "player",
          cls,
          { main: w, off: fixedOff },
          str,
          dex,
          int_,
          otherPhys,
          otherMagic,
        );
        break;
      case "merc":
        dmg = calcDamage(
          "merc",
          cls,
          { main: w, off: fixedOff },
          str,
          dex,
          int_,
          otherPhys,
          otherMagic,
        );
        break;
      case "bow_player":
        dmg = calcDamage(
          "bow_player",
          cls,
          { bow: w },
          str,
          dex,
          int_,
          otherPhys,
          otherMagic,
        );
        break;
      case "melee_player":
        dmg = calcDamage(
          "melee_player",
          cls,
          { melee: w },
          str,
          dex,
          int_,
          otherPhys,
          otherMagic,
        );
        break;
      case "bow_merc":
        dmg = calcDamage(
          "bow_merc",
          cls,
          { bow: w, melee: fixedMelee },
          str,
          dex,
          int_,
          otherPhys,
          otherMagic,
        );
        break;
      case "spell_player":
      case "spell_merc":
      case "staff_player":
        dmg = calcDamage(
          mode,
          cls,
          { wand: w },
          str,
          dex,
          int_,
          otherPhys,
          otherMagic,
        );
        break;
      default:
        dmg = null;
    }

    if (dmg === null) continue;

    let rowDelay: number | null;
    let rowInterval: number;
    let rowSoftCap: number | null;

    const effectiveHaste = Math.min(haste01 + w.haste + secondaryHaste, 0.8);
    const effectiveSpellHaste = Math.min(
      spellHaste01 + w.spell_haste + secondarySpellHaste,
      SPELL_HASTE_CAP,
    );
    if (isDelayBased(mode)) {
      rowDelay = w.weapon_delay;
      rowInterval = calcInterval(
        mode,
        cls,
        rowDelay,
        effectiveHaste,
        effectiveSpellHaste,
      );
      rowSoftCap = softCapHaste(rowDelay);
    } else {
      rowDelay = null;
      rowInterval = calcInterval(
        mode,
        cls,
        0,
        effectiveHaste,
        effectiveSpellHaste,
      );
      rowSoftCap = null;
    }

    if (rowInterval <= 0) continue;

    rows.push({
      weapon: w,
      offWeapon: fixedOff,
      delay: rowDelay,
      damage: dmg,
      interval: rowInterval,
      dps: dmg / rowInterval,
      softCap: rowSoftCap,
      isSelected: w.id === selectedId,
    });
  }

  rows.sort((a, b) => {
    if (sortKey === "dps") return b.dps - a.dps;
    if (sortKey === "damage") return b.damage - a.damage;
    return a.interval - b.interval;
  });

  return rows;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function fmt(n: number, dec = 2): string {
  return n.toFixed(dec);
}

/** Human-readable soft-cap text for the Results card. */
export function fmtSoftCap(mode: AttackMode, delay: number | null): string {
  if (isDelayBased(mode)) {
    return delay !== null ? `${fmt(softCapHaste(delay), 1)}%` : "—";
  }
  if (isCooldownBased(mode)) return "None (linear to 80%)";
  return "50% spell haste";
}

/**
 * Human-readable interval breakdown for the Results card formula section.
 * Returns empty string when activeWeapon is null or interval is 0.
 *
 * @param hastePercent      raw haste percentage (0–80), not clamped to 0..1
 * @param spellHastePercent raw spell haste percentage (0–50)
 */
export function fmtInterval(
  mode: AttackMode,
  cls: PlayerClass,
  interval: number,
  activeWeapon: WeaponItem | null,
  hastePercent: number,
  spellHastePercent: number,
): string {
  if (!activeWeapon || interval === 0) return "";
  // Clamp to match the main calc's rule.
  const h = Math.min(hastePercent / 100, 0.8);
  switch (mode) {
    case "player": {
      const ct = cls === "warrior" ? 0.5 : 0.4;
      return `${fmt(ct, 1)}s cast + ${fmt(interval - ct)}s refractory`;
    }
    case "merc": {
      const ct = cls === "warrior" ? 0.5 : 0.4;
      const cd = 1.0 * (1 - h);
      return `${fmt(ct, 1)}s cast + 1.0×(1−${hastePercent}%) = ${fmt(cd)}s cooldown`;
    }
    case "bow_player":
      return `0.8s cast + ${fmt(interval - 0.8)}s refractory`;
    case "melee_player":
      return `0.5s cast + ${fmt(interval - 0.5)}s refractory`;
    case "bow_merc": {
      const cd = 1.0 * (1 - h);
      return `0.8s cast + 1.0×(1−${hastePercent}%) = ${fmt(cd)}s cooldown`;
    }
    case "spell_player": {
      const ct = SPELL_PLAYER_CAST[cls] ?? 1.0;
      return `${fmt(ct, 1)}s × (1−${spellHastePercent}% spell haste) = ${fmt(interval)}s`;
    }
    case "staff_player":
      return `0.5s cast + ${fmt(interval - 0.5)}s refractory`;
    case "spell_merc": {
      const ct = SPELL_MERC_CAST[cls] ?? 1.0;
      const cd = SPELL_MERC_CD[cls] ?? 1.0;
      return `${fmt(ct, 1)}s × (1−${spellHastePercent}%) + ${cd}s cooldown = ${fmt(interval)}s`;
    }
  }
}
