#nullable disable
using System.Collections.Generic;
using System.Linq;
using DataExporter;
using Il2Cpp;
using Il2CppMirror;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using UnityEngine;

namespace CombatVerification.Fixtures
{
    /// <summary>
    /// Fixture rules read from the running game's own definitions.
    /// </summary>
    /// <remarks>
    /// Nothing here restates a table. Every value comes from a class prefab, a skill asset, an
    /// item asset, or a published constant, so the rules a fixture is checked against cannot
    /// drift from the game they describe.
    /// </remarks>
    public sealed class GameFixtureRules : IFixtureRules
    {
        /// <summary>Descriptor schema this build of the harness materializes.</summary>

        private readonly Dictionary<string, Player> _classes;
        private readonly Dictionary<string, SkillRule> _skills;
        private readonly Dictionary<string, ItemRule> _items;
        private readonly HashSet<string> _augments;
        private readonly HashSet<string> _consumables;
        private readonly Player _reference;

        private GameFixtureRules(
            Dictionary<string, Player> classes,
            Dictionary<string, SkillRule> skills,
            Dictionary<string, ItemRule> items,
            HashSet<string> augments,
            HashSet<string> consumables,
            Player reference)
        {
            _classes = classes;
            _skills = skills;
            _items = items;
            _augments = augments;
            _consumables = consumables;
            _reference = reference;
        }

        /// <summary>
        /// Reads the rules from the game, or returns null with a reason when a source the rules
        /// depend on is not available.
        /// </summary>
        public static GameFixtureRules Read(out string unavailable)
        {
            unavailable = null;

            var manager = NetworkManager.singleton as NetworkManagerMMO;
            if (manager == null || manager.playerClasses == null || manager.playerClasses.Count == 0)
            {
                unavailable = "The game has not loaded its player classes yet.";
                return null;
            }

            // Keyed by the identifier the export uses, so a descriptor names a class the
            // same way the compendium does.
            var classes = new Dictionary<string, Player>();
            foreach (var prefab in manager.playerClasses)
            {
                if (prefab != null)
                    classes[GameIds.ClassId(prefab.name)] = prefab;
            }

            if (classes.Count == 0)
            {
                unavailable = "No usable player class prefabs.";
                return null;
            }

            return new GameFixtureRules(
                classes,
                ReadSkills(classes),
                ReadItems(classes.Values.First()),
                ReadItemsOfKind<AugmentItem>(),
                ReadConsumables(),
                classes.Values.First());
        }

        /// <summary>Level cap, read from a class prefab's own level component.</summary>
        public int MaxLevel => _reference.level.max;

        /// <summary>Veteran points obtainable in total, published by the experience component.</summary>
        public int MaxVeteranPoints => Experience.maxVeteranLevel;

        /// <summary>
        /// Attribute names the game defines. These are the six components a player carries, and
        /// the descriptor names them in the same lower-case form the export uses.
        /// </summary>
        public IReadOnlyCollection<string> AttributeNames { get; } = new[]
        {
            "strength", "constitution", "dexterity", "intelligence", "wisdom", "charisma",
        };

        public int EquipmentSlotCount => SlotInfoOf(_reference).Length;

        /// <summary>
        /// Offhand slot, found by its own slot definition rather than by a remembered index, so
        /// a change to the game's slot order does not silently move it.
        /// </summary>
        public int OffhandSlot
        {
            get
            {
                var slots = SlotInfoOf(_reference);
                for (var i = 0; i < slots.Length; i++)
                {
                    if (slots[i] != null && slots[i].requiredCategory == "Shield")
                        return i;
                }

                return -1;
            }
        }

        /// <summary>
        /// Slot definitions, which the player-specific equipment component carries. A hard cast
        /// throws in this runtime when the component is a plain one, so it is tested first.
        /// </summary>
        private static Il2CppReferenceArray<EquipmentInfo> SlotInfoOf(Player player)
        {
            var equipment = player.equipment == null
                ? null
                : player.equipment.TryCast<PlayerEquipment>();
            return equipment == null ? new Il2CppReferenceArray<EquipmentInfo>(0) : equipment.slotInfo;
        }

