using System;
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Materialization;

namespace CombatVerification.Tests
{
    /// <summary>
    /// A character that refuses the way the engine refuses: silently.
    /// </summary>
    /// <remarks>
    /// This is the point of the fake. A mutation that is not permitted returns normally and
    /// changes nothing, so a build algorithm that trusts a returned call passes against a
    /// forgiving double and fails against the game.
    /// <para>
    /// Experience follows the engine's own setter. Awarding at least the amount required
    /// advances one step and carries the remainder, and the requirement is recomputed after
    /// each step.
    /// </para>
    /// </remarks>
    internal sealed class FakeCharacter : ICharacterUnderConstruction
    {
        private readonly Dictionary<string, int> _attributes = new()
        {
            ["strength"] = 1,
            ["constitution"] = 1,
            ["dexterity"] = 1,
            ["intelligence"] = 1,
            ["wisdom"] = 1,
            ["charisma"] = 1,
        };

        private readonly List<SkillState> _skills = new();
        private long _experience;

        public int Level { get; private set; } = 1;
        public int MaxLevel { get; set; } = 50;
        public int TotalVeteranPoints { get; private set; }
        public int MaxVeteranPoints { get; set; } = 200;
        public int UnspentAttributePoints { get; private set; }
        public int UnspentSkillPoints { get; private set; }
        public int UnspentVeteranPoints { get; private set; }

        /// <summary>Experience for one step. A flat value keeps a test readable.</summary>
        public long StepCost { get; set; } = 100;

        /// <summary>Points a skill needs already spent in its pool before it can be bought.</summary>
        public Dictionary<string, int> RequiredSpentPoints { get; } = new();

        /// <summary>Skills the engine will refuse to upgrade, whatever the pool holds.</summary>
        public HashSet<string> Refuse { get; } = new(StringComparer.OrdinalIgnoreCase);

        /// <summary>Counts every call, so a test can assert that awards were incremental.</summary>
        public int AwardCalls { get; private set; }

        public long ExperienceForNextStep => StepCost - _experience;

        public IReadOnlyList<SkillState> Skills => _skills;

        public FakeCharacter WithSkill(
            string name, int maxLevel = 5, bool veteran = false, int level = 0, int requiredSpent = 0)
        {
            _skills.Add(new SkillState
            {
                Index = _skills.Count,
                Name = name,
                Level = level,
                MaxLevel = maxLevel,
                IsVeteran = veteran,
            });
            if (requiredSpent > 0)
                RequiredSpentPoints[name] = requiredSpent;
            return this;
        }

        public FakeCharacter AtLevel(int level, int veteranPoints = 0)
        {
            Level = level;
            UnspentAttributePoints = level - 1 + veteranPoints;
            UnspentSkillPoints = level - 1;
            TotalVeteranPoints = veteranPoints;
            UnspentVeteranPoints = veteranPoints;
            return this;
        }

        public void AwardExperience(long amount)
        {
            AwardCalls++;
            _experience += amount;

            // The engine's setter subtracts the requirement once per level, so a single award of
            // the requirement advances exactly one step.
            while (_experience >= StepCost)
            {
                _experience -= StepCost;

                if (Level < MaxLevel)
                {
                    Level++;
                    UnspentAttributePoints++;
                    UnspentSkillPoints++;
                    continue;
                }

                if (TotalVeteranPoints < MaxVeteranPoints)
                {
                    TotalVeteranPoints++;
                    UnspentVeteranPoints++;
                    UnspentAttributePoints++;
                    continue;
                }

                // At both caps the engine keeps nothing and grants nothing.
                _experience = 0;
                break;
            }
        }

        public int AttributeValue(string attribute)
            => _attributes.TryGetValue(attribute, out var value) ? value : 0;

        public void SpendAttributePoint(string attribute)
        {
            // The engine's only guard is an unspent point. An unknown attribute has no command,
            // so nothing happens and nothing is reported.
            if (UnspentAttributePoints <= 0 || !_attributes.ContainsKey(attribute))
                return;

            UnspentAttributePoints--;
            _attributes[attribute]++;
        }

        public void UpgradeSkill(int index, bool veteran)
        {
            if (index < 0 || index >= _skills.Count)
                return;

            var skill = _skills[index];
            if (skill.IsVeteran != veteran)
                return;
            if (Refuse.Contains(skill.Name))
                return;
            if (skill.Level >= skill.MaxLevel)
                return;

            var pool = veteran ? UnspentVeteranPoints : UnspentSkillPoints;
            if (pool <= 0)
                return;

            if (RequiredSpentPoints.TryGetValue(skill.Name, out var required)
                && SpentInPool(veteran) < required)
                return;

            if (veteran) UnspentVeteranPoints--; else UnspentSkillPoints--;
            skill.Level++;
        }

        private int SpentInPool(bool veteran)
            => _skills.Where(skill => skill.IsVeteran == veteran).Sum(skill => skill.Level);

        // --- equipment ---

        /// <summary>One item as the game would define it.</summary>
        internal sealed class FakeItem
        {
            public int MaxDurability { get; set; } = 100;

