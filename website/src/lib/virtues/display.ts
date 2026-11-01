// How pages name a virtue and state its blessing. The numbers come from the
// rules module and the exported Humility multipliers.

import {
  compassionHealingBonus,
  honestyGainBonus,
  honorAccuracyBonus,
  honorCriticalResistBonus,
  sacrificeHealthBonus,
  valorDamageBonus,
  type VirtueId,
} from "$lib/calculation/virtues";

export interface VirtueTone {
  ring: string;
  /** The border an unchosen tile takes on hover. */
  hover: string;
  text: string;
  soft: string;
}

export const VIRTUE_TONES: Record<VirtueId, VirtueTone> = {
  compassion: {
    ring: "ring-rose-500/60",
    hover: "hover:border-rose-500/60",
    text: "text-rose-400",
    soft: "bg-rose-500/10",
  },
  honor: {
    ring: "ring-amber-500/60",
    hover: "hover:border-amber-500/60",
    text: "text-amber-400",
    soft: "bg-amber-500/10",
  },
  sacrifice: {
    ring: "ring-red-500/60",
    hover: "hover:border-red-500/60",
    text: "text-red-400",
    soft: "bg-red-500/10",
  },
  humility: {
    ring: "ring-sky-500/60",
    hover: "hover:border-sky-500/60",
    text: "text-sky-400",
    soft: "bg-sky-500/10",
  },
  honesty: {
    ring: "ring-violet-500/60",
    hover: "hover:border-violet-500/60",
    text: "text-violet-400",
    soft: "bg-violet-500/10",
  },
  valor: {
    ring: "ring-orange-500/60",
    hover: "hover:border-orange-500/60",
    text: "text-orange-400",
    soft: "bg-orange-500/10",
  },
};

/** What a blessing's rank values apply to, after the value: "+4% healing received". */
export const BLESSING_UNITS: Record<VirtueId, string> = {
  compassion: "healing received",
  honor: "Critical Resist and Accuracy",
  sacrifice: "maximum Health",
  humility: "Armor Class and resistances",
  honesty: "positive faction gains",
  valor: "damage to elites and bosses",
};

/** The section of the Virtues page that explains a virtue. */
export function virtueHref(virtue: VirtueId): string {
  return `/mechanics/virtues#${virtue}`;
}

/** The blessing icon the game shows for a virtue. */
export function blessingIcon(virtue: VirtueId): string {
  return `/images/skills/blessing_of_${virtue}/icon.webp`;
}

function signedPercent(fraction: number): string {
  const value = Math.round(fraction * 1000) / 10;
  return `${value < 0 ? "\u2212" : "+"}${Math.abs(value)}%`;
}

export interface RankEffect {
  /** The value the rank cards show large. */
  value: string;
  /** A second effect of the same rank. */
  extra?: string;
  /** Whether the rank weakens the character. */
  negative: boolean;
}

/** A rank's blessing as the rank cards state it. Humility reads its exported multiplier. */
export function rankEffect(
  virtue: VirtueId,
  rank: number,
  humilityMultiplier: number,
): RankEffect {
  switch (virtue) {
    case "compassion":
      return {
        value: signedPercent(compassionHealingBonus(rank)),
        negative: false,
      };
    case "honor":
      return {
        value: signedPercent(honorCriticalResistBonus(rank)),
        extra: `+${Math.round(honorAccuracyBonus(rank) * 1000) / 10} Accuracy`,
        negative: false,
      };
    case "sacrifice":
      return {
        value: signedPercent(sacrificeHealthBonus(rank)),
        negative: false,
      };
    case "humility":
      return {
        value: signedPercent(humilityMultiplier - 1),
        negative: humilityMultiplier < 1,
      };
    case "honesty":
      return { value: signedPercent(honestyGainBonus(rank)), negative: false };
    case "valor":
      return { value: signedPercent(valorDamageBonus(rank)), negative: false };
  }
}

/**
 * A blessing's strongest effect in one line, such as "Up to +10% healing received".
 */
export function blessingSummary(
  virtue: VirtueId,
  maxRank: number,
  humilityMultipliers: readonly number[],
): string {
  const top = rankEffect(virtue, maxRank, humilityMultipliers[maxRank]);
  switch (virtue) {
    case "honor":
      return `Up to ${top.extra} and ${top.value} Critical Resist`;
    case "honesty":
      return `Up to ${top.value} faction gains`;
    default:
      return `Up to ${top.value} ${BLESSING_UNITS[virtue]}`;
  }
}

// Source: server-scripts/VirtueRules.cs:MaxRank — ranks run from 0 to 5.
const TOP_RANK = 5;

/** A blessing's bonus from rank 0 to the top rank, such as "0.5% to 5%". */
export function bonusRange(bonus: (rank: number) => number): string {
  const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10}%`;
  return `${percent(bonus(0))} to ${percent(bonus(TOP_RANK))}`;
}
