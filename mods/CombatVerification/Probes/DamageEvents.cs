#nullable disable
using System;
using System.Collections.Generic;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using Il2Cpp;
using Il2CppInterop.Runtime;
using UnityEngine.Events;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Listens to one caster's hit event for as long as it is held.
    /// </summary>
    /// <remarks>
    /// The reading has to be per hit, and only an event can do that. The engine publishes three
    /// candidates. The victim raises one carrying the attacker and the amount
    /// (<c>Combat.cs:97</c>) and one carrying the amount and the damage type
    /// (<c>Combat.cs:99</c>), and the caster raises one carrying the victim (<c>Combat.cs:93</c>).
    /// The first two are the ones that carry an amount, and neither can be subscribed to.
    /// <para>
    /// Both take two arguments, and adding a listener to a two-argument event constructs
    /// <c>InvokableCall&lt;T0,T1&gt;</c>. The game is compiled ahead of time, so a generic
    /// instantiation exists only where the game's own code uses it, and the game adds a listener to
    /// exactly one damage event: the single-argument <c>onDamageDealtTo</c>
    /// (<c>PetCombat.cs:5</c>). Subscribing to either two-argument event throws
    /// <c>MissingMethodException</c> for the constructor of <c>InvokableCall`2</c>. This was tried
    /// against the running game rather than assumed.
    /// <para>
    /// So the probe listens to the event that can be listened to, and takes the amount from the
    /// caster's running total, read inside the event. The total advances before the event is raised
    /// (<c>Combat.cs:1180</c> and <c>1370</c>), so the difference across one event is one hit.
    /// </para>
    /// </para>
    /// <para>
    /// The probe does not still the caster, unlike the interval probe. It exists to watch actions
    /// happen, so the loop that drives them has to keep running. The one change it makes is the
    /// listener, and it removes it when disposed.
    /// </para>
    /// </remarks>
    public sealed class DamageEvents : IDisposable
    {
        private readonly Player _caster;
        private readonly Combat _combat;
        private readonly DamageLog _log;
        private readonly UnityAction<Entity> _onHit;
        private readonly uint _casterNetId;
        private readonly IDisposable _attribution;
        private bool _listening;

        private DamageEvents(Player caster, Combat combat)
        {
            _caster = caster;
            _combat = combat;
            _casterNetId = caster.netId;
            _log = new DamageLog(combat.meterDamageDone);
            _onHit = DelegateSupport.ConvertDelegate<UnityAction<Entity>>(
                new Action<Entity>(OnHit));

            // The stamp costs an allocation per hit, so it is kept only while this probe is open.
            _attribution = DamageAttribution.Read();
            combat.onDamageDealtTo.AddListener(_onHit);
            _listening = true;
        }

        /// <summary>The hits recorded so far.</summary>
        public DamageLog Log => _log;

        /// <summary>
        /// Starts listening to the caster, or reports why it cannot be listened to.
        /// </summary>
        /// <remarks>
        /// A platform failure is reported rather than thrown. The caller runs inside a coroutine,
        /// where an exception ends the run without answering, and an unanswered job holds the
        /// concurrency slot until the game is restarted.
        /// </remarks>
        public static bool TryListen(Player caster, out DamageEvents events, out string unavailable)
        {
            events = null;

            if (caster == null)
            {
                unavailable = "no caster";
                return false;
            }

            var combat = caster.combat;
            if (combat == null || combat.onDamageDealtTo == null)
            {
                unavailable = $"'{caster.nameEntity}' raises no hit event";
                return false;
            }

            try
            {
                events = new DamageEvents(caster, combat);
            }
            catch (Exception ex)
            {
                unavailable = $"the hit event refused a listener: {ex.GetType().Name}: {ex.Message}";
                return false;
            }

            unavailable = null;
            return true;
        }

        public void Dispose()
        {
            if (!_listening)
                return;

            _listening = false;
            _combat.onDamageDealtTo.RemoveListener(_onHit);
            _attribution.Dispose();
        }

        /// <summary>
        /// Everything the window observed, with the totals that bound it.
        /// </summary>
        public PerHitDamageResult Measured(
            ActionTimeline timeline, int seed, double openedAt, double closedAt)
        {
            var tier = Tiers.Reached(
                DamageAttribution.Applied,
                DamageAttribution.Unavailable,
                _log.AllAttributed,
                out var limit);

            var hits = new List<LandedHit>(_log.Hits.Count);
            long total = 0;
            var absorbed = 0;

            foreach (var hit in _log.Hits)
            {
                total += hit.Amount;
                if (hit.Amount == 0)
                    absorbed++;

                hits.Add(new LandedHit
                {
                    Victim = hit.Victim,
                    VictimNetId = hit.VictimNetId,
                    Amount = hit.Amount,
                    At = hit.At,
                    Skill = hit.Skill,
                    DamageType = hit.DamageType,
                    Intent = hit.Intent,
                });
            }

            return new PerHitDamageResult
            {
                Caster = _caster == null ? null : _caster.nameEntity,
                OpenedAt = openedAt,
                ClosedAt = closedAt,
                Hits = hits,
                Absorbed = absorbed,
                Resets = _log.Resets,
                Total = total,
                Seed = seed,
                Tier = tier,
                TierLimit = limit,
                Actions = timeline.Completions.Count,
                ActionIntervals = new List<double>(timeline.Intervals),
            };
        }

        /// <summary>
        /// Records one hit. The victim's name is read now, because the entity can be destroyed
        /// before the window closes and the hit still happened.
        /// </summary>
        private void OnHit(Entity victim)
        {
            var at = ServerClock.TryRead(out var now) ? now : 0.0;
            var name = victim == null ? "unknown" : victim.nameEntity;
            var netId = victim == null ? 0u : victim.netId;

            // The stamp belongs to the hit in flight, and the event fires inside that same call. A
            // stamp naming another caster is not this subject's hit, so it is not read.
            var stamp = DamageAttribution.Current;
            if (stamp == null || stamp.Value.CasterNetId != _casterNetId)
            {
                _log.Observe(name, netId, _combat.meterDamageDone, at);
                return;
            }

            _log.Observe(
                name,
                netId,
                _combat.meterDamageDone,
                at,
                stamp.Value.SkillName,
                stamp.Value.DamageType.ToString(),
                stamp.Value.Intent);
        }
    }
}
