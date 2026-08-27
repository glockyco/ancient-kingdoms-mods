#nullable disable
using System;
using System.Collections.Generic;
using System.Reflection;
using CombatVerification.Fixtures;
using DataExporter;
using Il2Cpp;

namespace CombatVerification.Materialization
{
    /// <summary>
    /// The build port over a live player.
    /// </summary>
    /// <remarks>
    /// Every mutation goes through the path a player's own input takes. Experience is awarded by
    /// assignment, because that setter is where the engine's level-up pipeline lives and every
    /// award in the game funnels through it. Attribute and skill points are spent through the
    /// commands the interface sends.
    /// <para>
    /// Nothing here is tabulated. The engine derives an attribute from a component that inherits
    /// one base class, and its command name from the attribute's own name, so a new attribute
    /// needs no change here and a missing one fails while naming what it looked for.
    /// </para>
    /// </remarks>
    public sealed class PlayerUnderConstruction : ICharacterUnderConstruction
    {
        private readonly Player _player;
        private readonly PlayerSkills _skills;
        private readonly PlayerInventory _inventory;
        private readonly PlayerEquipment _equipment;

        private PlayerUnderConstruction(
            Player player, PlayerSkills skills, PlayerInventory inventory, PlayerEquipment equipment)
        {
            _player = player;
            _skills = skills;
            _inventory = inventory;
            _equipment = equipment;
        }

        /// <summary>Wraps the local player, or reports why it cannot be built on.</summary>
        public static PlayerUnderConstruction Wrap(out string unavailable)
        {
            var player = Player.localPlayer;
            if (player == null)
            {
                unavailable = "No local player exists. Enter the world before building a character.";
                return null;
            }

            // The base type is what the field declares, so the concrete type needs a cast that
            // cannot throw across the interop boundary.
            var skills = player.skills == null ? null : player.skills.TryCast<PlayerSkills>();
            if (skills == null)
            {
                unavailable = "The local player's skills component is not PlayerSkills.";
                return null;
            }

            var inventory = player.inventory == null
                ? null
                : player.inventory.TryCast<PlayerInventory>();
            if (inventory == null)
            {
                unavailable = "The local player's inventory component is not PlayerInventory.";
                return null;
            }

            var equipment = player.equipment == null
                ? null
                : player.equipment.TryCast<PlayerEquipment>();
            if (equipment == null)
            {
                unavailable = "The local player's equipment component is not PlayerEquipment.";
                return null;
            }

            unavailable = null;
            return new PlayerUnderConstruction(player, skills, inventory, equipment);
        }

        // --- progression ---

        public int Level => _player.level.current;

        public int MaxLevel => _player.level.max;

        public int TotalVeteranPoints => _skills.GetTotalVeteranPoints();

        public int MaxVeteranPoints => Experience.maxVeteranLevel;

        public long ExperienceForNextStep
        {
            get
            {
                var remaining = _player.experience.max - _player.experience.current;
                return remaining > 0 ? remaining : 0;
            }
        }

        public void AwardExperience(long amount)
        {
            if (amount <= 0)
                return;

            // The setter subtracts the requirement once for each level it grants, so awarding
            // exactly the requirement advances one step. A large award makes that loop spin.
            _player.experience.current = _player.experience.current + amount;
        }

        // --- attributes ---

        public int UnspentAttributePoints => _player.experience.attributePoints;

        public int AttributeValue(string attribute)
        {
            var component = FindAttribute(attribute);
            return component == null ? 0 : component.value;
        }

        public void SpendAttributePoint(string attribute)
        {
            var methodName = "CmdUpgrade" + CreatorMethods.PascalCase(attribute);
            var method = typeof(Player).GetMethod(
                methodName, BindingFlags.Public | BindingFlags.Instance, null, Type.EmptyTypes, null);

            // A name with no command changes nothing. The builder notices, because it reads the
            // value again rather than trusting this call.
            method?.Invoke(_player, Array.Empty<object>());
        }

        /// <summary>
        /// The component holding one attribute, found by the name the player declares it under.
        /// </summary>
        /// <remarks>
        /// Enumerating components does not work here. The interop layer hands back every
        /// component wrapped as the base type that was asked for, so all six attributes report the
        /// same type name and cannot be told apart. The player names each one, so the member is
        /// what identifies it.
        /// </remarks>
        private PlayerAttribute FindAttribute(string attribute)
        {
            var pascal = CreatorMethods.PascalCase(attribute);
            var camel = char.ToLowerInvariant(pascal[0]) + pascal.Substring(1);

            const BindingFlags Public = BindingFlags.Public | BindingFlags.Instance;
            var value = typeof(Player).GetProperty(camel, Public)?.GetValue(_player)
                        ?? typeof(Player).GetProperty(pascal, Public)?.GetValue(_player)
                        ?? typeof(Player).GetField(camel, Public)?.GetValue(_player)
                        ?? typeof(Player).GetField(pascal, Public)?.GetValue(_player);

            // The interop layer mirrors the game's inheritance, so a Strength wrapper is a
            // PlayerAttribute and its value is readable without knowing which attribute it is.
            return value as PlayerAttribute;
        }

