import type { RespawnInfo } from "$lib/types/respawn";
import { formatDuration } from "./format";

/**
 * Display names for special spawn types
 */
export const SPAWN_TYPE_DISPLAY: Record<string, string> = {
  altar: "Altar",
  summon: "Blocked",
  placeholder: "On Death",
};

/**
 * Format respawn time from RespawnInfo (death_time + respawn_time)
 */
export function formatRespawnTime(info: RespawnInfo): string {
  if (info.no_respawn) return "-";
  const totalSeconds = info.death_time + info.respawn_time;
  return formatDuration(totalSeconds);
}

/**
 * Format respawn probability as percentage
 */
export function formatRespawnChance(info: RespawnInfo): string {
  if (info.no_respawn) return "-";
  if (info.respawn_probability === 1) return "-";
  return `${Math.round(info.respawn_probability * 100)}%`;
}

/**
 * Format special spawn conditions (time windows, altar, summon, placeholder)
 */
export function formatSpecialSpawn(info: RespawnInfo): string {
  if (info.spawn_time_start !== 0 || info.spawn_time_end !== 0) {
    return `${info.spawn_time_start}:00-${info.spawn_time_end}:00`;
  }
  if (info.special_spawn_type) {
    return (
      SPAWN_TYPE_DISPLAY[info.special_spawn_type] ?? info.special_spawn_type
    );
  }
  return "-";
}
