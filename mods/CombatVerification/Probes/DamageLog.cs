#nullable disable
using System.Collections.Generic;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Turns a running damage total, read once per hit, into the hits it is made of.
    /// </summary>
    /// <remarks>
    /// A mean taken over completed actions is not a damage measurement. It mixes the hits that landed
    /// with the ones the target avoided, so two configurations differing in accuracy are not
    /// comparable through it. Each amount here belongs to one hit.
    /// <para>
    /// The caster publishes only a cumulative total, so the amount of a single hit is a difference
    /// between two readings of it. That is sound only when the readings are taken one hit apart,
    /// which is why the caller reads inside the hit event rather than on a timer: a reading that
    /// spans two hits reports their sum as one, and a reading taken twice between hits invents a hit
    /// of zero.
    /// </para>
    /// <para>
    /// Every amount here is a landing. An action that missed or was fully resisted leaves the damage
    /// pipeline before it raises the hit event (<c>Combat.cs:716</c> jumps past the raise at
    /// <c>1370</c>), so a miss is invisible to this log and the count of hits is not the count of
    /// actions. That is the point rather than a shortcoming: a mean over actions is not a damage
    /// measurement. How often an action missed comes from comparing this count with the action
    /// interval probe's over one window.
    /// </para>
    /// <para>
    /// A difference of zero is still kept. It means the pipeline reached the end and the victim lost
    /// no health anyway, which a mana shield absorbing the hit produces, and which a victim already
    /// at zero health produces. Discarding it would hide an absorb.
    /// </para>
    /// </remarks>
    public sealed class DamageLog
    {
        private readonly List<Hit> _hits = new List<Hit>();
        private long _total;

        /// <summary>Starts from the total the caster already holds, which is not damage of ours.</summary>
        public DamageLog(long totalAtOpen) => _total = totalAtOpen;

        /// <summary>One hit, as the difference between two readings of the caster's total.</summary>
        public readonly struct Hit
        {
            public Hit(string victim, uint victimNetId, int amount, double at)
            {
                Victim = victim;
                VictimNetId = victimNetId;
                Amount = amount;
                At = at;
            }

            /// <summary>The entity the engine named as the subject of this hit.</summary>
            public string Victim { get; }

            /// <summary>That entity's network identity, which names it when two share a name.</summary>
            public uint VictimNetId { get; }

            /// <summary>
            /// The health the victim lost. This is not the damage the pipeline computed when the
            /// victim had less health than the hit, because the total counts health rather than
            /// intent.
            /// </summary>
            public int Amount { get; }

            /// <summary>The moment the hit was recorded, in the game's server time.</summary>
            public double At { get; }
        }

        /// <summary>Hits recorded, in arrival order.</summary>
        public IReadOnlyList<Hit> Hits => _hits;

        /// <summary>
        /// Readings where the total moved backwards, so no hit could be derived from it.
        /// </summary>
        /// <remarks>
        /// The engine clears both meters together when a fight ends (<c>Combat.cs:486</c>). A cleared
        /// total would otherwise present as one hit of a large negative amount, and every hit after
        /// it would be measured from the wrong base.
        /// </remarks>
        public int Resets { get; private set; }

        /// <summary>Records one hit against the total the caster holds at that moment.</summary>
        public void Observe(string victim, uint victimNetId, long totalNow, double at)
        {
            if (totalNow < _total)
            {
                Resets++;
                _total = totalNow;
                return;
            }

            _hits.Add(new Hit(victim, victimNetId, (int)(totalNow - _total), at));
            _total = totalNow;
        }
    }
}
