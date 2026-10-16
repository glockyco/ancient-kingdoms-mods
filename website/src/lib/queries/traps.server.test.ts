import { describe, expect, it } from "vitest";
import { groupPositionlessTraps, type TrapListView } from "./traps.server";

function trap(overrides: Partial<TrapListView>): TrapListView {
  return {
    id: "trap",
    name: "Spikes",
    type: "disarmable",
    zone_id: "zone",
    zone_name: "Zone",
    is_dungeon: true,
    effect_skill_id: null,
    effect_skill_name: null,
    has_teleport: false,
    teleport_zone_id: null,
    teleport_zone_name: null,
    position_x: null,
    position_y: null,
    fire_interval: null,
    ...overrides,
  };
}

describe("groupPositionlessTraps", () => {
  it("merges only identical traps that lack a position", () => {
    const rows = groupPositionlessTraps([
      trap({ id: "a" }),
      trap({ id: "b" }),
      trap({ id: "c", effect_skill_id: "poison" }),
      trap({ id: "d", position_x: 1, position_y: 2 }),
      trap({ id: "e", position_x: 1, position_y: 2 }),
    ]);

    expect(rows.map((row) => [row.id, row.count])).toEqual([
      ["a", 2],
      ["c", 1],
      ["d", 1],
      ["e", 1],
    ]);
  });
});
