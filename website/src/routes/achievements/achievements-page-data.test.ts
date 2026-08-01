import { describe, expect, it } from "vitest";
import {
  achievementGroupOrder,
  getAchievementsPageData,
} from "./achievements-page-data.server";

function findAchievement(id: string) {
  const data = getAchievementsPageData();
  const achievement = data.groups
    .flatMap((group) => group.achievements)
    .find((item) => item.id === id);
  if (!achievement) {
    throw new Error(`Achievement ${id} is unavailable`);
  }
  return achievement;
}

describe("achievements page data", () => {
  it("returns all achievements in six stable groups", () => {
    const data = getAchievementsPageData();

    expect(data.total).toBe(38);
    expect(data.groups.map((group) => group.id)).toEqual(achievementGroupOrder);
    expect(
      data.groups.reduce(
        (total, group) => total + group.achievements.length,
        0,
      ),
    ).toBe(38);
  });

  it("keeps Steam display order and stable anchors", () => {
    const achievements = getAchievementsPageData().groups.flatMap(
      (group) => group.achievements,
    );
    const byDisplayOrder = [...achievements].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    );

    expect(byDisplayOrder[0].id).toBe("TREASURE_HUNTER");
    expect(byDisplayOrder[0].anchor).toBe("treasure-hunter");
    expect(new Set(achievements.map((item) => item.anchor)).size).toBe(38);
  });

  it("links exact professions, quests, and bosses", () => {
    expect(findAchievement("MINING_MASTER").relationships).toContainEqual({
      kind: "profession",
      label: "Mining",
      href: "/professions/mining",
    });
    expect(findAchievement("PLANESWALKER").relationships).toContainEqual({
      kind: "quest",
      label: "Ascension",
      href: "/quests/40_ascension",
    });
    expect(
      findAchievement("KILL_ANCIENT_CYCLOPS").relationships,
    ).toContainEqual({
      kind: "monster",
      label: "Ancient Cyclops",
      href: "/monsters/ancient_cyclops",
    });
  });

  it("omits a relationship when the source has no single target", () => {
    expect(findAchievement("KILL_WORLD_BOSSES").relationships).toEqual([]);
  });
});
