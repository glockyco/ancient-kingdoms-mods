import { describe, expect, it } from "vitest";
import type { RespawnInfo } from "$lib/types/respawn";
import { requireLinearValue, linearAt } from "./linear-value";
import { parseLinear } from "./parseLinear";
import {
  formatRespawnTime,
  formatRespawnChance,
  formatSpecialSpawn,
} from "./respawn";

const spawn: RespawnInfo = {
  no_respawn: false,
  death_time: 0,
  respawn_time: 0,
  respawn_probability: 1,
  spawn_time_start: 0,
  spawn_time_end: 0,
  special_spawn_type: null,
};

describe("linear progression and respawn boundaries", () => {
  // Source: server-scripts/LinearInt.cs:Get and LinearFloat.cs:Get.
  it("keeps negative and zero coefficients through level progression", () => {
    const value = requireLinearValue(
      '{"base_value":-2,"bonus_per_level":3}',
      "damage",
    );
    expect(linearAt(value, 1)).toBe(-2);
    expect(linearAt(value, 2)).toBe(1);
    expect(linearAt(value, 0)).toBe(-5);
    expect(
      linearAt(
        requireLinearValue({ base_value: 0, bonus_per_level: -0.5 }, "bonus"),
        3,
      ),
    ).toBe(-1);
    expect(() => requireLinearValue(undefined, "damage")).toThrow();
    expect(() => requireLinearValue('{"base_value":1}', "damage")).toThrow();
  });

  it("omits all-zero optional values without omitting negative progression", () => {
    expect(parseLinear('{"base_value":0,"bonus_per_level":0}')).toBeNull();
    expect(parseLinear('{"base_value":0,"bonus_per_level":-2}')).toEqual({
      base_value: 0,
      bonus_per_level: -2,
    });
    expect(parseLinear('{"base_value":-1,"bonus_per_level":0}')).toEqual({
      base_value: -1,
      bonus_per_level: 0,
    });
    expect(parseLinear("broken")).toBeNull();
    expect(parseLinear(null)).toBeNull();
  });

  it("formats zero, negative, timed and blocked respawns", () => {
    expect(formatRespawnTime(spawn)).toBe("-");
    expect(formatRespawnTime({ ...spawn, respawn_time: -2 })).toBe("-");
    expect(formatRespawnTime({ ...spawn, respawn_time: 90 })).toBe("1m");
    expect(
      formatRespawnTime({ ...spawn, no_respawn: true, respawn_time: 90 }),
    ).toBe("-");
    expect(formatRespawnChance(spawn)).toBe("-");
    expect(formatRespawnChance({ ...spawn, respawn_probability: 0 })).toBe(
      "0%",
    );
    expect(formatRespawnChance({ ...spawn, respawn_probability: 0.125 })).toBe(
      "13%",
    );
    expect(
      formatRespawnChance({
        ...spawn,
        no_respawn: true,
        respawn_probability: 0.5,
      }),
    ).toBe("-");
    expect(
      formatSpecialSpawn({ ...spawn, spawn_time_start: 20, spawn_time_end: 2 }),
    ).toBe("20:00-2:00");
    expect(formatSpecialSpawn({ ...spawn, special_spawn_type: "summon" })).toBe(
      "Blocked",
    );
  });
});
