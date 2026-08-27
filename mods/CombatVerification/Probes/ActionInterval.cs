#nullable disable
using System.Collections.Generic;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using DataExporter;
using Il2Cpp;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Reads how often a character can act.
    /// </summary>
    /// <remarks>
    /// Two different quantities, and the difference matters. The refractory period is the gap the
    /// engine enforces after an action, computed once per action from the weapon delay and haste
    /// (<c>Player.cs:3238-3268</c>). An observed interval is the gap that actually occurred, which
    /// also carries the cast time of whatever ran and any moment the subject spent idle.
    /// <para>
    /// The probe stills the subject before it reads. An attack loop rewrites the refractory state
    /// between two samples, and a value rewritten between samples belongs to neither of them. Every
    /// reader of the loop flag also requires an attackable target (<c>Player.cs:2837</c> and three
    /// more), so clearing the flag stops the loop and the target is left alone. The target is what a
    /// fixture's own action declares, and a probe does not get to discard that.
    /// </para>
    /// </remarks>
    public static class ActionInterval
    {
        /// <summary>One reading of the state the engine writes at the end of every action.</summary>
        public readonly struct Reading
        {
            public Reading(double end, double period, string state)
            {
                End = end;
                Period = period;
                State = state;
            }

            /// <summary>The moment the refractory period ends, in the game's server time.</summary>
            public double End { get; }

            /// <summary>The length of that period.</summary>
            public double Period { get; }

            /// <summary>The state the subject reported.</summary>
            public string State { get; }

            /// <summary>Whether no action completed between this reading and another.</summary>
            public bool Matches(Reading other) => End == other.End && Period == other.Period;
        }

        /// <summary>Whether the subject is part way through an action.</summary>
        public static bool IsActing(Player player) => player.state == "CASTING";

        /// <summary>Reads the refractory state the engine holds.</summary>
        public static Reading Read(Player player) => new Reading(
            player.refractoryPeriodSkillTimeEnd,
            player.currentRefractoryPeriod,
            player.state);

        /// <summary>
        /// Stops the subject's own attack loop, and reports each value it cleared.
        /// </summary>
        /// <remarks>
        /// An action already in flight is not cancelled. It completes, the loop does not start
        /// another, and the caller waits for the subject to fall idle before it takes a baseline.
        /// Cancelling would discard an action a fixture may have just declared.
        /// </remarks>
        public static List<StoppedValue> Still(Player player)
        {
            var stopped = new List<StoppedValue>();

            if (player.pendingSkill != -1)
            {
                stopped.Add(new StoppedValue
                {
                    Name = "pendingSkill",
                    Held = SkillName(player, player.pendingSkill),
                });
                player.NetworkpendingSkill = -1;
            }

            if (player.continueFollowUpSkill != -1)
            {
                stopped.Add(new StoppedValue
                {
                    Name = "continueFollowUpSkill",
                    Held = SkillName(player, player.continueFollowUpSkill),
                });
                player.NetworkcontinueFollowUpSkill = -1;
            }

            return stopped;
        }

        /// <summary>Weapons worn, in slot order, each with the delay the engine reads from it.</summary>
        public static List<WornWeapon> Weapons(Player player)
        {
            var worn = new List<WornWeapon>();
            var equipment = player.equipment;

            for (var index = 0; index < equipment.slots.Count; index++)
            {
                var weapon = Containers.EquipmentIn(equipment, index)?.TryCast<WeaponItem>();
                if (weapon == null)
                    continue;

                worn.Add(new WornWeapon
                {
                    Slot = index,
                    ItemId = GameIds.Sanitize(weapon.name),
                    Category = weapon.category,
                    Delay = weapon.delay,
                });
            }

            return worn;
        }

        /// <summary>The reading the probe could not attribute, with the reason stated.</summary>
        public static ActionIntervalResult Unattributable(
            Player player, List<StoppedValue> stopped, Reading reading, string reason) =>
            new ActionIntervalResult
            {
                Stopped = stopped,
                Settled = false,
                Unattributable = reason,
                State = reading.State,
                RefractoryPeriod = reading.Period,
                RefractoryEnd = reading.End,
                Haste = player.combat.haste,
                Weapons = Weapons(player),
            };

        /// <summary>The measurement, once the subject settled and the window closed.</summary>
        public static ActionIntervalResult Measured(
            Player player,
            List<StoppedValue> stopped,
            Reading reading,
            ActionTimeline timeline,
            double openedAt,
            double closedAt) =>
            new ActionIntervalResult
            {
                Stopped = stopped,
                Settled = true,
                State = reading.State,
                RefractoryPeriod = reading.Period,
                RefractoryEnd = reading.End,
                Haste = player.combat.haste,
                Weapons = Weapons(player),
                OpenedAt = openedAt,
                ClosedAt = closedAt,
                Readings = timeline.Readings,
                Completions = new List<double>(timeline.Completions),
                Intervals = new List<double>(timeline.Intervals),
                Resets = timeline.Resets,
            };

        private static string SkillName(Player player, int index)
        {
            var skills = player.skills;
            if (skills == null || index < 0 || index >= skills.skills.Count)
                return null;

            var data = skills.skills[index].data;
            return data == null ? null : GameIds.Sanitize(data.name);
        }
    }
}
