export type TrapType = "disarmable" | "dangerous_ground" | "wall_trap";

/** Display labels for the three trap kinds exported by TrapExporter. */
export const TRAP_TYPE_LABELS: Record<TrapType, string> = {
  disarmable: "Disarmable Trap",
  dangerous_ground: "Dangerous Ground",
  wall_trap: "Wall Trap",
};
