#nullable disable
using System;
using System.Collections.Generic;
using CombatVerification.Engine;
using CombatVerification.Fixtures;
using DataExporter;
using Il2Cpp;

namespace CombatVerification.Materialization
{
    /// <summary>
    /// The companion port over a live pet.
    /// </summary>
    /// <remarks>
    /// The three values a hire rolls are written to the same fields the hire writes
    /// (<c>server-scripts/Player.cs:9810-9822</c>). The engine draws them from ranges it holds as
    /// literals inside the hire, so nothing exposes the range and a value cannot be requested.
    /// <para>
    /// Which resource a companion uses follows its archetype rather than a field: a Warrior and a
    /// Rogue carry energy, and every other archetype carries mana. The engine makes that choice the
    /// same way in the hire, in the reload, and in the level-up.
    /// </para>
    /// </remarks>
    public sealed class PetUnderConstruction : ICompanionUnderConstruction
    {
        private readonly Pet _pet;

        public PetUnderConstruction(Pet pet)
        {
            _pet = pet;
        }

        public string Archetype => _pet.typeMonster;

        public string Name => _pet.nameEntity;

        /// <summary>The pet this port wraps, so an owner can address it by identity.</summary>
        internal Pet Pet => _pet;

        public string Race => _pet.raceName;

        public int Level => _pet.level.current;

        public float HealthMultiplier => _pet.health.multiplierHealth;

        public float ResourceMultiplier
            => UsesEnergy ? _pet.energy.multiplierEnergy : _pet.mana.multiplierMana;

        public int BaseCombat => _pet.combat.baseDamage.baseValue;

        /// <summary>Energy is the Warrior's and the Rogue's resource, and mana is everyone's else.</summary>
        private bool UsesEnergy => _pet.typeMonster == "Warrior" || _pet.typeMonster == "Rogue";

        public IReadOnlyList<EquipmentSlotState> Equipment
        {
            get
            {
                var states = new List<EquipmentSlotState>();
                var slots = Slots.slots;

                for (var index = 0; index < slots.Count; index++)
                {
                    var slot = slots[index];
                    var occupied = slot.amount > 0 && slot.item.data != null;

                    states.Add(new EquipmentSlotState
                    {
                        Index = index,
                        ItemId = occupied ? GameIds.Sanitize(slot.item.data.name) : null,
                        AugmentId = string.IsNullOrEmpty(slot.augmentName)
                            ? null
                            : GameIds.Sanitize(slot.augmentName),
                        Durability = occupied ? slot.durability : 0,
                    });
                }

                return states;
            }
        }

        private MercenaryEquipment Slots
        {
            get
            {
                var equipment = _pet.equipment == null
                    ? null
                    : _pet.equipment.TryCast<MercenaryEquipment>();
                if (equipment == null)
                    throw new InvalidOperationException(
                        $"The companion '{_pet.nameEntity}' has no mercenary equipment.");

                return equipment;
            }
        }

        public void SetHealthMultiplier(float value)
            => _pet.health.NetworkmultiplierHealth = value;

        public void SetResourceMultiplier(float value)
        {
            if (UsesEnergy)
                _pet.energy.NetworkmultiplierEnergy = value;
            else
                _pet.mana.NetworkmultiplierMana = value;
        }

        public void SetBaseCombat(int value)
        {
            // The hire sets both from one roll, and the reload restores both from one stored value,
            // so a companion whose two damage values differ is not a state the game produces.
            //
            // The curve is a struct behind an interop property, so the game's own chained
            // assignment does not translate: the value has to be read, changed, and written back.
            var damage = _pet.combat.baseDamage;
            damage.baseValue = value;
            _pet.combat.baseDamage = damage;

            var magic = _pet.combat.baseMagicDamage;
            magic.baseValue = value;
            _pet.combat.baseMagicDamage = magic;
        }

        public bool CanEquip(int ownerInventoryIndex, int equipmentSlot)
        {
            var owner = _pet.Networkowner;
            if (owner == null)
                return false;

            var slot = owner.inventory.slots[ownerInventoryIndex];
            var equipment = slot.item.data == null ? null : slot.item.data.TryCast<EquipmentItem>();
            if (equipment == null)
                return false;

            return equipment.CanEquipMercenary(_pet, equipmentSlot, showMessage: false);
        }

        public void Equip(int ownerInventoryIndex, int equipmentSlot)
            => Slots.CmdSwapInventoryEquip(ownerInventoryIndex, equipmentSlot);

        public void Unequip(int equipmentSlot) => Slots.CmdUnequip(equipmentSlot);
    }
}
