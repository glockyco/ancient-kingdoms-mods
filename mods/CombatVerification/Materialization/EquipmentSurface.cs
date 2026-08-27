#nullable disable
using CombatVerification.Engine;
using System;
using System.Collections.Generic;
using Il2Cpp;

namespace CombatVerification.Materialization
{
    /// <summary>A player's equipment, driven by the commands the interface sends.</summary>
    internal sealed class PlayerEquipmentSurface : IEquipmentSurface
    {
        private readonly Player _player;
        private readonly PlayerEquipment _equipment;

        public PlayerEquipmentSurface(Player player, PlayerEquipment equipment)
        {
            _player = player;
            _equipment = equipment;
        }

        public IReadOnlyList<EquippedSlot> Slots => Containers.Read(_equipment);

        public EquippedSlot At(int index) => Containers.At(_equipment, index);

        public bool CanEquip(int inventoryIndex, int equipmentSlot)
        {
            var item = Containers.EquipmentIn(_player.inventory, inventoryIndex);
            return item != null
                && item.CanEquip(_player, inventoryIndex, equipmentSlot, showMessage: false);
        }

        public void Equip(int inventoryIndex, int equipmentSlot)
            => _equipment.CmdSwapInventoryEquip(inventoryIndex, equipmentSlot);

        public void Unequip(int equipmentSlot) => _equipment.CmdUnequip(equipmentSlot);
    }

    /// <summary>
    /// A companion's equipment. Its commands read from the owner's inventory, so an item is
    /// granted to the owner and moved from there.
    /// </summary>
    internal sealed class CompanionEquipmentSurface : IEquipmentSurface
    {
        private readonly Pet _pet;
        private readonly MercenaryEquipment _equipment;

        public CompanionEquipmentSurface(Pet pet, MercenaryEquipment equipment)
        {
            _pet = pet;
            _equipment = equipment;
        }

        public IReadOnlyList<EquippedSlot> Slots => Containers.Read(_equipment);

        public EquippedSlot At(int index) => Containers.At(_equipment, index);

        public bool CanEquip(int inventoryIndex, int equipmentSlot)
        {
            var owner = _pet.Networkowner;
            if (owner == null)
                return false;

            var item = Containers.EquipmentIn(owner.inventory, inventoryIndex);

            // The companion's own check, which differs from the player's: it reads the companion's
            // slot layout and archetype, and the item's level requirement against the owner.
            return item != null && item.CanEquipMercenary(_pet, equipmentSlot, showMessage: false);
        }

        public void Equip(int inventoryIndex, int equipmentSlot)
            => _equipment.CmdSwapInventoryEquip(inventoryIndex, equipmentSlot);

        public void Unequip(int equipmentSlot) => _equipment.CmdUnequip(equipmentSlot);
    }

    /// <summary>Resolves the equipment surface of an entity, or explains why it has none.</summary>
    internal static class EquipmentSurface
    {
        public static IEquipmentSurface Of(Player player)
        {
            var equipment = player.equipment == null
                ? null
                : player.equipment.TryCast<PlayerEquipment>();
            if (equipment == null)
                throw new InvalidOperationException(
                    "The local player's equipment component is not PlayerEquipment.");

            return new PlayerEquipmentSurface(player, equipment);
        }

        public static IEquipmentSurface Of(Pet pet)
        {
            var equipment = pet.equipment == null
                ? null
                : pet.equipment.TryCast<MercenaryEquipment>();
            if (equipment == null)
                throw new InvalidOperationException(
                    $"The companion '{pet.nameEntity}' has no mercenary equipment.");

            return new CompanionEquipmentSurface(pet, equipment);
        }
    }
}
