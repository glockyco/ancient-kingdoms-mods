#nullable disable
using System.Collections.Generic;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Turns repeated readings of the refractory period into the actions they imply.
    /// </summary>
    /// <remarks>
    /// The game publishes no action timestamp. At the end of every action it writes the moment the
    /// refractory period ends together with the length of that period, so the difference between the
    /// pair names the moment the action finished. A change in the pair is one completed action.
    /// <para>
    /// The first reading is a baseline and never an action. The pair it holds was written by an action
    /// that completed before the window opened, so an interval measured from it would include however
    /// long the subject stood idle.
    /// </para>
    /// <para>
    /// A pair that does not advance is not an action either. One skill clears the refractory period
    /// outright (<c>TargetBuffSkill.cs:478</c>), and a period that grows while haste drops can move a
    /// derived moment backwards. Counting either as an action would invent one and corrupt every
    /// interval after it.
    /// </para>
    /// </remarks>
    public sealed class ActionTimeline
    {
        private readonly List<double> _completions = new();
        private readonly List<double> _intervals = new();
        private bool _hasBaseline;
        private double _end;

        /// <summary>Moments actions completed during the window, in the game's server time.</summary>
        public IReadOnlyList<double> Completions => _completions;

        /// <summary>Intervals between consecutive completions. One completion yields none.</summary>
        public IReadOnlyList<double> Intervals => _intervals;

        /// <summary>Readings where the pair failed to advance, so no action completed.</summary>
        public int Resets { get; private set; }

        /// <summary>Readings taken, including the baseline.</summary>
        public int Readings { get; private set; }

        /// <summary>Records one reading of the moment the period ends and of its length.</summary>
        public void Observe(double refractoryEnd, double period)
        {
            Readings++;

            if (!_hasBaseline)
            {
                _hasBaseline = true;
                _end = refractoryEnd;
                return;
            }

            if (refractoryEnd == _end)
                return;

            _end = refractoryEnd;

            if (refractoryEnd <= 0)
            {
                Resets++;
                return;
            }

            var completed = refractoryEnd - period;
            if (_completions.Count > 0 && completed <= _completions[^1])
            {
                Resets++;
                return;
            }

            if (_completions.Count > 0)
                _intervals.Add(completed - _completions[^1]);

            _completions.Add(completed);
        }
    }
}
