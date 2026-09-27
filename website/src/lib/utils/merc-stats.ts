import {
  ceilToInt,
  clamp,
  f32,
  floorToInt,
  iround,
  multiplyF32,
} from "$lib/planner/engine-math";

// merc-stats.ts — Pure mercenary stat-range math and hiring-cost helpers.
// Source citations refer to Ancient Kingdoms server-scripts/*.cs.

// Source: server-scripts/Player.cs:10352-10365 — each veteran point adds +0.25% to Health and Mana multipliers.
export const VET_MULT_PER_POINT = 0.0025;
// Source: server-scripts/Constitution.cs:13-15 — Constitution adds 25 Health per point.
const CON_HEALTH = 25;
// Source: server-scripts/Intelligence.cs:21-23 — Intelligence adds 20 Mana per point.
const INT_MANA = 20;
// Source: server-scripts/Strength.cs:15-17 — Strength contributes 1 Attack Power per point.
const STR_PHYS = 1.0;
// Source: server-scripts/Intelligence.cs:7,36-38 — Intelligence contributes round(INT×1.5) Spell Power.
const INT_MAGIC = 1.5;

export interface RaceBands {
  hp: [number, number];
  mana: [number, number];
  energy: [number, number];
  bc: number;
}

// Source: server-scripts/Player.cs:10077-10114 — per-race roll bands and base-combat factors.
export const RACES: Record<string, RaceBands> = {
  Human: { hp: [0.95, 1.0], mana: [0.95, 1.0], energy: [0.95, 1.0], bc: 0.9 },
  Elf: { hp: [0.9, 0.95], mana: [1.0, 1.05], energy: [0.9, 0.95], bc: 0.7 },
  "Dark Elf": {
    hp: [0.9, 0.95],
    mana: [1.0, 1.05],
    energy: [0.9, 0.95],
    bc: 0.9,
  },
  Dwarf: { hp: [1.0, 1.05], mana: [0.9, 0.95], energy: [1.0, 1.05], bc: 0.7 },
  "Fire Goblin": {
    hp: [0.95, 1.0],
    mana: [0.9, 0.95],
    energy: [1.0, 1.05],
    bc: 0.9,
  },
  Felarii: {
    hp: [0.9, 0.95],
    mana: [0.9, 0.95],
    energy: [1.0, 1.05],
    bc: 0.95,
  },
  Drassar: {
    hp: [0.95, 1.0],
    mana: [0.9, 0.95],
    energy: [1.0, 1.05],
    bc: 0.95,
  },
};

/** Display order of every race a mercenary can be. */
export const RACE_ORDER = Object.keys(RACES);

/** Source: server-scripts/Player.cs:UserCode_CmdBuyMercenary__Int32__Int64__String__Boolean; Player.cs:10337-10364; Pet.cs:953-961 — Bard uses the Mana multiplier branch but displays songs. */
export type Role = "mana" | "energy";

export interface ClassDef {
  type: string;
  role: Role;
  /** Races the uniform roll can produce. */
  pool: string[];
  div: Record<string, number>;
}

// Source: server-scripts/Utils.cs:GetRandomChar — class race pools.
// Source: server-scripts/Player.cs:UpdateMercStatsByLevel — per-class attribute divisors.
// Keys follow the site-wide class order (ALL_CLASS_IDS in $lib/utils/classes).
export const CLASSES: Record<string, ClassDef> = {
  Warrior: {
    type: "Warrior",
    role: "energy",
    pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"],
    div: { STR: 3, CON: 2, DEX: 4, INT: 5, WIS: 6, CHA: 6 },
  },
  Ranger: {
    type: "Ranger",
    role: "mana",
    pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"],
    div: { STR: 4, CON: 3, DEX: 2, INT: 6, WIS: 5, CHA: 6 },
  },
  Cleric: {
    type: "Cleric",
    role: "mana",
    pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin"],
    div: { STR: 5, CON: 4, DEX: 6, INT: 3, WIS: 2, CHA: 6 },
  },
  Rogue: {
    type: "Rogue",
    role: "energy",
    pool: ["Human", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"],
    div: { STR: 3, CON: 4, DEX: 2, INT: 5, WIS: 6, CHA: 6 },
  },
  Wizard: {
    type: "Wizard",
    role: "mana",
    pool: ["Human", "Elf", "Dark Elf", "Fire Goblin", "Felarii"],
    div: { STR: 6, CON: 5, DEX: 3, INT: 2, WIS: 4, CHA: 6 },
  },
  Druid: {
    type: "Druid",
    role: "mana",
    pool: ["Human", "Elf", "Fire Goblin", "Felarii"],
    div: { STR: 6, CON: 5, DEX: 4, INT: 3, WIS: 2, CHA: 6 },
  },
  Bard: {
    type: "Bard",
    role: "mana",
    pool: ["Human", "Elf", "Dark Elf", "Fire Goblin", "Felarii"],
    div: { STR: 3, CON: 5, DEX: 4, INT: 6, WIS: 6, CHA: 2 },
  },
};

export interface Curve {
  hp_base: number;
  hp_per: number;
  mana_base: number;
  mana_per: number;
}
export type Curves = Record<string, Curve>;

const linear = (base: number, per: number, level: number): number =>
  base + per * (level - 1);

// Source: server-scripts/Player.cs:UpdateMercStatsByLevel — mercenary attributes are floor(level / class divisor).
export function attrs(cls: string, level: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [a, n] of Object.entries(CLASSES[cls].div))
    out[a] = floorToInt(level / n);
  return out;
}

