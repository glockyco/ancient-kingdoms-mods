#nullable disable
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Engine;
using DataExporter;
using Il2Cpp;
using Il2CppMirror;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using System.Reflection;
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
        private readonly Dictionary<string, string[]> _slots;
        private readonly Dictionary<string, SkillRule> _skills;
        private readonly Dictionary<string, ItemRule> _items;
        private readonly HashSet<string> _augments;
        private readonly HashSet<string> _consumables;
        private readonly Player _reference;

        private GameFixtureRules(
            Dictionary<string, Player> classes,
            Dictionary<string, string[]> slots,
            Dictionary<string, SkillRule> skills,
            Dictionary<string, ItemRule> items,
            HashSet<string> augments,
            HashSet<string> consumables,
            Player reference)
        {
            _classes = classes;
            _slots = slots;
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
                ReadSlotTables(classes),
                ReadSkills(classes),
                ReadItems(),
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
        /// <summary>
        /// The attributes the game declares. Read from the class prefab rather than listed here,
        /// because a list would be a second definition that a game update could contradict.
        /// </summary>
        public IReadOnlyCollection<string> AttributeNames => GameAttributes.NamesOn(typeof(Player));

        public int EquipmentSlotCount(string archetype)
            => _slots.TryGetValue(GameIds.ClassId(archetype ?? ""), out var slots) ? slots.Length : 0;

        public IReadOnlyCollection<int> SlotsAccepting(string archetype, string category)
        {
            var accepting = new List<int>();
            if (!_slots.TryGetValue(GameIds.ClassId(archetype ?? ""), out var slots)
                || string.IsNullOrEmpty(category))
                return accepting;

            for (var index = 0; index < slots.Length; index++)
            {
                if (!string.IsNullOrEmpty(slots[index]) && category.StartsWith(slots[index]))
                    accepting.Add(index);
            }

            return accepting;
        }

        /// <summary>
        /// The slot a two-handed weapon must leave empty.
        /// </summary>
        /// <remarks>
        /// Stated as the index the game states. Its own two-handed check reads
        /// <c>slots[13]</c> directly (<c>EquipmentItem.cs:112</c> for a player and
        /// <c>EquipmentItem.cs:158</c> for a companion), so there is nothing to derive it from.
        /// Searching for the slot that requires "Shield" was wrong: a Ranger declares "Bow" there
        /// and a Rogue declares "Weapon", so the search found no slot and the rule never ran.
        /// </remarks>
        public int OffhandSlot => 13;

        /// <summary>
        /// The slot table each archetype declares, for player classes and for companions.
        /// </summary>
        /// <remarks>
        /// Every prefab serializes its own table, so one prefab does not describe the others.
        /// Read live, slot 13 requires "Shield" for a Warrior, a Cleric, a Wizard and a Druid,
        /// "Bow" for a Ranger, and "Weapon" for a Rogue, and the companion prefabs match their
        /// namesakes. Companion archetypes are absent until the scene holding their prefabs is
        /// loaded, and an absent table is reported as unknown rather than replaced by another
        /// archetype's.
        /// </remarks>
        private static Dictionary<string, string[]> ReadSlotTables(Dictionary<string, Player> classes)
        {
            var tables = new Dictionary<string, string[]>();

            foreach (var pair in classes)
                tables[pair.Key] = CategoriesOf(SlotInfoOf(pair.Value));

            foreach (var pair in CompanionSlotTables())
                tables[pair.Key] = pair.Value;

            return tables;
        }

        /// <summary>
        /// Companion slot tables, taken from the prefabs the mercenary interface declares.
        /// </summary>
        /// <remarks>
        /// The prefabs are separate members rather than a list, so they are enumerated by
        /// reflection and each one names its own archetype. An archetype a game update adds is
        /// therefore read without an edit here.
        /// </remarks>
        private static Dictionary<string, string[]> CompanionSlotTables()
        {
            var tables = new Dictionary<string, string[]>();
            var mercenaries = UIMercenaries.singleton;
            if (mercenaries == null)
                return tables;

            foreach (var member in typeof(UIMercenaries).GetProperties(
                         BindingFlags.Public | BindingFlags.Instance))
            {
                if (member.PropertyType != typeof(GameObject))
                    continue;

                var prefab = member.GetValue(mercenaries) as GameObject;
                if (prefab == null)
                    continue;

                var pet = prefab.GetComponent<Pet>();
                var equipment = prefab.GetComponent<MercenaryEquipment>();
                if (pet == null || equipment == null || string.IsNullOrWhiteSpace(pet.typeMonster))
                    continue;

                tables[GameIds.ClassId(pet.typeMonster)] = CategoriesOf(equipment.slotInfo);
            }

            return tables;
        }

        /// <summary>The required category of each slot, in the engine's slot order.</summary>
        private static string[] CategoriesOf(Il2CppReferenceArray<EquipmentInfo> slotInfo)
        {
            var categories = new string[slotInfo == null ? 0 : slotInfo.Length];
            for (var index = 0; index < categories.Length; index++)
                categories[index] = slotInfo[index] == null ? null : slotInfo[index].requiredCategory;

            return categories;
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

        public bool ClassExists(string className)
            => className != null && _classes.ContainsKey(GameIds.ClassId(className));

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

        private static Dictionary<string, ItemRule> ReadItems()
        {
            var items = new Dictionary<string, ItemRule>();

            foreach (var pair in GameItems.Enumerate())
            {
                var id = pair.Key;
                var asset = pair.Value;

                var equipment = asset.TryCast<EquipmentItem>();
                var usable = asset.TryCast<UsableItem>();
                var category = equipment == null ? null : equipment.category;

                items[id] = new ItemRule
                {
                    Name = asset.nameItem,
                    LevelRequired = usable == null ? 0 : usable.minLevel,
                    Classes = ReadItemClasses(asset),
                    Category = category,
                    IsTwoHanded = IsTwoHanded(category),
                };
            }

            return items;
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