        /// <summary>Classes the game defines, reported so a result names what it checked against.</summary>
        public IReadOnlyCollection<string> ClassNames => _classes.Keys;

        public bool ClassExists(string className) => _classes.ContainsKey(className);

        /// <summary>One point per level after the first, plus one per veteran award.</summary>
        public int AllocatableAttributePoints(int level, int veteranPoints)
            => SkillPointsAtLevel(level) + veteranPoints;

        public int SkillPointsAtLevel(int level) => level < 1 ? 0 : level - 1;

        public bool TryGetSkill(string skillName, out SkillRule rule)
            => _skills.TryGetValue(GameIds.Sanitize(skillName), out rule)
               || _skills.TryGetValue(skillName, out rule);

        public bool TryGetItem(string itemName, out ItemRule rule)
            => _items.TryGetValue(GameIds.Sanitize(itemName), out rule)
               || _items.TryGetValue(itemName, out rule);

        public bool AugmentExists(string augmentName)
            => _augments.Contains(GameIds.Sanitize(augmentName));

        public bool ConsumableExists(string consumableName)
            => _consumables.Contains(GameIds.Sanitize(consumableName));

        // ---- reading the game's definitions ----

        private static Dictionary<string, SkillRule> ReadSkills(
            Dictionary<string, Player> classes)
        {
            var skillClasses = BuildSkillClasses(classes);
            var skills = new Dictionary<string, SkillRule>();
            foreach (var asset in Resources.FindObjectsOfTypeAll<ScriptableSkill>())
            {
                if (asset == null)
                    continue;

                var id = GameIds.Sanitize(asset.name);
                if (skills.ContainsKey(id))
                    continue;

                skills[id] = new SkillRule
                {
                    Name = asset.nameSkill,
                    MaxLevel = asset.maxLevel,
                    IsVeteran = asset.isVeteran,
                    Classes = skillClasses.TryGetValue(id, out var owners)
                        ? owners
                        : new List<string>(),
                    CumulativeCost = ReadCumulativeCost(asset),
                    Tier = asset.tier,
                    RequiredSpentPoints = asset.requiredSpentPoints,
                    // Named as this record names its own skill. Mixing an identifier here with a
                    // display name in Name would make the two impossible to compare.
                    PrerequisiteSkill = asset.predecessor == null
                        ? null
                        : asset.predecessor.nameSkill,
                    PrerequisiteLevel = asset.predecessorLevel,
                };
            }

            return skills;
        }

        /// <summary>
        /// Which classes hold each skill. A skill asset does not name its classes: each class
        /// prefab carries its own skill templates, so the relation is read from that side. One
        /// skill can belong to several classes, as shared veteran skills do.
        /// </summary>
        private static Dictionary<string, List<string>> BuildSkillClasses(
            Dictionary<string, Player> classes)
        {
            var owners = new Dictionary<string, List<string>>();

            foreach (var pair in classes)
            {
                // skillTemplates lives on the base Skills component, so no cast is needed.
                var templates = pair.Value.skills == null
                    ? null
                    : pair.Value.skills.skillTemplates;
                if (templates == null)
                    continue;

                foreach (var template in templates)
                {
                    if (template == null)
                        continue;

                    var id = GameIds.Sanitize(template.name);
                    if (!owners.TryGetValue(id, out var list))
                        owners[id] = list = new List<string>();

                    if (!list.Contains(pair.Key))
                        list.Add(pair.Key);
                }
            }

            return owners;
        }