// Source: server-scripts/Constitution.cs:13-15, server-scripts/Player.cs:10337-10354 — Health curve times multiplier plus Constitution.
const hpAt = (hpCurve: number, mult: number, con: number): number =>
  iround(multiplyF32(hpCurve, mult)) + con * CON_HEALTH;
// Source: server-scripts/Intelligence.cs:21-23, server-scripts/Player.cs:10337-10365 — Mana curve times multiplier plus Intelligence.
const manaAt = (manaCurve: number, mult: number, intl: number): number =>
  iround(multiplyF32(manaCurve, mult)) + intl * INT_MANA;
// Source: server-scripts/Player.cs:10077-10114 — base-combat max is round(level × race factor) − 1.
const baseCombatMax = (level: number, factor: number): number =>
  iround(multiplyF32(level, factor)) - 1;

export interface MercRow {
  race: string;
  eligible: boolean;
  /** True when only a recruiter preference can produce this race for the class. */
  preferredOnly: boolean;
  hp?: [number, number];
  mana?: [number, number] | null;
  atk?: [number, number];
  spell?: [number, number];
}

export interface ClassResult {
  cls: string;
  role: Role;
  hasMana: boolean;
  attrs: Record<string, number>;
  hpCurve: number;
  manaCurve: number;
  resource: string;
  rows: MercRow[];
}

/** Source: server-scripts/Player.cs:10072-10073,10077-10114,10140-10152 — the recruiter preference decides the race, then the hire rolls multipliers and a shared base-combat value. */
/** Source: server-scripts/Player.cs:10337-10365 — summoned mercenaries apply level, veteran points, Health, Mana, Attack Power, and Spell Power. */
/** Source: server-scripts/Player.cs:UpdateMercStatsByLevel — class attributes are rebuilt from level. */
export function computeAll(
  level: number,
  veteran: number,
  curves: Curves,
): ClassResult[] {
  const vetAdd = f32(veteran * VET_MULT_PER_POINT);
  return Object.entries(CLASSES).map(([cls, c]) => {
    const a = attrs(cls, level);
    const cur = curves[c.type];
    const hpCurve = linear(cur.hp_base, cur.hp_per, level);
    const manaCurve = linear(cur.mana_base, cur.mana_per, level);
    // Bard's base Mana curve is zero; its song count is not a Mana roll.
    const hasMana = c.role === "mana" && manaCurve > 0;
    const magAdd = iround(multiplyF32(a.INT, INT_MAGIC));
    const rows: MercRow[] = RACE_ORDER.map((race) => {
      const inPool = c.pool.includes(race);
      const preferredOnly = !inPool && classCanBe(cls, race);
      if (!inPool && !preferredOnly)
        return { race, eligible: false, preferredOnly: false };
      const R = RACES[race];
      const bc = baseCombatMax(level, R.bc);
      const hp: [number, number] = [
        hpAt(hpCurve, f32(R.hp[0]) + vetAdd, a.CON),
        hpAt(hpCurve, f32(R.hp[1]) + vetAdd, a.CON),
      ];
      const atk: [number, number] = [
        Math.trunc(a.STR * STR_PHYS),
        bc + Math.trunc(a.STR * STR_PHYS),
      ];
      const spell: [number, number] = [magAdd, bc + magAdd];
      const mana: [number, number] | null = hasMana
        ? [
            manaAt(manaCurve, f32(R.mana[0]) + vetAdd, a.INT),
            manaAt(manaCurve, f32(R.mana[1]) + vetAdd, a.INT),
          ]
        : null;
      return { race, eligible: true, preferredOnly, hp, mana, atk, spell };
    });

    return {
      cls,
      role: c.role,
      hasMana,
      attrs: a,
      hpCurve,
      manaCurve,
      resource: mercenaryResource(cls),
      rows,
    };
  });
}

