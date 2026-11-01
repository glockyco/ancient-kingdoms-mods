#nullable disable
using System;
using System.Collections.Generic;

namespace PocketCompendium.Features.BestiaryPages.Model;

public sealed class DropOutcome
{
    public string ItemId { get; init; } = "";
    public bool CountsAsEquipment { get; init; }
}

public sealed class DropEntry
{
    public string ItemId { get; init; } = "";
    // Boss duplicate caps use ScriptableItem.nameItem, not a localized display name.
    public string ItemName { get; init; } = "";
    public double Probability { get; init; }
    public bool CountsAsEquipment { get; init; }
    public bool RequiresQuest { get; init; }
    // Null is a direct item. An empty array is a random item that awards nothing.
    public DropOutcome[] RandomItems { get; init; }
}

public static class DropChanceCalculator
{
    private sealed class Group
    {
        public string ItemId = "";
        public double Weight;
        public int Cap;
        public bool Quest;
    }

    private readonly record struct Outcome(double Probability, int Equipment, bool Register);

    // Arrays are immutable once used as keys. Structural keys avoid allocating strings per state.
    private readonly struct State : IEquatable<State>
    {
        public readonly int Equipment;
        public readonly int[] Counts;
        private readonly int _attempts;

        public State(int equipment, int[] counts, int attempts = 0)
        {
            Equipment = equipment;
            Counts = counts;
            _attempts = attempts;
        }

        public bool Equals(State other)
        {
            if (Equipment != other.Equipment || _attempts != other._attempts || Counts.Length != other.Counts.Length)
                return false;
            for (var i = 0; i < Counts.Length; i++)
                if (Counts[i] != other.Counts[i]) return false;
            return true;
        }

        public override bool Equals(object obj) => obj is State other && Equals(other);

        public override int GetHashCode()
        {
            var hash = new HashCode();
            hash.Add(Equipment);
            hash.Add(_attempts);
            foreach (var count in Counts) hash.Add(count);
            return hash.ToHashCode();
        }
    }

    // Chance of at least one copy per kill. A matching consumed Fatecharm only affects bosses.
    public static double Calculate(
        IReadOnlyList<DropEntry> drops,
        string itemId,
        bool isBoss,
        bool fatecharm = false,
        IReadOnlySet<string> neededQuestItemIds = null)
    {
        return isBoss
            ? BossChance(drops, itemId, fatecharm, neededQuestItemIds)
            : IndependentChance(drops, itemId, neededQuestItemIds);
    }

    private static double IndependentChance(
        IReadOnlyList<DropEntry> drops, string itemId, IReadOnlySet<string> needed)
    {
        var miss = 1d;
        foreach (var drop in drops)
        {
            if (drop.RequiresQuest && !(needed?.Contains(drop.ItemId) ?? false)) continue;
            var contribution = drop.ItemId == itemId ? 1d : 0d;
            if (drop.RandomItems is { } pool)
            {
                var matches = 0;
                foreach (var outcome in pool)
                    if (outcome.ItemId == itemId) matches++;
                contribution = pool.Length == 0 ? 0 : (double)matches / pool.Length;
            }
            miss *= 1 - Math.Min(1, drop.Probability) * contribution;
        }
        return 1 - miss;
    }

    // Port of website/src/lib/calculation/boss-loot.ts. Initial independent rolls
    // precede at most 100 weighted top-ups, with per-name duplicate caps.
    private static double BossChance(
        IReadOnlyList<DropEntry> drops, string itemId, bool fatecharm, IReadOnlySet<string> needed)
    {
        var minimum = fatecharm ? 2 : 1;
        var groups = new List<Group>();
        var indices = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var drop in drops)
        {
            if (!double.IsFinite(drop.Probability) || drop.Probability < 0)
                throw new ArgumentOutOfRangeException(nameof(drops), "Boss drop probability must be finite and nonnegative.");
            if (!drop.CountsAsEquipment) continue;
            if (!indices.TryGetValue(drop.ItemName, out var index))
            {
                indices.Add(drop.ItemName, groups.Count);
                groups.Add(new Group
                {
                    ItemId = drop.ItemId, Weight = drop.Probability, Cap = 1, Quest = drop.RequiresQuest,
                });
            }
            else
            {
                groups[index].Weight += drop.Probability;
                groups[index].Cap++;
            }
        }
        var canTopUpTarget = false;
        foreach (var group in groups)
            if (group.ItemId == itemId && (!group.Quest || (needed?.Contains(group.ItemId) ?? false)))
                canTopUpTarget = true;

