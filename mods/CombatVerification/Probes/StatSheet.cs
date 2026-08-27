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
                    companions.Add(Of(
                        owner: pet,
                        kind: "companion",
                        archetype: pet.typeMonster,
                        race: pet.raceName,
                        level: pet.level.current,
                        combat: pet.combat,
                        health: pet.health,
                        mana: pet.mana,
                        energy: pet.energy,
                        equipment: pet.equipment));

            unavailable = null;
            return new StatSheetResult
            {
                Character = Of(
                    owner: player,
                    kind: "player",
                    archetype: player.className,
                    race: player.raceName,
                    level: player.level.current,
                    combat: player.combat,
                    health: player.health,
                    mana: player.mana,
                    energy: player.energy,
                    equipment: player.equipment),
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
            ItemContainer equipment)
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
                Combat = CombatStats.Read(combat),
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
                Equipment = Pieces(equipment),
                ActiveSets = Sets(equipment, owner),
            };
        }

        /// <summary>
        /// Each armour set among the worn pieces, with the count the engine would count and the
        /// bonuses the set declares. The threshold that turns a count into an effect belongs to the
        /// game, so it is not applied here.
        /// </summary>
        private static List<ActiveSet> Sets(ItemContainer equipment, object owner)
        {
            var byName = new Dictionary<string, ActiveSet>(StringComparer.Ordinal);

            foreach (var slot in Containers.Read(equipment))
            {
                if (!slot.Counts)
                    continue;

                var item = Containers.EquipmentIn(equipment, slot.Index);
                var set = item == null ? null : item.augmentArmorBonusSet;
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

        private static List<EquippedPiece> Pieces(ItemContainer equipment)
        {
            var pieces = new List<EquippedPiece>();

            foreach (var slot in Containers.Read(equipment))
            {
                if (!slot.Occupied)
                    continue;

                var item = Containers.EquipmentIn(equipment, slot.Index);

                pieces.Add(new EquippedPiece
                {
                    Slot = slot.Index,
                    ItemId = slot.ItemId,
                    AugmentId = slot.AugmentId,
                    Durability = slot.Durability,

                    // A piece the engine does not count is reported with an empty contribution
                    // rather than with the numbers it would have carried.
                    Contributes = slot.Counts,
                    Contribution = slot.Counts && item != null
                        ? Bonuses(item, slot.AugmentId)
                        : new Dictionary<string, double>(),
                });
            }

            return pieces;
        }

        /// <summary>
        /// What one slot adds, which is the item's own bonuses plus its augment's. The engine reads
        /// these fields directly when it aggregates, so this is the same data and not a model of it.
        /// </summary>
        private static Dictionary<string, double> Bonuses(EquipmentItem item, string augmentId)
        {
            var totals = new Dictionary<string, double>();
            Accumulate(totals, item);

            var augment = GameItems.Find(augmentId);
            if (augment != null)
            {
                var asAugment = augment.TryCast<AugmentItem>();
                if (asAugment != null)
                    Accumulate(totals, asAugment);
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
