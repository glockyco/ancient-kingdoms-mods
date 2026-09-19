#nullable disable
using System;
using System.Collections.Generic;
using CombatVerification.Dtos;

namespace CombatVerification.Probes
{
    /// <summary>Bounds per-frame readings to resource changes and one range per active effect.</summary>
    public sealed class WindowEvidence
    {
        private readonly List<ResourceTransition> _resources = new List<ResourceTransition>();
        private readonly List<EffectObservation> _effects = new List<EffectObservation>();
        private readonly Dictionary<string, EffectObservation> _effectsByIdentity =
            new Dictionary<string, EffectObservation>(StringComparer.Ordinal);

        public List<ResourceTransition> ResourceTransitions => _resources;
        public List<EffectObservation> ObservedEffects => _effects;

        public void Observe(
            double at, int mana, int energy, IReadOnlyList<TimedEffect> effects)
        {
            if (_resources.Count == 0
                || _resources[_resources.Count - 1].Mana != mana
                || _resources[_resources.Count - 1].Energy != energy)
            {
                _resources.Add(new ResourceTransition { At = at, Mana = mana, Energy = energy });
            }

            foreach (var effect in effects)
            {
                if (effect.Expired) continue;
                var identity = effect.SkillId ?? effect.Name;
                if (string.IsNullOrEmpty(identity)) continue;
                if (_effectsByIdentity.TryGetValue(identity, out var observed))
                {
                    observed.LastObservedAt = at;
                    continue;
                }

                observed = new EffectObservation
                {
                    SkillId = effect.SkillId,
                    Name = effect.Name,
                    FirstObservedAt = at,
                    LastObservedAt = at,
                };
                _effectsByIdentity.Add(identity, observed);
                _effects.Add(observed);
            }
        }
    }
}
