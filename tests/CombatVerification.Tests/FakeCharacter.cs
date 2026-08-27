using CombatVerification.Engine;
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

        /// <summary>
        /// Equipment that refuses the way the engine refuses. It permits an operation it will then
        /// silently decline, because that is the case a returned call cannot detect.
        /// </summary>
        internal sealed class FakeEquipment : IEquipmentSurface
        {
            private readonly List<EquippedSlot> _slots =
                Enumerable.Range(0, 16)
                    .Select(index => new EquippedSlot { Index = index })
                    .ToList();

            private readonly FakeCharacter _owner;

            public FakeEquipment(FakeCharacter owner)
            {
                _owner = owner;
            }

            /// <summary>Slots this surface permits and then declines to change.</summary>
            public HashSet<int> Ignore { get; } = new();

            /// <summary>Counts calls that act, including the ones that were ignored.</summary>
            public int EquipCalls { get; private set; }

            public IReadOnlyList<EquippedSlot> Slots => _slots;

            public EquippedSlot At(int index) => _slots[index];

            public FakeEquipment Wearing(int slot, string itemId, int durability = 20)
            {
                _slots[slot] = new EquippedSlot
                {
                    Index = slot,
                    ItemId = itemId,
                    Durability = durability,
                };
                return this;
            }

            public bool CanEquip(int inventoryIndex, int equipmentSlot)
            {
                var held = _owner.InInventory(inventoryIndex);
                return held != null
                    && _owner.Items.TryGetValue(held.ItemId, out var item)
                    && item.Slots.Contains(equipmentSlot);
            }

            public void Equip(int inventoryIndex, int equipmentSlot)
            {
                EquipCalls++;

                if (!_owner.ItemOperationsAllowed
                    || equipmentSlot < 0 || equipmentSlot >= _slots.Count
                    || !CanEquip(inventoryIndex, equipmentSlot)
                    || Ignore.Contains(equipmentSlot))
                    return;

                var held = _owner.TakeFromInventory(inventoryIndex);
                _slots[equipmentSlot] = new EquippedSlot
                {
                    Index = equipmentSlot,
                    ItemId = held.ItemId,
                    AugmentId = held.AugmentId,
                    Durability = held.Durability,
                };
            }

            public void Unequip(int equipmentSlot)
            {
                if (!_owner.ItemOperationsAllowed
                    || equipmentSlot < 0 || equipmentSlot >= _slots.Count
                    || Ignore.Contains(equipmentSlot))
                    return;

                var held = _slots[equipmentSlot];
                if (!held.Occupied || !_owner.HasInventoryRoom)
                    return;

                _owner.PutInInventory(held);
                _slots[equipmentSlot] = new EquippedSlot { Index = equipmentSlot };
            }
        }

        private readonly List<EquippedSlot> _inventory = new();

        private FakeEquipment? _equipment;

        /// <summary>Items the game defines, by identifier.</summary>
        public Dictionary<string, FakeItem> Items { get; } = new(StringComparer.OrdinalIgnoreCase);

        /// <summary>Inventory capacity. A grant beyond it is refused silently, as a full bag is.</summary>
        public int InventoryCapacity { get; set; } = 24;

        public bool ItemOperationsAllowed { get; set; } = true;

        public string ActivityState { get; set; } = "IDLE";

        public IEquipmentSurface Equipment => _equipment ??= new FakeEquipment(this);

        /// <summary>Counts equip calls on the character's own equipment.</summary>
        public int EquipCalls => ((FakeEquipment)Equipment).EquipCalls;

        /// <summary>Slots the character's equipment permits and then declines to fill.</summary>
        public HashSet<int> IgnoreEquipInto => ((FakeEquipment)Equipment).Ignore;

        public FakeCharacter WithItem(string id, int maxDurability = 100, params int[] slots)
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
            ((FakeEquipment)Equipment).Wearing(slot, itemId, durability);
            return this;
        }

        public bool ItemExists(string itemId) => itemId != null && Items.ContainsKey(itemId);

        public int MaxDurability(string itemId)
            => Items.TryGetValue(itemId ?? "", out var item) ? item.MaxDurability : 0;

        public void GrantItem(string itemId, int durability, string augmentId)
        {
            if (!ItemExists(itemId) || !HasInventoryRoom)
                return;

            _inventory.Add(new EquippedSlot
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

        internal bool HasInventoryRoom => _inventory.Count < InventoryCapacity;

        internal EquippedSlot? InInventory(int index)
            => index < 0 || index >= _inventory.Count ? null : _inventory[index];

        internal EquippedSlot TakeFromInventory(int index)
        {
            var held = _inventory[index];
            _inventory.RemoveAt(index);
            return held;
        }

        internal void PutInInventory(EquippedSlot slot)
            => _inventory.Add(new EquippedSlot
            {
                Index = _inventory.Count,
                ItemId = slot.ItemId,
                AugmentId = slot.AugmentId,
                Durability = slot.Durability,
            });

        // --- companions ---

        /// <summary>A companion whose values are set and whose equipment refuses like the rest.</summary>
        internal sealed class FakeCompanion : ICompanionUnderConstruction
        {
            private readonly FakeEquipment _equipment;

            public FakeCompanion(FakeCharacter owner, string archetype)
            {
                Archetype = archetype;
                _equipment = new FakeEquipment(owner);
            }

            public string Archetype { get; }
            public string Name { get; set; } = "Nameless";
            public string Race { get; set; } = "Human";
            public int Level { get; set; } = 1;
            public float HealthMultiplier { get; private set; } = 1f;
            public float ResourceMultiplier { get; private set; } = 1f;
            public int BaseCombat { get; private set; }

            public IEquipmentSurface Equipment => _equipment;

            /// <summary>Slots its equipment permits and then declines to fill.</summary>
            public HashSet<int> IgnoreEquipInto => _equipment.Ignore;

            public void SetHealthMultiplier(float value) => HealthMultiplier = value;
            public void SetResourceMultiplier(float value) => ResourceMultiplier = value;
            public void SetBaseCombat(int value) => BaseCombat = value;
        }

        private readonly List<ICompanionUnderConstruction> _companions = new();

        /// <summary>Archetypes the game offers for hire.</summary>
        public HashSet<string> Archetypes { get; } =
            new(new[] { "Warrior", "Cleric", "Rogue", "Wizard", "Druid", "Ranger" },
                StringComparer.OrdinalIgnoreCase);

        /// <summary>How many companions the engine will produce before it silently stops.</summary>
        public int CompanionCap { get; set; } = 4;

        public long HirePriceEach { get; set; } = 500;

        /// <summary>Counts hire calls, including the ones the engine ignored.</summary>
        public int HireCalls { get; private set; }

        public IReadOnlyList<ICompanionUnderConstruction> Companions => _companions;

        public bool ArchetypeExists(string archetype)
            => archetype != null && Archetypes.Contains(archetype);

        public long Gold { get; private set; }

        public void AddGold(long amount) => Gold += amount;

        public long HirePrice(string archetype) => HirePriceEach;

        public void Hire(string archetype, long price)
        {
            HireCalls++;

            // The engine charges and records the hire even when it produces nothing.
            if (Gold < price)
                return;

            Gold -= price;
            if (_companions.Count >= CompanionCap)
                return;

            var produced = HiredArchetype ?? archetype;
            var companion = new FakeCompanion(this, produced)
            {
                Name = $"Hire{HireCalls}",
            };

            if (RacesByArchetype.TryGetValue(produced, out var races) && races.Length > 0)
                companion.Race = races[_raceDraw++ % races.Length];

            foreach (var slot in CompanionIgnoresEquipInto)
                companion.IgnoreEquipInto.Add(slot);

            _companions.Add(companion);
        }

        /// <summary>Forces the archetype a hire produces, so a mismatch can be tested.</summary>
        public string? HiredArchetype { get; set; }

        /// <summary>
        /// Races each archetype can roll. A hire draws from this, so a race outside it is one the
        /// engine never produces however many times it is asked.
        /// </summary>
        public Dictionary<string, string[]> RacesByArchetype { get; } =
            new(StringComparer.OrdinalIgnoreCase);

        /// <summary>Draws in order rather than at random, so a test is deterministic.</summary>
        private int _raceDraw;

        /// <summary>
        /// Slots every hired companion permits and then silently declines to fill. A companion is
        /// created inside the build, so this is set on the owner beforehand.
        /// </summary>
        public HashSet<int> CompanionIgnoresEquipInto { get; } = new();

    }
}
