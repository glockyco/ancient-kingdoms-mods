import type { ColumnDef } from "$lib/components/ui/data-table";
import type { RespawnInfo } from "$lib/types/respawn";

/**
 * Creates respawn-related column definitions for monster tables.
 * These columns work with any type that extends RespawnInfo.
 */
export function createRespawnColumns<T extends RespawnInfo>(): ColumnDef<T>[] {
  return [
    {
      id: "respawn_time",
      header: "Respawn",
      size: 120,
      accessorFn: (row) => {
        if (row.no_respawn) return null;
        return row.respawn_time === 0 ? null : row.respawn_time;
      },
      sortUndefined: "last",
      enableGlobalFilter: false,
    },
    {
      id: "respawn_chance",
      header: "Chance",
      size: 110,
      accessorFn: (row) =>
        row.respawn_probability === 1 ? -1 : row.respawn_probability,
      enableGlobalFilter: false,
    },
    {
      id: "special",
      header: "Special",
      size: 120,
      accessorFn: (row) => {
        if (row.spawn_time_start !== 0 || row.spawn_time_end !== 0) {
          return `${row.spawn_time_start}:00-${row.spawn_time_end}:00`;
        }
        if (row.special_spawn_type === "altar") return "Altar";
        if (row.special_spawn_type === "summon") return "Blocked";
        if (row.special_spawn_type === "placeholder") return "On Death";
        return "";
      },
      sortingFn: (rowA, rowB) => {
        const order = (row: RespawnInfo) => {
          if (row.spawn_time_start !== 0 || row.spawn_time_end !== 0) return 1;
          if (row.special_spawn_type === "altar") return 2;
          if (row.special_spawn_type === "summon") return 3;
          if (row.special_spawn_type === "placeholder") return 4;
          return 0;
        };
        return order(rowA.original) - order(rowB.original);
      },
    },
  ];
}

/**
 * Column IDs that should be right-aligned in headers and cells
 */
export const NUMERIC_COLUMN_IDS = [
  "level",
  "health",
  "damage",
  "magic_damage",
  "defense",
  "magic_resist",
  "poison_resist",
  "fire_resist",
  "cold_resist",
  "disease_resist",
  "spawn_count",
  "respawn_time",
  "respawn_chance",
  "special",
] as const;

/**
 * Column IDs for respawn-related columns
 */
export const RESPAWN_COLUMN_IDS = [
  "respawn_time",
  "respawn_chance",
  "special",
] as const;

export function isRespawnColumn(columnId: string): boolean {
  return (RESPAWN_COLUMN_IDS as readonly string[]).includes(columnId);
}

export function isNumericColumn(columnId: string): boolean {
  return (NUMERIC_COLUMN_IDS as readonly string[]).includes(columnId);
}
