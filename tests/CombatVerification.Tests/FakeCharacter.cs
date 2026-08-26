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
    }
}
