export type TrapType = "disarmable" | "dangerous_ground" | "wall_trap";

/** Display labels for the three trap kinds exported by TrapExporter. */
export const TRAP_TYPE_LABELS: Record<TrapType, string> = {
  disarmable: "Disarmable Trap",
  dangerous_ground: "Dangerous Ground",
  wall_trap: "Wall Trap",
};

/** Visitor-facing mechanics summary for each exported trap kind. */
export const TRAP_TYPE_DESCRIPTIONS: Record<TrapType, string> = {
  disarmable: "Contact trap.",
  dangerous_ground: "Area hazard. Reapplies once per second while occupied.",
  wall_trap: "Direct-damage wall trap.",
};
