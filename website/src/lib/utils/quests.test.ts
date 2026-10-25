import { describe, expect, test } from "vitest";
import { shareRewardsGivenToEveryClass } from "./quests";

interface Reward {
  item: string;
  className: string | null;
}

const CLASSES = ["Bard", "Cleric", "Warrior"];
const share = (rewards: Reward[]) =>
  shareRewardsGivenToEveryClass(rewards, CLASSES, {
    key: (reward) => reward.item,
    className: (reward) => reward.className,
    shared: (reward) => ({ ...reward, className: null }),
  });
const forClasses = (item: string, classes: readonly string[]) =>
  classes.map((className) => ({ item, className }));

describe("shareRewardsGivenToEveryClass", () => {
  test("lists a reward every class receives once, as a shared reward", () => {
    expect(
      share([
        { item: "token_pack", className: null },
        ...forClasses("coin_pack", CLASSES),
      ]),
    ).toEqual([
      { item: "token_pack", className: null },
      { item: "coin_pack", className: null },
    ]);
  });

  test("keeps class rewards when one class receives something else", () => {
    const rewards = [
      ...forClasses("sword", ["Bard", "Warrior"]),
      { item: "staff", className: "Cleric" },
    ];
    expect(share(rewards)).toEqual(rewards);
  });
});
