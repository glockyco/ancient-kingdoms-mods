#nullable disable
using System;
using System.Collections.Generic;
using System.Reflection;
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

        private PlayerUnderConstruction(Player player, PlayerSkills skills)
        {
            _player = player;
            _skills = skills;
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

            unavailable = null;
            return new PlayerUnderConstruction(player, skills);
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
    }
}
