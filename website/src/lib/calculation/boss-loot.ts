export interface BossLootOutcome {
  item_id: string;
  counts_as_equipment: boolean;
}

export interface BossLootDrop extends BossLootOutcome {
  item_name: string;
  probability: number;
  requires_quest: boolean;
  random_items?: readonly BossLootOutcome[];
}

export interface BossLootOptions {
  // True only when a matching dungeon Fatecharm is consumed for this kill.
  fatecharm?: boolean;
  // Items needed by the qualifying player or a nearby party member's gather quest.
  neededQuestItemIds?: ReadonlySet<string>;
}

interface State {
  equipment: number;
  counts: number[];
  probability: number;
}

interface Outcome {
  probability: number;
  equipment: number;
  register: boolean;
}

// Source: server-scripts/Monster.cs:2997-3062,3418-3436,4176-4285,4343-4373 -
// independent template rolls precede up to 100 weighted equipment top-up attempts.
// Returns the chance of at least one copy, not an expected item count. Supply
// monsters.loot_inputs, never the altar-expanded display drops. The baseline
// assumes no matching Fatecharm and no qualifying gather quest unless specified.
export function calculateBossLootChance(
  drops: readonly BossLootDrop[],
  itemId: string,
  options: BossLootOptions = {},
): number {
  const minimum = options.fatecharm ? 2 : 1;
  const needed = options.neededQuestItemIds;
  const groups: Array<{
    itemId: string;
    weight: number;
    cap: number;
    quest: boolean;
  }> = [];
  const indices = new Map<string, number>();
  for (const drop of drops) {
    if (!Number.isFinite(drop.probability) || drop.probability < 0)
      throw new Error("Boss drop probability must be finite and nonnegative");
    if (!drop.counts_as_equipment) continue;
    const index = indices.get(drop.item_name);
    if (index === undefined) {
      indices.set(drop.item_name, groups.length);
      groups.push({
        itemId: drop.item_id,
        weight: drop.probability,
        cap: 1,
        quest: drop.requires_quest,
      });
    } else {
      groups[index].weight += drop.probability;
      groups[index].cap++;
    }
  }
  const canTopUpTarget = groups.some(
    (group) =>
      group.itemId === itemId && (!group.quest || needed?.has(group.itemId)),
  );

  let states: State[] = [
    { equipment: 0, counts: groups.map(() => 0), probability: 1 },
  ];
  let initialMiss = 1;
  for (const drop of drops) {
    const chance = Math.min(1, drop.probability);
    const outcomes: Outcome[] = [
      { probability: 1 - chance, equipment: 0, register: false },
    ];
    const group = indices.get(drop.item_name);
    const acceptsQuest = !drop.requires_quest || needed?.has(drop.item_id);
    if (!acceptsQuest) {
      outcomes[0].probability += chance;
    } else if (!drop.requires_quest && drop.random_items !== undefined) {
      const pool = drop.random_items;
      if (pool.length === 0) outcomes[0].probability += chance;
      for (const item of pool) {
        if (item.item_id !== itemId)
          outcomes.push({
            probability: chance / pool.length,
            equipment: Number(item.counts_as_equipment),
            register: true,
          });
      }
    } else if (drop.item_id !== itemId) {
      outcomes.push({
        probability: chance,
        // Quest-gated items return before the equipment counter is updated.
        equipment: Number(drop.counts_as_equipment && !drop.requires_quest),
        register: true,
      });
    }
    initialMiss *= outcomes.reduce(
      (sum, outcome) => sum + outcome.probability,
      0,
    );
    if (!canTopUpTarget) continue;
    const next = new Map<string, State>();
    for (const state of states) {
      for (const outcome of outcomes) {
        const probability = state.probability * outcome.probability;
        const equipment = state.equipment + outcome.equipment;
        if (probability === 0 || equipment >= minimum) continue;
        const counts =
          outcome.register && group !== undefined
            ? state.counts.slice()
            : state.counts;
        if (outcome.register && group !== undefined) counts[group]++;
        const key = `${equipment}:${counts.join(",")}`;
        const existing = next.get(key);
        if (existing) existing.probability += probability;
        else next.set(key, { equipment, counts, probability });
      }
    }
    states = [...next.values()];
  }
  if (!canTopUpTarget) return Math.max(0, Math.min(1, 1 - initialMiss));

  const memo = new Map<string, number>();
  function topUp(
    equipment: number,
    counts: number[],
    attempts: number,
  ): number {
    if (equipment >= minimum || attempts === 100) return 0;
    const key = `${equipment}:${attempts}:${counts.join(",")}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let weight = 0;
    for (let index = 0; index < groups.length; index++) {
      if (counts[index] < groups[index].cap) weight += groups[index].weight;
    }
    if (weight === 0) return 0;
    let chance = 0;
    for (let index = 0; index < groups.length; index++) {
      const group = groups[index];
      if (counts[index] >= group.cap || group.weight === 0) continue;
      let selectedChance: number;
      if (group.quest && !needed?.has(group.itemId)) {
        // Failed quest-gated attempts consume the same 100-attempt budget.
        selectedChance = topUp(equipment, counts, attempts + 1);
      } else if (group.itemId === itemId) {
        selectedChance = 1;
      } else {
        const nextCounts = counts.slice();
        nextCounts[index]++;
        selectedChance = topUp(
          equipment + Number(!group.quest),
          nextCounts,
          attempts + 1,
        );
      }
      chance += (group.weight / weight) * selectedChance;
    }
    memo.set(key, chance);
    return chance;
  }

  // A name's initial successes cannot exceed its number of template rows, so
  // duplicate caps only constrain the weighted top-ups, not the initial rolls.
  let chance = 1 - initialMiss;
  for (const state of states)
    chance += state.probability * topUp(state.equipment, state.counts, 0);
  return Math.max(0, Math.min(1, chance));
}
