export type TrapType = "disarmable" | "dangerous_ground" | "wall_trap";

/** Display labels for the three trap kinds exported by TrapExporter. */
export const TRAP_TYPE_LABELS: Record<TrapType, string> = {
  disarmable: "Disarmable Trap",
  dangerous_ground: "Dangerous Ground",
  wall_trap: "Wall Trap",
};

/** Visitor-facing mechanics summary for each exported trap kind. */
export const TRAP_TYPE_DESCRIPTIONS: Record<TrapType, string> = {
  disarmable: "A contact trap activates when you step on it.",
  dangerous_ground:
    "The hazard triggers once per second while you stand in its area.",
  wall_trap: "The wall trap fires into its area and can damage players inside.",
};
