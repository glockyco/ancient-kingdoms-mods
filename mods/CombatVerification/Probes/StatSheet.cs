#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using CombatVerification.Fixtures;
using DataExporter;
using Il2Cpp;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Reads the complete combat state of the player and of each companion.
    /// </summary>
    /// <remarks>
    /// Nothing here is tabulated. A combat stat is a computed, read-only number on the combat
    /// component, an attribute is named by the member holding it, and an equipment contribution is
    /// a numeric bonus field on the item. Each set is therefore discovered from the game, so a stat
    /// a game update adds is reported without an edit here, and one that is removed stops being
    /// reported rather than being reported as zero.
    /// <para>
    /// The probe only reads. Every value it reports is a property the game computes on demand,
    /// which is why a reading is safe at any moment and why two readings taken without an action
    /// between them must agree.
    /// </para>
    /// </remarks>
    public static class StatSheet
    {
        /// <summary>Reads the local player and its companions, or reports why it cannot.</summary>
        public static StatSheetResult Read(out string unavailable)
        {
            var player = Player.localPlayer;
            if (player == null)
            {
                unavailable = "No local player exists. Enter the world before reading a stat sheet.";
                return null;
            }

            var companions = new List<EntitySheet>();
            foreach (var pet in new[]
            {
                player.activeMercenary, player.activeMercenary2,
                player.activeMercenary3, player.activeMercenary4,
            })
                if (pet != null)
                    companions.Add(Of(pet, "companion", pet.typeMonster, pet.raceName,
                        pet.level.current, pet.combat, pet.health, pet.mana, pet.energy,
                        SlotsOf(pet)));

            unavailable = null;
            return new StatSheetResult
            {
                Character = Of(player, "player", player.className, player.raceName,
                    player.level.current, player.combat, player.health, player.mana, player.energy,
                    SlotsOf(player)),
                Companions = companions,
            };
        }

        private static EntitySheet Of(
            object owner,
            string kind,
            string archetype,
            string race,
            int level,
            Combat combat,
            Health health,
            Mana mana,
            Energy energy,
            IReadOnlyList<ItemSlot> slots)
        {
            var attributes = new Dictionary<string, int>();
            foreach (var name in GameAttributes.NamesOn(owner.GetType()))
            {
                var component = GameAttributes.On(owner, name);
                if (component != null)
                    attributes[name] = component.value;
            }

            return new EntitySheet
            {
                Kind = kind,
                Archetype = archetype,
                Race = race,
                Level = level,
                Attributes = attributes,
                Combat = CombatStats(combat),
                Resources = new ResourceSheet
                {
                    HealthMax = health == null ? null : health.max,
                    HealthCurrent = health == null ? null : health.current,
                    HealthRecoveryRate = health == null ? null : health.recoveryRate,
                    HealthMultiplier = health == null ? null : health.multiplierHealth,
                    ManaMax = mana == null ? null : mana.max,
                    ManaRecoveryRate = mana == null ? null : mana.recoveryRate,
                    ManaMultiplier = mana == null ? null : mana.multiplierMana,
                    EnergyMax = energy == null ? null : energy.max,
                    EnergyRecoveryRate = energy == null ? null : energy.recoveryRate,
                    EnergyMultiplier = energy == null ? null : energy.multiplierEnergy,
                },
                Equipment = Pieces(slots),
                ActiveSets = Sets(slots, owner),
            };
        }

        /// <summary>
        /// Every combat stat, which is every numeric value the component computes and does not
        /// accept. A stat has no setter because it is derived from the base curve, the level and
        /// each bonus component, so that is what distinguishes one from a stored field.
        /// </summary>
        private static Dictionary<string, double> CombatStats(Combat combat)
        {
            var stats = new Dictionary<string, double>();

            foreach (var property in typeof(Combat)
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(property => property.CanRead && !property.CanWrite)
                .Where(property => property.PropertyType == typeof(int)
                    || property.PropertyType == typeof(float))
                .OrderBy(property => property.Name, StringComparer.Ordinal))
            {
                var value = property.GetValue(combat);
                stats[property.Name] = value is float single ? single : (int)value;
            }

            return stats;
        }

        /// <summary>
        /// Each armour set among the worn pieces, with the count the engine would count and the
        /// bonuses the set declares. The threshold that turns a count into an effect belongs to the
        /// game, so it is not applied here.
        /// </summary>
        private static List<ActiveSet> Sets(IReadOnlyList<ItemSlot> slots, object owner)
        {
            var byName = new Dictionary<string, ActiveSet>(StringComparer.Ordinal);

            for (var index = 0; index < slots.Count; index++)
            {
                var slot = slots[index];
                if (slot.amount <= 0 || slot.durability <= 0 || slot.item.data == null)
                    continue;

                var equipment = slot.item.data.TryCast<EquipmentItem>();
                var set = equipment == null ? null : equipment.augmentArmorBonusSet;
                if (set == null)
                    continue;

                if (!byName.TryGetValue(set.nameItem, out var active))
                {
                    var declaredSkills = new Dictionary<string, int>();
                    if (set.skillsBonusArmorSet != null)
                        foreach (var bonus in set.skillsBonusArmorSet)
                            if (bonus.skill != null)
                                declaredSkills[bonus.skill.nameSkill] = bonus.levelBonus;

                    var declared = new Dictionary<string, double>();
                    Accumulate(declared, set);

                    active = new ActiveSet
                    {
                        SetId = GameIds.Sanitize(set.name),
                        Name = set.nameItem,
                        DeclaredBonuses = declared,
                        DeclaredSkillBonuses = declaredSkills,
                        GrantedSkillBonuses = GrantedSkills(owner, declaredSkills.Keys),
                    };
                    byName[set.nameItem] = active;
                }

                active.PiecesWorn++;
            }

            return byName.Values.OrderBy(set => set.Name, StringComparer.Ordinal).ToList();
        }

        /// <summary>
        /// Skill levels the engine grants from armour, asked of the game rather than derived.
        /// A companion has no skill tree of this kind, so it grants none.
        /// </summary>
        private static Dictionary<string, int> GrantedSkills(
            object owner, IEnumerable<string> skillNames)
        {
            var granted = new Dictionary<string, int>();

            var player = owner as Player;
            var skills = player?.skills == null ? null : player.skills.TryCast<PlayerSkills>();
            if (skills == null)
                return granted;

            foreach (var name in skillNames)
                granted[name] = skills.GetArmorSetSkillBonusLevel(name);

            return granted;
        }

        private static IReadOnlyList<ItemSlot> SlotsOf(Player player)
        {
            var equipment = player.equipment.TryCast<PlayerEquipment>();
            return equipment == null ? new List<ItemSlot>() : Copy(equipment.slots);
        }

        private static IReadOnlyList<ItemSlot> SlotsOf(Pet pet)
        {
            var equipment = pet.equipment.TryCast<MercenaryEquipment>();
            return equipment == null ? new List<ItemSlot>() : Copy(equipment.slots);
        }

        private static List<ItemSlot> Copy(Il2CppMirror.SyncList<ItemSlot> slots)
        {
            var copied = new List<ItemSlot>();
            for (var index = 0; index < slots.Count; index++)
                copied.Add(slots[index]);

            return copied;
        }

        private static List<EquippedPiece> Pieces(IReadOnlyList<ItemSlot> slots)
        {
            var pieces = new List<EquippedPiece>();

            for (var index = 0; index < slots.Count; index++)
            {
                var slot = slots[index];
                if (slot.amount <= 0 || slot.item.data == null)
                    continue;

                var equipment = slot.item.data.TryCast<EquipmentItem>();

                pieces.Add(new EquippedPiece
                {
                    Slot = index,
                    ItemId = GameIds.Sanitize(slot.item.data.name),
                    AugmentId = string.IsNullOrEmpty(slot.augmentName)
                        ? null
                        : GameIds.Sanitize(slot.augmentName),
                    Durability = slot.durability,

                    // The engine counts a slot only above zero durability, so a piece that
                    // contributes nothing is reported with an empty contribution rather than with
                    // the numbers it would have carried.
                    Contributes = slot.durability > 0,
                    Contribution = slot.durability > 0 && equipment != null
                        ? Bonuses(equipment, slot.augmentName)
                        : new Dictionary<string, double>(),
                });
            }

            return pieces;
        }

        /// <summary>
        /// What one slot adds, which is the item's own bonuses plus its augment's. The engine reads
        /// these fields directly when it aggregates, so this is the same data and not a model of it.
        /// </summary>
        private static Dictionary<string, double> Bonuses(EquipmentItem item, string augmentName)
        {
            var totals = new Dictionary<string, double>();
            Accumulate(totals, item);

            if (!string.IsNullOrEmpty(augmentName)
                && GameManager.cacheItems.TryGetValue(augmentName.GetStableHashCode(), out var cached))
            {
                var augment = cached.TryCast<AugmentItem>();
                if (augment != null)
                    Accumulate(totals, augment);
            }

            return totals;
        }

        /// <summary>
        /// Adds every numeric bonus the asset declares. A bonus is named for what it raises, so the
        /// naming is what identifies one rather than a list kept here.
        /// </summary>
        private static void Accumulate(Dictionary<string, double> totals, ScriptableItem asset)
        {
            foreach (var field in asset.GetType()
                .GetFields(BindingFlags.Public | BindingFlags.Instance)
                .Where(field => field.Name.EndsWith("Bonus", StringComparison.Ordinal))
                .Where(field => field.FieldType == typeof(int) || field.FieldType == typeof(float)))
            {
                var value = field.GetValue(asset);
                var amount = value is float single ? single : (int)value;
                if (amount == 0)
                    continue;

                totals.TryGetValue(field.Name, out var running);
                totals[field.Name] = running + amount;
            }

            foreach (var property in asset.GetType()
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(property => property.CanRead)
                .Where(property => property.Name.EndsWith("Bonus", StringComparison.Ordinal))
                .Where(property => property.PropertyType == typeof(int)
                    || property.PropertyType == typeof(float)))
            {
                var value = property.GetValue(asset);
                var amount = value is float single ? single : (int)value;
                if (amount == 0)
                    continue;

                totals.TryGetValue(property.Name, out var running);
                totals[property.Name] = running + amount;
            }
        }
    }
}
