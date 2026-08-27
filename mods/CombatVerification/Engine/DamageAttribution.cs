#nullable disable
using System;
using HarmonyLib;
using Il2Cpp;

namespace CombatVerification.Engine
{
    /// <summary>
    /// Names the skill behind the hit the engine is dealing right now.
    /// </summary>
    /// <remarks>
    /// The hit event carries only the victim, so on its own it cannot tell two skills apart, and a
    /// rotation comparison needs exactly that. The skill is an argument of the damage entry point, and
    /// the entry point raises the hit event before it returns (<c>Combat.cs:1370</c>), so a value
    /// stamped on the way in is readable from inside the event and belongs to that same hit. This is
    /// the only sound pairing available: the game's other damage events fire from different sets of
    /// sites, so matching them by order pairs values that describe different hits.
    /// <para>
    /// The stamp also carries the amount the caster asked for, which no event publishes. With the
    /// health the victim actually lost beside it, mitigation becomes a measured quantity per hit
    /// rather than a derived one.
    /// </para>
    /// </remarks>
    public static class DamageAttribution
    {
        /// <summary>What the engine is dealing, while it is dealing it.</summary>
        public readonly struct Attribution
        {
            public Attribution(string skill, string damageType, int intent, uint casterNetId)
            {
                Skill = skill;
                DamageType = damageType;
                Intent = intent;
                CasterNetId = casterNetId;
            }

            /// <summary>The name of the skill the engine selected for this hit.</summary>
            public string Skill { get; }

            /// <summary>The school the hit is dealt in, which selects its mitigation.</summary>
            public string DamageType { get; }

            /// <summary>The amount the caster asked for, before the engine's own steps.</summary>
            public int Intent { get; }

            /// <summary>The caster, so a hit from another source is not read as the subject's.</summary>
            public uint CasterNetId { get; }
        }

        /// <summary>The hit in flight, or null when the engine is between hits.</summary>
        public static Attribution? Current { get; private set; }

        /// <summary>Whether the stamp is being applied at all.</summary>
        public static bool Applied { get; private set; }

        /// <summary>Why the stamp is unavailable, or null when it is available.</summary>
        public static string Unavailable { get; private set; } = "the patch has not been applied";

        /// <summary>
        /// Applies the stamp, and reports a failure rather than raising one.
        /// </summary>
        /// <remarks>
        /// A failure here costs attribution and nothing else. Every other reading stays exact, so the
        /// run continues at the lower tier and says which tier it reached.
        /// </remarks>
        public static void Apply(HarmonyLib.Harmony harmony)
        {
            try
            {
                harmony.PatchAll(typeof(DamageAttribution).Assembly);
                Applied = true;
                Unavailable = null;
            }
            catch (Exception ex)
            {
                Applied = false;
                Unavailable = $"{ex.GetType().Name}: {ex.Message}";
            }
        }

        [HarmonyPatch(typeof(Combat), nameof(Combat.DealDamageAt))]
        private static class DealDamageAtPatch
        {
            /// <summary>
            /// Stamps the hit on the way in, keeping whatever was stamped before it.
            /// </summary>
            /// <remarks>
            /// The previous value is restored rather than cleared, because one action can deal several
            /// hits and a skill that deals damage while resolving another would otherwise leave the
            /// outer hit unattributed.
            /// </remarks>
            [HarmonyPrefix]
            private static void Stamp(
                Combat __instance,
                int amountDamage,
                ScriptableSkill skill,
                DamageType damageType,
                out Attribution? __state)
            {
                __state = Current;

                Current = new Attribution(
                    skill == null ? null : skill.nameSkill,
                    damageType.ToString(),
                    amountDamage,
                    __instance == null || __instance.entity == null ? 0u : __instance.entity.netId);
            }

            [HarmonyPostfix]
            private static void Restore(Attribution? __state) => Current = __state;
        }
    }
}
