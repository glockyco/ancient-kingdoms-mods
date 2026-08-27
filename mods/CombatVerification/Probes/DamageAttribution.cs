#nullable disable
using System;
using HarmonyLib;
using Il2Cpp;

namespace CombatVerification.Probes
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
    /// <para>
    /// The entry point runs for every hit any entity deals, so the stamp is kept only while something
    /// is reading it, and it holds the values the engine already had rather than converting them.
    /// Both strings a reader wants cost an allocation each: the skill name is an IL2CPP field that
    /// marshals a fresh string, and the damage type is an enum whose name has to be built. Paying
    /// that per hit across a populated world would make the harness a cost during play, and a
    /// measurement reads at most a few hundred hits.
    /// </para>
    /// </remarks>
    public static class DamageAttribution
    {
        private static int _readers;

        /// <summary>What the engine is dealing, while it is dealing it.</summary>
        public readonly struct Attribution
        {
            public Attribution(ScriptableSkill skill, DamageType damageType, int intent, uint casterNetId)
            {
                Skill = skill;
                DamageType = damageType;
                Intent = intent;
                CasterNetId = casterNetId;
            }

            /// <summary>The skill the engine selected for this hit, or null when it named none.</summary>
            public ScriptableSkill Skill { get; }

            /// <summary>The school the hit is dealt in, which selects its mitigation.</summary>
            public DamageType DamageType { get; }

            /// <summary>The amount the caster asked for, before the engine's own steps.</summary>
            public int Intent { get; }

            /// <summary>The caster, so a hit from another source is not read as the subject's.</summary>
            public uint CasterNetId { get; }

            /// <summary>
            /// The skill's name, built on demand because building it is the expensive part.
            /// </summary>
            public string SkillName => Skill == null ? null : Skill.nameSkill;
        }

        /// <summary>The hit in flight, or null when the engine is between hits.</summary>
        public static Attribution? Current { get; private set; }

        /// <summary>Whether the stamp applied at all.</summary>
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

        /// <summary>Starts keeping the stamp, until the returned reader is disposed.</summary>
        /// <remarks>
        /// Counted rather than a flag, so two measurements running at once cannot switch each other
        /// off. Between readers the stamp costs a comparison per hit and nothing else.
        /// </remarks>
        public static IDisposable Read() => new Reader();

        private sealed class Reader : IDisposable
        {
            private bool _released;

            public Reader() => _readers++;

            public void Dispose()
            {
                if (_released)
                    return;

                _released = true;
                _readers--;
                if (_readers == 0)
                    Current = null;
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
                if (_readers == 0)
                {
                    __state = null;
                    return;
                }

                __state = Current;

                Current = new Attribution(
                    skill,
                    damageType,
                    amountDamage,
                    __instance == null || __instance.entity == null ? 0u : __instance.entity.netId);
            }

            [HarmonyPostfix]
            private static void Restore(Attribution? __state)
            {
                if (_readers != 0)
                    Current = __state;
            }
        }
    }
}