        // --- skills ---

        public int UnspentSkillPoints => _skills.skillPoints;

        public int UnspentVeteranPoints => _skills.veteranPoints;

        public IReadOnlyList<SkillState> Skills
        {
            get
            {
                var states = new List<SkillState>();
                var skills = _skills.skills;
                for (var index = 0; index < skills.Count; index++)
                {
                    var skill = skills[index];
                    if (skill.data == null)
                        continue;

                    states.Add(new SkillState
                    {
                        Index = index,
                        Name = skill.name,
                        Level = skill.level,
                        MaxLevel = skill.maxLevel,
                        IsVeteran = skill.data.isVeteran,
                    });
                }

                return states;
            }
        }

        public void UpgradeSkill(int index, bool veteran)
        {
            if (veteran)
                _skills.CmdUpgradeVeteran(index);
            else
                _skills.CmdUpgrade(index);
        }

        // --- equipment ---

        public bool ItemOperationsAllowed => _inventory.InventoryOperationsAllowed();

        public string ActivityState => _player.state;

        public IReadOnlyList<EquipmentSlotState> Equipment
        {
            get
            {
                var states = new List<EquipmentSlotState>();
                var slots = _equipment.slots;

                for (var index = 0; index < slots.Count; index++)
                {
                    var slot = slots[index];
                    var occupied = slot.amount > 0 && slot.item.data != null;

                    states.Add(new EquipmentSlotState
                    {
                        Index = index,
                        ItemId = occupied ? IdentifierOf(slot.item.data) : null,
                        AugmentId = string.IsNullOrEmpty(slot.augmentName)
                            ? null
                            : GameIds.Sanitize(slot.augmentName),
                        Durability = occupied ? slot.durability : 0,
                    });
                }

                return states;
            }
        }

        public bool ItemExists(string itemId) => GameItems.Find(itemId) != null;

        public int MaxDurability(string itemId)
        {
            var asset = Required(itemId);
            var equipment = asset.TryCast<EquipmentItem>();
            return equipment == null ? 0 : equipment.maxDurability;
        }

        public void GrantItem(string itemId, int durability, string augmentId)
        {
            var asset = Required(itemId);
            var augment = string.IsNullOrWhiteSpace(augmentId) ? null : Required(augmentId);

            // The augment name rides in the inventory slot, and equipping moves the whole slot,
            // so granting it here is what carries it onto the equipped item.
            _inventory.Add(new Item(asset), 1, durability, augment == null ? null : augment.nameItem);
        }

        public int FindInInventory(string itemId, string augmentId)
        {
            var wanted = GameIds.Sanitize(itemId);
            var wantedAugment = string.IsNullOrWhiteSpace(augmentId)
                ? ""
                : GameIds.Sanitize(augmentId);

            var slots = _inventory.slots;
            for (var index = 0; index < slots.Count; index++)
            {
                var slot = slots[index];
                if (slot.amount <= 0 || slot.item.data == null)
                    continue;

                if (IdentifierOf(slot.item.data) != wanted)
                    continue;

                var held = string.IsNullOrEmpty(slot.augmentName)
                    ? ""
                    : GameIds.Sanitize(slot.augmentName);
                if (held == wantedAugment)
                    return index;
            }

            return -1;
        }

        public bool CanEquip(int inventoryIndex, int equipmentSlot)
        {
            var slot = _inventory.slots[inventoryIndex];
            var equipment = slot.item.data == null ? null : slot.item.data.TryCast<EquipmentItem>();
            if (equipment == null)
                return false;

            // The game's own decision, asked without the chat message a player would see.
            return equipment.CanEquip(_player, inventoryIndex, equipmentSlot, showMessage: false);
        }

        public void Equip(int inventoryIndex, int equipmentSlot)
            => _equipment.CmdSwapInventoryEquip(inventoryIndex, equipmentSlot);

        public void Unequip(int equipmentSlot) => _equipment.CmdUnequip(equipmentSlot);

        private static string IdentifierOf(ScriptableItem data) => GameIds.Sanitize(data.name);

        private static ScriptableItem Required(string itemId)
        {
            var asset = GameItems.Find(itemId);
            if (asset == null)
                throw new InvalidOperationException($"The game defines no item '{itemId}'.");

            return asset;
        }
    }
}
