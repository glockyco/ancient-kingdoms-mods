import { formatPercent } from "$lib/utils/format";
import type { RespawnInfo } from "$lib/types/respawn";
import { formatDuration } from "./format";

/**
 * Display names for special spawn types
 */
export const SPAWN_TYPE_DISPLAY: Record<string, string> = {
  altar: "Altar",
  summon: "Guards must die",
  placeholder: "Spawned by another monster's death",
};

/**
 * Format respawn time from RespawnInfo
 */
export function formatRespawnTime(info: RespawnInfo): string {
  if (info.no_respawn) return "-";
  return formatDuration(info.respawn_time);
}

/**
 * Format respawn probability as percentage
 */
export function formatRespawnChance(info: RespawnInfo): string {
  if (info.no_respawn) return "-";
  return formatPercent(info.respawn_probability, { decimals: 0 });
}

/**
 * Format special spawn conditions (time windows, altar, summon, placeholder)
 */
export function formatSpecialSpawn(info: RespawnInfo): string {
  if (info.spawn_time_start !== 0 || info.spawn_time_end !== 0) {
    return `${info.spawn_time_start}:00 to ${info.spawn_time_end}:00 game time`;
  }
  if (info.special_spawn_type) {
    return (
      SPAWN_TYPE_DISPLAY[info.special_spawn_type] ?? info.special_spawn_type
    );
  }
  return "-";
}