        var states = canTopUpTarget
            ? new Dictionary<State, double> { [new State(0, new int[groups.Count])] = 1 }
            : null;
        var outcomes = new List<Outcome>();
        var initialMiss = 1d;
        foreach (var drop in drops)
        {
            var chance = Math.Min(1, drop.Probability);
            outcomes.Clear();
            var miss = 1 - chance;
            var acceptsQuest = !drop.RequiresQuest || (needed?.Contains(drop.ItemId) ?? false);
            if (!acceptsQuest)
                miss += chance;
            else if (!drop.RequiresQuest && drop.RandomItems is { } pool)
            {
                if (pool.Length == 0) miss += chance;
                foreach (var item in pool)
                    if (item.ItemId != itemId)
                        outcomes.Add(new Outcome(chance / pool.Length, item.CountsAsEquipment ? 1 : 0, true));
            }
            else if (drop.ItemId != itemId)
                outcomes.Add(new Outcome(chance, drop.CountsAsEquipment && !drop.RequiresQuest ? 1 : 0, true));
            outcomes.Add(new Outcome(miss, 0, false));
            var totalMiss = 0d;
            foreach (var outcome in outcomes) totalMiss += outcome.Probability;
            initialMiss *= totalMiss;
            if (!canTopUpTarget) continue;

            var next = new Dictionary<State, double>();
            var hasGroup = indices.TryGetValue(drop.ItemName, out var groupIndex);
            foreach (var pair in states)
                foreach (var outcome in outcomes)
                {
                    var probability = pair.Value * outcome.Probability;
                    var equipment = pair.Key.Equipment + outcome.Equipment;
                    if (probability == 0 || equipment >= minimum) continue;
                    var counts = pair.Key.Counts;
                    if (outcome.Register && hasGroup)
                    {
                        counts = (int[])counts.Clone();
                        counts[groupIndex]++;
                    }
                    var key = new State(equipment, counts);
                    next.TryGetValue(key, out var existing);
                    next[key] = existing + probability;
                }
            states = next;
        }
        if (!canTopUpTarget) return Math.Clamp(1 - initialMiss, 0, 1);

        var memo = new Dictionary<State, double>();
        double TopUp(int equipment, int[] counts, int attempts)
        {
            if (equipment >= minimum || attempts == 100) return 0;
            var key = new State(equipment, counts, attempts);
            if (memo.TryGetValue(key, out var cached)) return cached;
            var weight = 0d;
            for (var i = 0; i < groups.Count; i++)
                if (counts[i] < groups[i].Cap) weight += groups[i].Weight;
            if (weight == 0) return 0;
            var chance = 0d;
            for (var i = 0; i < groups.Count; i++)
            {
                var group = groups[i];
                if (counts[i] >= group.Cap || group.Weight == 0) continue;
                double selectedChance;
                if (group.Quest && !(needed?.Contains(group.ItemId) ?? false))
                    selectedChance = TopUp(equipment, counts, attempts + 1);
                else if (group.ItemId == itemId)
                    selectedChance = 1;
                else
                {
                    var nextCounts = (int[])counts.Clone();
                    nextCounts[i]++;
                    selectedChance = TopUp(equipment + (group.Quest ? 0 : 1), nextCounts, attempts + 1);
                }
                chance += group.Weight / weight * selectedChance;
            }
            memo.Add(key, chance);
            return chance;
        }

        var result = 1 - initialMiss;
        foreach (var pair in states)
            result += pair.Value * TopUp(pair.Key.Equipment, pair.Key.Counts, 0);
        return Math.Clamp(result, 0, 1);
    }
}
