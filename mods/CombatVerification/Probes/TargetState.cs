#nullable disable
using System.Collections.Generic;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using Il2Cpp;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Reads what a hit will meet on its way into a target.
    /// </summary>
    /// <remarks>
    /// It reads the target, not the caster. Everything the caster computes is intent; what a target
    /// keeps of it is decided here, by its defense, its block chance, each resist, and every effect
    /// currently changing them. Without this half a measured amount can only be calibrated against
    /// another measured amount, never derived.
    /// </remarks>
    public static class TargetState
    {
        /// <summary>Reads the target's mitigation state and the effects that change it.</summary>
        public static TargetStateResult Read(
            Entity target,
            IReadOnlyList<TimedEffect> before,
            IReadOnlyList<TimedEffect> after,
            int frames,
            double at)
        {
            var effects = new List<ActiveEffect>(after.Count);
            foreach (var effect in after)
            {
                effects.Add(new ActiveEffect
                {
                    Name = effect.Name,
                    Category = effect.Category,
                    Level = effect.Level,
                    Remaining = effect.Remaining,
                    Expired = effect.Expired,
                });
            }

            return new TargetStateResult
            {
                Target = target.nameEntity,
                TargetNetId = target.netId,
                Level = target.level.current,
                HealthCurrent = target.health.current,
                HealthMax = target.health.max,
                Stats = CombatStats.Read(target.combatMeter),
                Effects = effects,
                Cleared = EffectCleanup.Cleared(before, after),
                Lingering = EffectCleanup.Lingering(after),
                CleanedUp = Effects.IsCleanedUp(target),
                Frames = frames,
                At = at,
            };
        }
    }
}
