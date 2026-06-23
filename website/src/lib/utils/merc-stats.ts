// merc-stats.ts — Pure mercenary stat-range math and hiring-cost helpers.
// Source citations refer to Ancient Kingdoms server-scripts/*.cs.
// Engine-faithful: float32 (Math.fround) plus banker's rounding to match Unity/C#.

// Source: server-scripts/Player.cs:8472-8484 — each veteran point adds +0.25% to Health and Mana multipliers.
export const VET_MULT_PER_POINT = 0.0025;
// Source: server-scripts/Constitution.cs:13-15 — Constitution adds 25 Health per point.
const CON_HEALTH = 25;
// Source: server-scripts/Intelligence.cs:21-23 — Intelligence adds 20 Mana per point.
const INT_MANA = 20;
// Source: server-scripts/Strength.cs:15-17 — Strength contributes 1 Attack Power per point.
const STR_PHYS = 1.0;
// Source: server-scripts/Intelligence.cs:36-38 — Intelligence contributes round(INT×1.5) Spell Power.
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

// Source: server-scripts/Player.cs:8401-8430 — per-race roll bands and base-combat factors.
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
};

export const RACE_ORDER = [
  "Human",
  "Elf",
  "Dark Elf",
  "Dwarf",
  "Fire Goblin",
  "Felarii",
];

export type Role = "mana" | "energy";

export interface ClassDef {
  type: string;
  role: Role;
  pool: string[];
  div: Record<string, number>;
}

// Source: server-scripts/Utils.cs:577-585 — class race pools.
// Source: server-scripts/Player.cs:6975-7150 — per-class attribute divisors.
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

// Source: server-scripts/Player.cs:6969-7152 — mercenary attributes are floor(level / class divisor).
export function attrs(cls: string, level: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [a, n] of Object.entries(CLASSES[cls].div))
    out[a] = Math.floor(level / n);
  return out;
}

// Source: server-scripts/Constitution.cs:13-15, server-scripts/Player.cs:8457-8474 — Health curve times multiplier plus Constitution.
const hpAt = (hpCurve: number, mult: number, con: number): number =>
  iround(f32(f32(hpCurve) * f32(mult))) + con * CON_HEALTH;
// Source: server-scripts/Intelligence.cs:21-23, server-scripts/Player.cs:8457-8484 — Mana curve times multiplier plus Intelligence.
const manaAt = (manaCurve: number, mult: number, intl: number): number =>
  iround(f32(f32(manaCurve) * f32(mult))) + intl * INT_MANA;
// Source: server-scripts/Player.cs:8401-8430 — base-combat max is round(level × race factor) − 1.
const baseCombatMax = (level: number, factor: number): number =>
  iround(f32(f32(level) * f32(factor))) - 1;

export interface MercRow {
  race: string;
  eligible: boolean;
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

/** Source: server-scripts/Player.cs:8395-8439 — hire rolls race, multipliers, and shared base-combat value. */
/** Source: server-scripts/Player.cs:8457-8484 — summoned mercenaries apply level, veteran points, Health, Mana, Attack Power, and Spell Power. */
/** Source: server-scripts/Player.cs:6969-7152 — class attributes are rebuilt from level. */
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
    const pool = new Set(c.pool);

    const rows: MercRow[] = RACE_ORDER.map((race) => {
      if (!pool.has(race)) return { race, eligible: false };
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
      return { race, eligible: true, hp, mana, atk, spell };
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

// Source: server-scripts/Utils.cs:588-609 — tavern zone race bias used by GetRandomChar.
export const ZONE_RACES: Record<number, string[]> = {
  1: ["Elf"],
  3: ["Dwarf"],
  4: ["Human"],
  5: ["Dark Elf", "Fire Goblin"],
  22: ["Felarii"],
};

export function raceHomeZone(race: string): number | null {
  for (const [z, rs] of Object.entries(ZONE_RACES))
    if (rs.includes(race)) return Number(z);
  return null;
}

/**
 * P(roll this race) when hiring a class in a zone.
 * Source: server-scripts/Utils.cs:588-609 — zone-pinned in-pool races are forced, otherwise the roll is uniform over the pool.
 */
export function pRaceInZone(
  cls: string,
  race: string,
  zoneId: number | null,
): number {
  const pool = CLASSES[cls].pool;
  if (!pool.includes(race)) return 0;
  const pinned = (zoneId != null ? (ZONE_RACES[zoneId] ?? []) : []).filter(
    (r) => pool.includes(r),
  );
  const list = pinned.length ? pinned : pool;
  return list.includes(race) ? 1 / list.length : 0;
}

/** Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:13-15 — purchase discount is Charisma×0.002, capped by the shop. */
export function charismaDiscount(charisma: number): number {
  return Math.min(0.25, Math.max(0, charisma) * 0.002);
}

/** Source: server-scripts/UIMercenaries.cs:212-218, server-scripts/UINpcTrading.cs:810-817 — mercenary hire price plus Charisma discount. */
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
