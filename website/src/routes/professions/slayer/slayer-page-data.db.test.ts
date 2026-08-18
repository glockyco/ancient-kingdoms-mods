import { describe, expect, test } from "vitest";
import { getSlayerPageData } from "./slayer-page-data.server";

describe("Slayer page data", () => {
  test("loads the complete account-wide target set", () => {
    const data = getSlayerPageData();

    expect(data.profession.id).toBe("slayer");
    expect(data.targets).toHaveLength(144);
    expect(data.targets.filter((target) => target.is_boss)).toHaveLength(77);
    expect(data.targets.filter((target) => target.is_elite)).toHaveLength(67);
    expect(data.targets.filter((target) => target.is_world_boss)).toHaveLength(
      6,
    );
    expect(data.targets.filter((target) => target.is_fabled)).toHaveLength(9);
    expect(
      data.targets.filter(
        (target) => target.position_x !== null && target.position_y !== null,
      ),
    ).toHaveLength(130);
  });

  test("preserves regular, summon, altar, and replacement requirements", () => {
    const data = getSlayerPageData();
    const target = (id: string) =>
      data.targets.find((entry) => entry.id === id);

    expect(target("nyxarion")).toMatchObject({ spawn_type: "regular" });
    expect(target("ancient_elemental")).toMatchObject({
      spawn_type: "summon",
      source_summon_kill_monster_name: "Water Elemental",
      source_summon_kill_count: 8,
    });
    expect(target("avatar_of_war")).toMatchObject({
      spawn_type: "altar",
      source_altar_wave: 2,
      source_altar_activation_item_name: "Glowing Spine of War",
    });
    expect(target("keeper_remnant")).toMatchObject({
      spawn_type: "placeholder",
      source_monster_name: "Large Shade Beast",
      source_spawn_probability: 1,
    });
  });
});
