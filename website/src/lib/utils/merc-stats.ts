// merc-stats.ts — Pure mercenary stat-range math and hiring-cost helpers.
// Source citations refer to Ancient Kingdoms server-scripts/*.cs.
// Engine-faithful: float32 (Math.fround) plus banker's rounding to match Unity/C#.

// Source: server-scripts/Player.cs:9543-9555 — each veteran point adds +0.25% to Health and Mana multipliers.
export const VET_MULT_PER_POINT = 0.0025;
// Source: server-scripts/Constitution.cs:13-15 — Constitution adds 25 Health per point.
const CON_HEALTH = 25;
// Source: server-scripts/Intelligence.cs:21-23 — Intelligence adds 20 Mana per point.
const INT_MANA = 20;
// Source: server-scripts/Strength.cs:15-17 — Strength contributes 1 Attack Power per point.
const STR_PHYS = 1.0;
// Source: server-scripts/Intelligence.cs:7,36-38 — Intelligence contributes round(INT×1.5) Spell Power.
const INT_MAGIC = 1.5;

/** Round to float32 precision, as Unity stores/computes. */
export const f32 = (x: number): number => Math.fround(x);

/** (int)Math.Round(double) using banker's rounding. */
export function iround(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

export interface RaceBands {
  hp: [number, number];
  mana: [number, number];
  energy: [number, number];
  bc: number;
}

// Source: server-scripts/Player.cs:9747-9784 — per-race roll bands and base-combat factors.
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

export type Role = "mana" | "energy";

export interface ClassDef {
  type: string;
  role: Role;
  /** Races the uniform roll can produce. */
  pool: string[];
  div: Record<string, number>;
}

// Source: server-scripts/Utils.cs:629-638 — class race pools.
// Source: server-scripts/Player.cs:7979-8015,8016-8044,8045-8073,8074-8102,8103-8131,8132-8163 — per-class attribute divisors.
export const CLASSES: Record<string, ClassDef> = {
  Warrior: {
    type: "Warrior",
    role: "energy",
    pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"],
    div: { STR: 3, CON: 2, DEX: 4, INT: 5, WIS: 6, CHA: 6 },
  },
  Rogue: {
    type: "Rogue",
    role: "energy",
    pool: ["Human", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"],
    div: { STR: 3, CON: 4, DEX: 2, INT: 5, WIS: 6, CHA: 6 },
  },
  Cleric: {
    type: "Cleric",
    role: "mana",
    pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin"],
    div: { STR: 5, CON: 4, DEX: 6, INT: 3, WIS: 2, CHA: 6 },
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
  Ranger: {
    type: "Ranger",
    role: "mana",
    pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"],
    div: { STR: 4, CON: 3, DEX: 2, INT: 6, WIS: 5, CHA: 6 },
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

// Source: server-scripts/Player.cs:7979-8015,8016-8044,8045-8073,8074-8102,8103-8131,8132-8163 — mercenary attributes are floor(level / class divisor).
export function attrs(cls: string, level: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [a, n] of Object.entries(CLASSES[cls].div))
    out[a] = Math.floor(level / n);
  return out;
}

// Source: server-scripts/Constitution.cs:13-15, server-scripts/Player.cs:9528-9545 — Health curve times multiplier plus Constitution.
const hpAt = (hpCurve: number, mult: number, con: number): number =>
  iround(f32(f32(hpCurve) * f32(mult))) + con * CON_HEALTH;
// Source: server-scripts/Intelligence.cs:21-23, server-scripts/Player.cs:9528-9555 — Mana curve times multiplier plus Intelligence.
const manaAt = (manaCurve: number, mult: number, intl: number): number =>
  iround(f32(f32(manaCurve) * f32(mult))) + intl * INT_MANA;
// Source: server-scripts/Player.cs:9747-9784 — base-combat max is round(level × race factor) − 1.
const baseCombatMax = (level: number, factor: number): number =>
  iround(f32(f32(level) * f32(factor))) - 1;

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

/** Source: server-scripts/Player.cs:9742-9743,9747-9784,9810-9822 — the recruiter preference decides the race, then the hire rolls multipliers and a shared base-combat value. */
/** Source: server-scripts/Player.cs:9528-9555 — summoned mercenaries apply level, veteran points, Health, Mana, Attack Power, and Spell Power. */
/** Source: server-scripts/Player.cs:7979-8015,8016-8044,8045-8073,8074-8102,8103-8131,8132-8163 — class attributes are rebuilt from level. */
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
    const hasMana = c.role === "mana" && manaCurve > 0;
    const magAdd = iround(f32(a.INT * INT_MAGIC));
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
      resource: c.role === "energy" ? "Rage" : "Mana",
      rows,
    };
  });
}

/**
 * Races a recruiter preference can produce although no class pool lists them,
 * with the classes that accept each one.
 * Source: server-scripts/Utils.cs:639-640 — the server names the race and the
 * class indices that honour it, so the pool alone does not decide the outcome.
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
 * Source: server-scripts/Utils.cs:639-640 — a preference the class can be is forced,
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

/** Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:13-15, server-scripts/UINpcTrading.cs:824-831 — purchase discount is Charisma×0.002, capped by the shop. */
export function charismaDiscount(charisma: number): number {
  return Math.min(0.25, Math.max(0, charisma) * 0.002);
}

/** Source: server-scripts/UIMercenaries.cs:427-433, server-scripts/UINpcTrading.cs:810-817 — mercenary hire price plus Charisma discount. */
export function hirePrice(
  level: number,
  veteran: number,
  discount = 0,
): number {
  const L = Math.max(10, Math.min(50, level));
  const base = Math.round(
    20 + 400 * ((L - 10) / 40) ** 2 + Math.max(0, veteran) * 15,
  );
  const d = Math.min(0.25, Math.max(0, discount));
  return Math.max(1, base - Math.ceil(base * d));
}

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
    return target <= iround(f32(f32(curve) * f32(lo))) + flatBonus ? 1 : 0;
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