        /// <summary>
        /// Total points to reach each level, as the game charges them. Cost can rise with level,
        /// so it is accumulated rather than multiplied.
        /// </summary>
        private static IReadOnlyList<int> ReadCumulativeCost(ScriptableSkill asset)
        {
            var cumulative = new List<int>();
            var running = 0;
            for (var level = 1; level <= asset.maxLevel; level++)
            {
                running += asset.requiredSkillPoints.Get(level);
                cumulative.Add(running);
            }

            return cumulative;
        }

        private Dictionary<string, ItemRule> ReadItems() => ReadItems(_reference);

        private static Dictionary<string, ItemRule> ReadItems(Player reference)
        {
            var slotInfo = SlotInfoOf(reference);
            var items = new Dictionary<string, ItemRule>();

            foreach (var asset in Resources.LoadAll<ScriptableItem>("Items"))
            {
                if (asset == null)
                    continue;

                var id = GameIds.Sanitize(asset.name);
                if (items.ContainsKey(id))
                    continue;

                var equipment = asset.TryCast<EquipmentItem>();
                var usable = asset.TryCast<UsableItem>();
                var category = equipment == null ? null : equipment.category;

                items[id] = new ItemRule
                {
                    Name = asset.nameItem,
                    Slots = SlotsAccepting(slotInfo, category),
                    LevelRequired = usable == null ? 0 : usable.minLevel,
                    Classes = ReadItemClasses(asset),
                    Category = category,
                    IsTwoHanded = IsTwoHanded(category),
                };
            }

            return items;
        }

        /// <summary>
        /// Slots whose required category the item's category satisfies. This is the same test
        /// the game applies, and it can match more than one slot.
        /// </summary>
        private static IReadOnlyCollection<int> SlotsAccepting(
            Il2CppReferenceArray<EquipmentInfo> slotInfo, string category)
        {
            var slots = new List<int>();
            if (string.IsNullOrEmpty(category))
                return slots;

            for (var i = 0; i < slotInfo.Length; i++)
            {
                var required = slotInfo[i].requiredCategory;
                if (!string.IsNullOrEmpty(required) && category.StartsWith(required))
                    slots.Add(i);
            }

            return slots;
        }

        /// <summary>
        /// The game has no two-handed flag: it reads the category, so this reads it the same way.
        /// </summary>
        private static bool IsTwoHanded(string category)
            => !string.IsNullOrEmpty(category) && category.EndsWith("2H");

        /// <summary>
        /// Classes that may equip it. The game holds one string, treats "All" as unrestricted,
        /// and tests membership by substring, so an unrestricted item reports no restriction.
        /// </summary>
        private static IReadOnlyCollection<string> ReadItemClasses(ScriptableItem asset)
        {
            var required = asset.requiredClass;
            if (string.IsNullOrWhiteSpace(required) || required == "All")
                return new List<string>();

            // The game holds display names here, while a descriptor names a class by its
            // exported identifier, so the names are translated at this boundary rather than
            // leaving the comparison to guess which form it has.
            var classes = new List<string>();
            foreach (var name in required.Split(','))
            {
                var id = GameIds.ClassId(name.Trim());
                if (id.Length > 0)
                    classes.Add(id);
            }

            return classes;
        }

        private static HashSet<string> ReadItemsOfKind<TItem>() where TItem : ScriptableItem
        {
            var found = new HashSet<string>();
            foreach (var asset in Resources.LoadAll<ScriptableItem>("Items"))
            {
                if (asset != null && asset.TryCast<TItem>() != null)
                    found.Add(GameIds.Sanitize(asset.name));
            }

            return found;
        }

        /// <summary>Items a build can declare as a consumable buff source.</summary>
        private static HashSet<string> ReadConsumables()
        {
            var found = new HashSet<string>();
            foreach (var asset in Resources.LoadAll<ScriptableItem>("Items"))
            {
                if (asset == null)
                    continue;

                if (asset.TryCast<FoodItem>() != null || asset.TryCast<PotionItem>() != null)
                    found.Add(GameIds.Sanitize(asset.name));
            }

            return found;
        }
    }
}