            /// <summary>Slots the game would let it occupy. Empty means none.</summary>
            public HashSet<int> Slots { get; set; } = new();
        }

        private readonly List<EquipmentSlotState> _equipment =
            Enumerable.Range(0, 16)
                .Select(index => new EquipmentSlotState { Index = index })
                .ToList();

        private readonly List<EquipmentSlotState> _inventory = new();

        /// <summary>Items the game defines, by identifier.</summary>
        public Dictionary<string, FakeItem> Items { get; } = new(StringComparer.OrdinalIgnoreCase);

        /// <summary>Inventory capacity. A grant beyond it is refused silently, as a full bag is.</summary>
        public int InventoryCapacity { get; set; } = 24;

        public bool ItemOperationsAllowed { get; set; } = true;

        public string ActivityState { get; set; } = "IDLE";

        /// <summary>Counts equip calls, including the ones the engine ignored.</summary>
        public int EquipCalls { get; private set; }

        /// <summary>
        /// Slots the engine permits and then silently declines to fill. This is the case a
        /// returned call cannot detect, and the only defence is reading the slot back.
        /// </summary>
        public HashSet<int> IgnoreEquipInto { get; } = new();

        public IReadOnlyList<EquipmentSlotState> Equipment => _equipment;

        public FakeCharacter WithItem(
            string id, int maxDurability = 100, params int[] slots)
        {
            Items[id] = new FakeItem
            {
                MaxDurability = maxDurability,
                Slots = new HashSet<int>(slots),
            };
            return this;
        }

        /// <summary>Dresses a slot, as character creation does before a build runs.</summary>
        public FakeCharacter Wearing(int slot, string itemId, int durability = 20)
        {
            _equipment[slot] = new EquipmentSlotState
            {
                Index = slot,
                ItemId = itemId,
                Durability = durability,
            };
            return this;
        }

        public bool ItemExists(string itemId) => itemId != null && Items.ContainsKey(itemId);

        public int MaxDurability(string itemId)
            => Items.TryGetValue(itemId ?? "", out var item) ? item.MaxDurability : 0;

        public void GrantItem(string itemId, int durability, string augmentId)
        {
            if (!ItemExists(itemId) || _inventory.Count >= InventoryCapacity)
                return;

            _inventory.Add(new EquipmentSlotState
            {
                Index = _inventory.Count,
                ItemId = itemId,
                AugmentId = string.IsNullOrWhiteSpace(augmentId) ? null : augmentId,
                Durability = durability,
            });
        }

        public int FindInInventory(string itemId, string augmentId)
        {
            var wanted = string.IsNullOrWhiteSpace(augmentId) ? null : augmentId;
            for (var index = 0; index < _inventory.Count; index++)
            {
                var held = _inventory[index];
                if (string.Equals(held.ItemId, itemId, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(held.AugmentId ?? "", wanted ?? "",
                        StringComparison.OrdinalIgnoreCase))
                    return index;
            }

            return -1;
        }

        public bool CanEquip(int inventoryIndex, int equipmentSlot)
        {
            if (inventoryIndex < 0 || inventoryIndex >= _inventory.Count)
                return false;

            var held = _inventory[inventoryIndex];
            return Items.TryGetValue(held.ItemId, out var item) && item.Slots.Contains(equipmentSlot);
        }

        /// <summary>Slots the engine permits and then silently declines to empty.</summary>
        public HashSet<int> IgnoreUnequipOf { get; } = new();

        public void Unequip(int equipmentSlot)
        {
            if (equipmentSlot < 0 || equipmentSlot >= _equipment.Count
                || !ItemOperationsAllowed
                || IgnoreUnequipOf.Contains(equipmentSlot)
                || _inventory.Count >= InventoryCapacity)
                return;

            var held = _equipment[equipmentSlot];
            if (held.ItemId == null)
                return;

            _inventory.Add(new EquipmentSlotState
            {
                Index = _inventory.Count,
                ItemId = held.ItemId,
                AugmentId = held.AugmentId,
                Durability = held.Durability,
            });
            _equipment[equipmentSlot] = new EquipmentSlotState { Index = equipmentSlot };
        }

        public void Equip(int inventoryIndex, int equipmentSlot)
        {
            EquipCalls++;

            // Every reason the engine ignores the request, and it ignores it in silence.
            if (!ItemOperationsAllowed
                || inventoryIndex < 0 || inventoryIndex >= _inventory.Count
                || equipmentSlot < 0 || equipmentSlot >= _equipment.Count
                || !CanEquip(inventoryIndex, equipmentSlot)
                || IgnoreEquipInto.Contains(equipmentSlot))
                return;

            var held = _inventory[inventoryIndex];
            _inventory.RemoveAt(inventoryIndex);

            _equipment[equipmentSlot] = new EquipmentSlotState
            {
                Index = equipmentSlot,
                ItemId = held.ItemId,
                AugmentId = held.AugmentId,
                Durability = held.Durability,
            };
        }
    }
}