export interface StatSpan {
  health: [number, number] | null;
  /** Null for classes without a Mana curve. */
  mana: [number, number] | null;
  attack: [number, number] | null;
  spell: [number, number] | null;
}

/**
 * The lowest and highest value of each stat that a class can roll at a level
 * and veteran total, over the given races. Gear is not included.
 */
export function classStatSpan(
  cls: string,
  level: number,
  veteran: number,
  curves: Curves,
  races: readonly string[],
): StatSpan {
  const result = computeAll(level, veteran, curves).find((c) => c.cls === cls);
  if (!result) throw new Error(`No stat model for mercenary class ${cls}`);
  const rows = result.rows.filter((r) => r.eligible && races.includes(r.race));
  const span = (
    pick: (r: MercRow) => [number, number] | null | undefined,
  ): [number, number] | null => {
    const values = rows.map(pick).filter((v) => v != null);
    if (values.length === 0) return null;
    return [
      Math.min(...values.map((v) => v[0])),
      Math.max(...values.map((v) => v[1])),
    ];
  };
  return {
    health: span((r) => r.hp),
    mana: result.hasMana ? span((r) => r.mana) : null,
    attack: span((r) => r.atk),
    spell: span((r) => r.spell),
  };
}

/**
 * Races a recruiter preference can produce although no class pool lists them,
 * with the classes that accept each one.
 * Source: server-scripts/Utils.cs:GetRandomChar — Drassar preference applies
 * only to class indices 1, 2, 3, 4, and 6. Bard (7) is excluded.
 */
export const PREFERRED_ONLY_RACES: Record<string, string[]> = {
  Drassar: ["Warrior", "Cleric", "Rogue", "Wizard", "Ranger"],
};

/** Whether a class can be this race at all, by roll or by recruiter preference. */
export function classCanBe(cls: string, race: string): boolean {
  return (
    CLASSES[cls].pool.includes(race) ||
    (PREFERRED_ONLY_RACES[race]?.includes(cls) ?? false)
  );
}

/**
 * Races this class can actually be, given the recruiters that exist. A race
 * whose recruiters are all absent is unreachable whatever the class pool says.
 */
export function obtainableRaces(
  cls: string,
  preferredRaces: readonly string[],
): string[] {
  return RACE_ORDER.filter((race) =>
    preferredRaces.some((pref) => pRaceAtRecruiter(cls, race, pref) > 0),
  );
}

/**
 * P(get this race) when hiring a class from a recruiter that prefers `preferredRace`.
 * Source: server-scripts/Utils.cs:646-647 — a preference the class can be is forced,
 * otherwise the race is uniform over the class pool.
 */
export function pRaceAtRecruiter(
  cls: string,
  race: string,
  preferredRace: string | null,
): number {
  if (!classCanBe(cls, race)) return 0;
  if (preferredRace && classCanBe(cls, preferredRace))
    return race === preferredRace ? 1 : 0;
  const pool = CLASSES[cls].pool;
  return pool.includes(race) ? 1 / pool.length : 0;
}

/** Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:17-20, server-scripts/UINpcTrading.cs:824-831 — GetDiscountPurchaseBonus returns Charisma * 0.002 and CalculatePurchaseItemPrice caps it at 0.25. */
export function charismaDiscount(charisma: number): number {
  return clamp(charisma, 0, 125) * 0.002;
}

/** Source: server-scripts/UIMercenaries.cs:434-440, server-scripts/UINpcTrading.cs:810-817 — mercenary hire price plus Charisma discount. */
export function hirePrice(
  level: number,
  veteran: number,
  discount = 0,
): number {
  const L = clamp(level, 10, 50);
  const base = iround(
    20 + 400 * ((L - 10) / 40) ** 2 + Math.max(0, veteran) * 15,
  );
  const d = clamp(discount, 0, 0.25);
  return Math.max(1, base - ceilToInt(base * d));
}

/**
 * The resource a mercenary class shows. Warriors and Rogues use Rage. A Bard
 * shows its active songs. The other classes use Mana.
 * Source: server-scripts/Pet.cs:953-961, Player.cs:10338-10346
 */
