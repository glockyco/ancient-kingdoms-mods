using System.Collections.Generic;
using System.Linq;
using CombatVerification.Fixtures;
using DataExporter;

namespace CombatVerification.Tests
{
    /// <summary>
    /// Rules with known values, so a validator test states its own preconditions.
    /// The running game supplies the real implementation from its own definitions.
    /// </summary>
    internal sealed class SyntheticRules : IFixtureRules
    {
        public int MaxLevel { get; set; } = 50;
        public int MaxVeteranPoints { get; set; } = 200;
        public IReadOnlyCollection<string> AttributeNames { get; set; } =
            new[] { "strength", "constitution", "dexterity", "intelligence", "wisdom", "charisma" };
        public int OffhandSlot { get; set; } = 13;

        public Dictionary<string, string[]> Classes { get; } = new()
        {
            ["warrior"] = new[] { "Human", "Dwarf" },
            ["wizard"] = new[] { "Human", "Elf" },
            ["ranger"] = new[] { "Human", "Elf" },
            ["rogue"] = new[] { "Human", "Dark Elf" },
        };

        /// <summary>
        /// The slot table each archetype declares. Slot 13 differs by archetype in the game, so
        /// a double that shared one table would accept a fixture the game refuses, and refuse one
        /// the game accepts.
        /// </summary>
        public Dictionary<string, string[]> SlotTables { get; } = new()
        {
            ["warrior"] = SlotsWithOffhand("Shield"),
            ["wizard"] = SlotsWithOffhand("Shield"),
            ["ranger"] = SlotsWithOffhand("Bow"),
            ["rogue"] = SlotsWithOffhand("Weapon"),
        };

        private static string[] SlotsWithOffhand(string offhand) => new[]
        {
            "Head", "Ear", "Chest", "Legs", "Ring", "Hands", "Neck", "Ear", "Belt", "Feet",
            "Ring", "Artifact", "Weapon", offhand, "Bracers", "Charm",
        };

        public int EquipmentSlotCount(string archetype)
            => TableFor(archetype) is { } table ? table.Length : 0;

        public IReadOnlyCollection<int> SlotsAccepting(string archetype, string category)
        {
            var accepting = new List<int>();
            var table = TableFor(archetype);
            if (table is null || string.IsNullOrEmpty(category))
                return accepting;

            for (var index = 0; index < table.Length; index++)
            {
                if (!string.IsNullOrEmpty(table[index]) && category.StartsWith(table[index]))
                    accepting.Add(index);
            }

            return accepting;
        }

        private string[]? TableFor(string? archetypeId)
            => archetypeId != null && SlotTables.TryGetValue(archetypeId, out var table)
                ? table
                : null;

        public Dictionary<string, SkillRule> Skills { get; } = new();
        public Dictionary<string, ItemRule> Items { get; } = new();
        public HashSet<string> Augments { get; } = new() { "jagged_shard" };
        public HashSet<string> Consumables { get; } = new() { "roast_boar" };

        /// <summary>Levels grant one point each after the first.</summary>
        public int SkillPointsAtLevel(int level) => level < 1 ? 0 : level - 1;

        public int AllocatableAttributePoints(int level, int veteranPoints)
            => (level < 1 ? 0 : level - 1) + veteranPoints;

        public bool ClassExists(string classId)
            => classId != null && Classes.ContainsKey(classId);

        public bool TryGetSkill(string skillId, out SkillRule rule)
            => Skills.TryGetValue(skillId ?? string.Empty, out rule!);

        public bool TryGetItem(string itemId, out ItemRule rule)
            => Items.TryGetValue(itemId ?? string.Empty, out rule!);

        public bool AugmentExists(string augmentId)
            => augmentId != null && Augments.Contains(augmentId);

        public bool ConsumableExists(string itemId)
            => itemId != null && Consumables.Contains(itemId);

        // --- builders ---

        public SyntheticRules WithSkill(
            string name,
            int maxLevel = 5,
            bool veteran = false,
            string[]? classes = null,
            int[]? cumulativeCost = null,
            int requiredSpentPoints = 0,
            string? prerequisite = null,
            int prerequisiteLevel = 0)
        {
            Skills[GameIds.Sanitize(name)] = new SkillRule
            {
                Name = name,
                MaxLevel = maxLevel,
                IsVeteran = veteran,
                Classes = classes ?? System.Array.Empty<string>(),
                CumulativeCost = cumulativeCost ?? new[] { 1, 2, 3, 4, 5 },
                RequiredSpentPoints = requiredSpentPoints,
                PrerequisiteSkill = prerequisite!,
                PrerequisiteLevel = prerequisiteLevel,
            };
            return this;
        }

        public SyntheticRules WithItem(
            string name,
            int slot,
            int levelRequired = 1,
            string[]? classes = null,
            bool twoHanded = false,
            string? category = null,
            string archetype = "warrior",
            bool isBook = false)
        {
            // A test that names no category means "an item belonging in this slot", so the
            // category that slot requires is used, which is how the game decides where it fits.
            var table = TableFor(archetype);
            var derived = category ?? (table is not null && slot >= 0 && slot < table.Length
                ? table[slot]
                : null);

            Items[GameIds.Sanitize(name)] = new ItemRule
            {
                Name = name,
                LevelRequired = levelRequired,
                Classes = classes ?? System.Array.Empty<string>(),
                IsTwoHanded = twoHanded,
                IsBook = isBook,
                Category = derived!,
            };
            return this;
        }
    }
}
