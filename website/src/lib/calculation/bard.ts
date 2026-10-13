import type { Calculation } from "$lib/types/calculation";
import { addF32, f32, iround, multiplyF32 } from "$lib/planner/engine-math";
import { formatNumber, formatPercent } from "./format";
import { CHARISMA, situational } from "./inputs";

// Source: server-scripts/BardFinalCadenceSkill.cs:67-70; server-scripts/PlayerSkills.cs:1576-1602 — Melody multiplies each already rounded Charisma-scaled amount and rounds again.
export function melodyBonus(songs: number): number {
  return songs >= 6 ? 0.3 : songs === 5 ? 0.25 : songs === 4 ? 0.15 : 0;
}
// Source: server-scripts/BardFinalCadenceSkill.cs:Apply,FormatScaledValue — the tooltip separates the rounded Charisma bonus from the base amount, and Melody multiplies their sum.
export function finalCadenceMelody(): Calculation {
  return {
    steps: [
      {
        name: "Melody multiplier",
        expression: "100% + the bonus for distinct songs from the table",
      },
      {
        name: "Damage or healing",
        expression:
          "Tooltip damage or healing (base plus bonus) × Melody multiplier",
        rounding: "nearest",
      },
    ],
    inputs: [
      situational(
        "scaledAmount",
        "Tooltip damage or healing, including the Charisma bonus",
        100,
      ),
      { ...situational("songs", "Distinct songs cast by hand", 4), max: 30 },
    ],
    example: ({ scaledAmount, songs }) => {
      const multiplier = addF32(1, melodyBonus(songs));
      const total = iround(multiplyF32(scaledAmount, multiplier));
      return {
        given: [
          `${formatNumber(scaledAmount)} tooltip damage or healing, including the bonus`,
          `${songs} distinct songs cast by hand`,
        ],
        // Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies; Combat.cs:DealDamageAt — defenses modify damage and heals can crit before being capped by missing Health.
        result: `${formatNumber(total)} damage before defenses, or healing before critical heals and the missing-Health cap`,
        working: [
          `Melody multiplier: 100% + ${formatPercent(melodyBonus(songs))} = ${formatPercent(multiplier)}`,
          `Damage or healing: ${formatNumber(scaledAmount)} × ${formatPercent(multiplier)} = ${formatNumber(total)}, rounded`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:GetProbResistMagic; BardCharmSongSkill.cs:GetCharmResistChance — the level term is inside the base cap, before charm-specific modifiers.
export function charmResistChance(
  monsterLevel: number,
  playerLevel: number,
  magicResist: number,
  charisma: number,
): number {
  const difference = monsterLevel - playerLevel;
  const levelTerm = Math.max(
    f32(-0.1),
    Math.min(f32(0.1), multiplyF32(difference, 0.005)),
  );
  const base = Math.max(
    0,
    Math.min(f32(0.9), addF32(multiplyF32(magicResist, 0.0005), levelTerm)),
  );
  const higherLevel = multiplyF32(Math.max(0, difference), 0.025);
  const charismaTerm = multiplyF32(Math.max(0, charisma), 0.0002);
  return Math.max(
    0,
    Math.min(f32(0.95), f32(addF32(base, higherLevel) - charismaTerm)),
  );
}

export function bardCharmResistance(): Calculation {
  return {
    steps: [
      {
        name: "Level adjustment",
        expression: "(Monster level − your level) × 0.5%",
        limit: "between −10% and +10%",
      },
      {
        name: "Base resist chance",
        expression: "Monster's Magic Resist × 0.05% + level adjustment",
        limit: "between 0% and 90%",
      },
      {
        name: "Charm resist chance",
        expression:
          "Base resist chance + 2.5% per level the monster is above you − 0.02% per point of Charisma above 0",
        limit: "between 0% and 95%",
      },
    ],
    inputs: [
      {
        ...situational("level", "Your level (character window)", 50),
        min: 1,
        max: 50,
        remember: true,
      },
      CHARISMA,
      {
        ...situational(
          "monsterLevel",
          "Monster level (target frame or monster page)",
          40,
        ),
        min: 1,
        max: 100,
      },
      situational("magicResist", "Monster's Magic Resist (monster page)", 100),
    ],
    example: ({ level, charisma, monsterLevel, magicResist }) => {
      const difference = monsterLevel - level;
      const adjustment = Math.max(
        f32(-0.1),
        Math.min(f32(0.1), multiplyF32(difference, 0.005)),
      );
      const base = Math.max(
        0,
        Math.min(
          f32(0.9),
          addF32(multiplyF32(magicResist, 0.0005), adjustment),
        ),
      );
      const chance = charmResistChance(
        monsterLevel,
        level,
        magicResist,
        charisma,
      );
      return {
        given: [
          `Level ${level}, ${charisma} Charisma`,
          `Level ${monsterLevel} monster, ${magicResist} Magic Resist`,
        ],
        result: `${formatPercent(chance)} chance to resist Charm`,
        working: [
          `Level adjustment: (${monsterLevel} − ${level}) × 0.5% = ${formatPercent(adjustment)}, limited to ±10%`,
          `Base resist chance: ${magicResist} × 0.05% + ${formatPercent(adjustment)} = ${formatPercent(base)}, limited to 0–90%`,
          `Charm resist chance: ${formatPercent(base)} + ${Math.max(0, difference)} × 2.5% − ${Math.max(0, charisma)} × 0.02% = ${formatPercent(chance)}, limited to 0–95%`,
        ],
      };
    },
  };
}
