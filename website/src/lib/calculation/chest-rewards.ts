export interface ChestReward {
  item_id: string;
  item_name: string;
  roll_order: number;
  roll_chance: number;
  scales_with_treasure_hunter: boolean | number;
}

export interface ChestDefinition<R extends ChestReward = ChestReward> {
  id: string;
  num_items: number;
  rewards: R[];
}

export type CalculatedChestReward<R extends ChestReward = ChestReward> = R & {
  open_chance: number;
};

const cache = new WeakMap<
  ChestDefinition,
  Map<number, CalculatedChestReward[]>
>();

// Source: server-scripts/ChestItem.cs:24-32,61-66 — ordered rolls award unique names until the item count or ten passes.
export function calculateChestRewards<R extends ChestReward>(
  chest: ChestDefinition<R>,
  skill: number,
): CalculatedChestReward<R>[] {
  let bySkill = cache.get(chest);
  const cached = bySkill?.get(skill);
  if (cached) return cached as CalculatedChestReward<R>[];
  if (!Number.isInteger(chest.num_items) || chest.num_items < 1)
    throw new Error(`Missing items.chest_num_items for ${chest.id}`);
  if (!Number.isFinite(skill) || skill < 0 || skill > 1)
    throw new Error("Treasure Hunter skill must be between 0 and 1");
  const rewards = [...chest.rewards].sort(
    (a, b) => a.roll_order - b.roll_order,
  );
  const names = new Map<string, number>();
  const nameIndices = rewards.map((reward) => {
    for (const field of [
      "item_id",
      "item_name",
      "roll_order",
      "roll_chance",
      "scales_with_treasure_hunter",
    ] as const) {
      if (reward[field] === null || reward[field] === undefined)
        throw new Error(`Missing chest_item_rewards.${field} for ${chest.id}`);
    }
    if (
      reward.roll_chance < 0 ||
      reward.roll_chance > 1 ||
      !Number.isFinite(reward.roll_chance)
    )
      throw new Error(`Invalid chest_item_rewards.roll_chance for ${chest.id}`);
    let index = names.get(reward.item_name);
    if (index === undefined) {
      index = names.size;
      names.set(reward.item_name, index);
    }
    return index;
  });
  // Source: server-scripts/ChestItem.cs:30 — flagged relic rolls gain Treasure Hunter skill times 0.1.
  const chances = rewards.map((reward) =>
    Math.min(
      1,
      reward.roll_chance +
        (reward.scales_with_treasure_hunter ? skill * 0.1 : 0),
    ),
  );
  const awarded = rewards.map(() => 0);
  const survival = new Float64Array(names.size).fill(1);
  const counts = new Float64Array(Math.min(chest.num_items, names.size));
  // First-success times are independent between names. A reward fits if fewer
  // than the chest's item count of other names succeeded before its first success.
  for (let pass = 0; pass < 10; pass++) {
    for (let index = 0; index < rewards.length; index++) {
      const nameIndex = nameIndices[index];
      const firstSuccess = survival[nameIndex] * chances[index];
      if (firstSuccess > 0) {
        counts.fill(0);
        counts[0] = 1;
        for (let other = 0; other < survival.length; other++) {
          if (other === nameIndex) continue;
          const failure = survival[other];
          for (let count = counts.length - 1; count >= 0; count--) {
            counts[count] =
              counts[count] * failure +
              (count > 0 ? counts[count - 1] * (1 - failure) : 0);
          }
        }
        let spaceAvailable = 0;
        for (const probability of counts) spaceAvailable += probability;
        awarded[index] += firstSuccess * spaceAvailable;
      }
      survival[nameIndex] *= 1 - chances[index];
    }
  }
  const result = rewards.map((reward, index) => ({
    ...reward,
    open_chance: awarded[index],
  }));
  if (!bySkill) {
    bySkill = new Map();
    cache.set(chest, bySkill);
  }
  bySkill.set(skill, result);
  return result;
}
