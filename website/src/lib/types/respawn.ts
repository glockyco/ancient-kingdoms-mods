/**
 * Common respawn-related fields shared across monster types.
 * Used by MonsterListView (monsters overview) and ZoneMonster (zone detail).
 */
export interface RespawnInfo {
  no_respawn: boolean;
  death_time: number;
  respawn_time: number;
  respawn_probability: number;
  spawn_time_start: number;
  spawn_time_end: number;
  special_spawn_type: string | null;
}