export function mercenaryResource(cls: string): "Rage" | "Mana" | "Songs" {
  if (cls === "Bard") return "Songs";
  return CLASSES[cls].role === "energy" ? "Rage" : "Mana";
}

/** Source: server-scripts/Npc.cs:1893-1904 — a recruiter serves only players at level 10 or higher. */
export const MERC_MIN_LEVEL = 10;
/** Source: server-scripts/Experience.cs:maxVeteranLevel, NetworkManagerMMO.cs:768-772 — total veteran points cap at 200. */
export const MAX_VETERAN = 200;
/** Source: server-scripts/UIMercenaries.cs:380 — a player can have ten hired mercenaries. */
export const MAX_HIRED = 10;
/** Source: server-scripts/Player.cs:10115-10120 — a party holds at most five members. */
export const MAX_PARTY = 5;

/** Source: server-scripts/UIMercenaries.cs:297-299, Player.cs:10116 — the active limit is 1 below level 20, 2 at 20–29, 3 at 30–39, and 4 at 40+. */
export function activeMercenaryLimit(level: number): number {
  if (level >= 40) return 4;
  if (level >= 30) return 3;
  if (level >= 20) return 2;
  return 1;
}

/**
 * Rank of each mercenary skill for its owner's progression.
 * Source: server-scripts/PetSkills.cs:OnStartServer — min(max rank, floor(level ÷ 5) + floor(veteran ÷ 10)), with a minimum of 1 for Bard mercenaries.
 */
export function mercenarySkillRank(
  cls: string,
  level: number,
  veteran: number,
  maximum: number,
): number {
  const rank = floorToInt(level / 5) + floorToInt(veteran / 10);
  return Math.min(maximum, cls === "Bard" ? Math.max(1, rank) : rank);
}

/** Source: server-scripts/Player.cs:GetMercenaryResurrectionPrice — round(5 + 295 × ((clamp(level, 1, 50) − 1) ÷ 49)^2.8 + 10 × veteran), less the Charisma discount (rounded up), at least 1. */
export function resurrectionPrice(
  level: number,
  veteran: number,
  discount = 0,
): number {
  const x = (clamp(level, 1, 50) - 1) / 49;
  const base = iround(5 + 295 * x ** 2.8 + Math.max(0, veteran) * 10);
  return Math.max(1, base - ceilToInt(base * clamp(discount, 0, 0.25)));
}

/** Source: server-scripts/Combat.cs:1157-1162 — the death-save rank is Mathf.RoundToInt(total veteran points ÷ 10). */
export function deathSaveRank(veteran: number): number {
  return iround(veteran / 10);
}

/** Source: server-scripts/Combat.cs:1159 — the death save needs an owner at level 50 or higher. */
export const DEATH_SAVE_MIN_LEVEL = 50;

/** P(stat >= target), discrete uniform over integers [lo, hi]. Use for base-combat. */
export function pAtLeast([lo, hi]: [number, number], target: number): number {
  if (target <= lo) return 1;
  if (target > hi) return 0;
  return (hi - target + 1) / (hi - lo + 1);
}

/**
 * P(total >= target) for a Health/Mana-style stat: total = round(curve*mult) + flatBonus,
 * mult is uniform over band plus veteran bonus. Inverts the rounded affine map to the multiplier band.
 */
export function pCurveRollAtLeast(
  curve: number,
  flatBonus: number,
  band: [number, number],
  vetAdd: number,
  target: number,
): number {
  const lo = f32(band[0]) + vetAdd;
  const hi = f32(band[1]) + vetAdd;
  if (hi <= lo)
    return target <= iround(multiplyF32(curve, lo)) + flatBonus ? 1 : 0;
  const required = (target - flatBonus - 0.5) / curve;
  if (required <= lo) return 1;
  if (required > hi) return 0;
  return (hi - required) / (hi - lo);
}

export function pHealthAtLeast(
  cd: ClassResult,
  race: string,
  veteran: number,
  target: number,
): number {
  return pCurveRollAtLeast(
    cd.hpCurve,
    cd.attrs.CON * CON_HEALTH,
    RACES[race].hp,
    f32(veteran * VET_MULT_PER_POINT),
    target,
  );
}

export function pManaAtLeast(
  cd: ClassResult,
  race: string,
  veteran: number,
  target: number,
): number {
  if (!cd.hasMana) return 1;
  return pCurveRollAtLeast(
    cd.manaCurve,
    cd.attrs.INT * INT_MANA,
    RACES[race].mana,
    f32(veteran * VET_MULT_PER_POINT),
    target,
  );
}
