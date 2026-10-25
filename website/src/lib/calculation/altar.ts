import { iround } from "$lib/calculation/unity-math";
import { formatRange } from "$lib/utils/format";

export type AltarRewardTier = "common" | "magic" | "epic" | "legendary";

export interface AltarThresholds {
  magic_reward_threshold: number | null;
  epic_reward_threshold: number | null;
  legendary_reward_threshold: number | null;
}

function thresholds(altar: AltarThresholds): number[] {
  return [
    "magic_reward_threshold",
    "epic_reward_threshold",
    "legendary_reward_threshold",
  ].map((field) => {
    const value = altar[field as keyof AltarThresholds];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Missing altar field: ${field}`);
    }
    return value;
  });
}

// Source: server-scripts/DefaultEvent.cs:209-217 — wave scaling adds the veteran point bonus with midpoint-to-even rounding.
export function altarVeteranLevelBonus(totalVeteranPoints: number): number {
  return iround(totalVeteranPoints / 40);
}

// Source: server-scripts/DefaultEvent.cs:231-237 — reward tiers compare level plus total veteran points with the altar thresholds.
export function altarRewardTier(
  level: number,
  totalVeteranPoints: number,
  altar: AltarThresholds,
): AltarRewardTier {
  const [magic, epic, legendary] = thresholds(altar);
  const score = level + totalVeteranPoints;
  if (score >= legendary) return "legendary";
  if (score >= epic) return "epic";
  if (score >= magic) return "magic";
  return "common";
}

export function formatAltarRequirement(
  tier: AltarRewardTier,
  altar: AltarThresholds,
  levelCap: number,
): string {
  if (!Number.isInteger(levelCap) || levelCap < 1)
    throw new Error("Missing progression_rules.max_level");
  const bounds = thresholds(altar);
  if (tier === "common" && bounds[0] <= levelCap)
    return `Below level ${bounds[0]}`;
  const index = ["common", "magic", "epic", "legendary"].indexOf(tier);
  const lower = index === 0 ? 1 : bounds[index - 1];
  const upper = index === 3 ? Infinity : bounds[index] - 1;
  if (upper < levelCap) {
    return lower === upper
      ? `Level ${lower}`
      : `Level ${formatRange(lower, upper)}`;
  }
  const minimumVeteran = Math.max(0, lower - levelCap);
  const veteranRange =
    upper === Infinity
      ? `${minimumVeteran} or more veteran points`
      : `${formatRange(minimumVeteran, upper - levelCap)} veteran points`;
  // Source: server-scripts/Experience.cs:49-51 — veteran points are earned only at the level cap.
  if (tier === "common")
    return `Below level ${levelCap}, or level ${levelCap} with ${veteranRange}`;
  if (lower >= levelCap) return `Level ${levelCap}, ${veteranRange}`;
  return `Level ${formatRange(lower, levelCap - 1)}, or level ${levelCap} with ${veteranRange}`;
}

/** The compact tier label used in source lists, such as "Lv 40 - 49" or "Lv 50, Vet 0 - 99". */
export function formatAltarRewardTier(
  tier: AltarRewardTier,
  altar: AltarThresholds,
  levelCap: number,
): string {
  const magic = altar.magic_reward_threshold;
  const epic = altar.epic_reward_threshold;
  const legendary = altar.legendary_reward_threshold;
  if (magic === null || epic === null || legendary === null)
    throw new Error("Missing altar reward thresholds");
  if (tier === "common") return `Lv < ${magic}`;
  const lower = tier === "magic" ? magic : tier === "epic" ? epic : legendary;
  const upper =
    tier === "magic" ? epic - 1 : tier === "epic" ? legendary - 1 : Infinity;
  if (upper < levelCap)
    return lower === upper ? `Lv ${lower}` : `Lv ${formatRange(lower, upper)}`;
  const levels =
    lower < levelCap ? formatRange(lower, levelCap) : String(levelCap);
  const veterans =
    upper === Infinity
      ? `${Math.max(0, lower - levelCap)}+`
      : formatRange(Math.max(0, lower - levelCap), upper - levelCap);
  return `Lv ${levels}, Vet ${veterans}`;
}
