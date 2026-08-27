#nullable disable
using System.Collections.Generic;
using Il2Cpp;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Reads the timed effects any entity carries.
    /// </summary>
    /// <remarks>
    /// The list is held by a <c>Skills</c> component that a player, a monster and a companion each
    /// declare separately rather than inherit, so it is reached as a component instead of through a
    /// declared member. That is how the game itself reaches the combat component from a bare entity
    /// (<c>Entity.cs:117</c>), and it means one reader serves every kind of subject.
    /// </remarks>
    public static class Effects
    {
        /// <summary>Every effect the entity carries, in the engine's own order.</summary>
        public static List<TimedEffect> Read(Entity entity)
        {
            var effects = new List<TimedEffect>();
            if (entity == null)
                return effects;

            var skills = entity.GetComponent<Skills>();
            if (skills == null)
                return effects;

            foreach (var buff in skills.buffs)
            {
                var data = buff.data;
                effects.Add(new TimedEffect(
                    data == null ? "unknown" : data.nameSkill,
                    data == null ? string.Empty : data.categoryBuff ?? string.Empty,
                    buff.level,
                    buff.BuffTimeRemaining()));
            }

            return effects;
        }

        /// <summary>
        /// Whether the engine runs its own update on this entity, which is what removes an effect
        /// whose time has run out.
        /// </summary>
        /// <remarks>
        /// Reported rather than assumed. When this is false the cleanup pass never runs, so two
        /// readings agree while an expired effect keeps contributing, and an unchanged pair would
        /// otherwise read as a settled state.
        /// </remarks>
        public static bool IsCleanedUp(Entity entity) =>
            entity != null && entity.IsWorthUpdating();
    }
}
