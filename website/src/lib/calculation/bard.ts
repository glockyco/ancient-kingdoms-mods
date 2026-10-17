import type { Calculation, CalculationInput } from "$lib/types/calculation";
import { addF32, f32, iround, multiplyF32 } from "$lib/calculation/unity-math";
import { formatNumber, formatPercent } from "$lib/utils/format";
import { CHARISMA, situational } from "./inputs";

// Source: server-scripts/BardFinalCadenceSkill.cs:67-70; server-scripts/PlayerSkills.cs:1638-1655 — Melody multiplies each already rounded Charisma-scaled amount and rounds again.
export function melodyBonus(songs: number): number {
  return songs >= 6 ? 0.3 : songs === 5 ? 0.25 : songs === 4 ? 0.15 : 0;
}

// Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive — Final Cadence needs at least three active songs.
export const ACTIVE_SONGS: CalculationInput = {
  ...situational("songs", "Active songs", 4),
  phrase: "active songs",
  min: 3,
  max: 30,
};

// Source: server-scripts/BardFinalCadenceSkill.cs:Apply,FormatScaledValue — the tooltip separates the rounded Charisma bonus from the base amount, and Melody multiplies their sum.
export function finalCadenceMelody(): Calculation {
  return {
    steps: [
      {
        name: "Melody bonus",
        expression: "The bonus for your active songs from the table",
      },
      {
        name: "Damage or healing",
        expression:
          "Tooltip damage or healing (base plus bonus) × (100% + Melody bonus)",
        rounding: "nearest",
      },
    ],
    inputs: [
      situational(
        "scaledAmount",
        "Tooltip damage or healing, including the Charisma bonus",
        100,
      ),
      ACTIVE_SONGS,
    ],
    example: ({ scaledAmount, songs }) => {
      const multiplier = addF32(1, melodyBonus(songs));
      const total = iround(multiplyF32(scaledAmount, multiplier));
      return {
        given: [
          `${formatNumber(scaledAmount)} tooltip damage or healing, including the bonus`,
          `${songs} active songs`,
        ],
        // Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies; Combat.cs:DealDamageAt — defenses modify damage and heals can crit before being capped by missing Health.
        result: `${formatNumber(total)} damage before defenses, or ${formatNumber(total)} healing before critical heals, at most the target's missing Hit Points`,
        working: [
          `Melody bonus: ${formatPercent(melodyBonus(songs), { decimals: 2, preserveNonzero: true })} for ${songs} active songs`,
          `Damage or healing: ${formatNumber(scaledAmount)} × ${formatPercent(multiplier, { decimals: 2, preserveNonzero: true })} = ${formatNumber(total)}, rounded`,
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
        expression: "(Monster level − your level) × 0.5 percentage points",
        limit: "between −10 and +10 percentage points",
      },
      {
        name: "Base resist chance",
        expression:
          "Monster's Magic Resist × 0.05 percentage points + level adjustment",
        limit: "between 0% and 90%",
      },
      {
        name: "Charm resist chance",
        expression:
          "Base resist chance + 2.5 percentage points per level the monster is above you − 0.02 percentage points per point of Charisma above 0",
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
          52,
        ),
        min: 1,
        max: 100,
      },
      situational("magicResist", "Monster's Magic Resist (monster page)", 300),
    ],
    example: ({ level, charisma, monsterLevel, magicResist }) => {
      const difference = monsterLevel - level;
      const rawAdjustment = multiplyF32(difference, 0.005);
      const adjustment = Math.max(f32(-0.1), Math.min(f32(0.1), rawAdjustment));
      const base = Math.max(
        0,
        Math.min(
          f32(0.9),
          addF32(multiplyF32(magicResist, 0.0005), adjustment),
        ),
      );
      const rawBase = addF32(multiplyF32(magicResist, 0.0005), adjustment);
      const rawChance = f32(
        addF32(base, multiplyF32(Math.max(0, difference), 0.025)) -
          multiplyF32(Math.max(0, charisma), 0.0002),
      );
      const percent = (value: number) => formatPercent(value, { decimals: 2 });
      const points = (value: number) =>
        percent(value).replace("%", " percentage points");
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
        result: `${percent(chance)} chance to resist Charm`,
        working: [
          `Level adjustment: (${monsterLevel} − ${level}) × 0.5 percentage points = ${points(rawAdjustment)}${adjustment !== rawAdjustment ? `, limited to ${points(adjustment)}` : ""}`,
          `Base resist chance: ${magicResist} × 0.05 percentage points ${adjustment < 0 ? "−" : "+"} ${points(Math.abs(adjustment))} = ${percent(rawBase)}${base !== rawBase ? `, limited to ${percent(base)}` : ""}`,
          `Charm resist chance: ${percent(base)} + ${Math.max(0, difference)} × 2.5 percentage points − ${Math.max(0, charisma)} × 0.02 percentage points = ${percent(rawChance)}${chance !== rawChance ? `, limited to ${percent(chance)}` : ""}`,
        ],
      };
    },
  };
}
