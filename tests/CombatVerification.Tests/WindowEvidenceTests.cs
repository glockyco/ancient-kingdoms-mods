using System.Collections.Generic;
using CombatVerification.Dtos;
using CombatVerification.Probes;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace CombatVerification.Tests
{
    public sealed class WindowEvidenceTests
    {
        [Fact]
        public void RepeatedResourceStatesAreStoredOnce()
        {
            var evidence = new WindowEvidence();

            evidence.Observe(10, 100, 20, new List<TimedEffect>());
            evidence.Observe(11, 100, 20, new List<TimedEffect>());
            evidence.Observe(12, 90, 20, new List<TimedEffect>());
            evidence.Observe(13, 90, 25, new List<TimedEffect>());

            Assert.Collection(
                evidence.ResourceTransitions,
                state => Assert.Equal((10d, 100, 20), (state.At, state.Mana, state.Energy)),
                state => Assert.Equal((12d, 90, 20), (state.At, state.Mana, state.Energy)),
                state => Assert.Equal((13d, 90, 25), (state.At, state.Mana, state.Energy)));
        }

        [Fact]
        public void EffectEvidenceRetainsFirstAndLastSightings()
        {
            var evidence = new WindowEvidence();
            var active = new List<TimedEffect>
            {
                new TimedEffect("adrenaline_rush", "Adrenaline Rush", "haste", 1, 5f),
            };

            evidence.Observe(20, 100, 20, active);
            evidence.Observe(21, 100, 20, active);
            evidence.Observe(22, 100, 20, new List<TimedEffect>
            {
                new TimedEffect("adrenaline_rush", "Adrenaline Rush", "haste", 1, 0f),
            });

            var effect = Assert.Single(evidence.ObservedEffects);
            Assert.Equal("adrenaline_rush", effect.SkillId);
            Assert.Equal("Adrenaline Rush", effect.Name);
            Assert.Equal(20, effect.FirstObservedAt);
            Assert.Equal(21, effect.LastObservedAt);
        }

        [Fact]
        public void RuntimeTraceSerializesDiagnosticsAndBoundedEvidence()
        {
            var sample = new WindowSample
            {
                Attempts = new List<ActionAttempt>
                {
                    new ActionAttempt { At = 10, Skill = "Stab", Mana = 100, Energy = 20 },
                },
                ResourceTransitions = new List<ResourceTransition>
                {
                    new ResourceTransition { At = 10, Mana = 100, Energy = 20 },
                },
                ObservedEffects = new List<EffectObservation>
                {
                    new EffectObservation
                    {
                        SkillId = "adrenaline_rush",
                        Name = "Adrenaline Rush",
                        FirstObservedAt = 11,
                        LastObservedAt = 15,
                    },
                },
            };

            var json = JObject.Parse(JsonConvert.SerializeObject(sample));

            Assert.Single((JArray)json["attempts"]!);
            Assert.Single((JArray)json["resourceTransitions"]!);
            Assert.Single((JArray)json["observedEffects"]!);
        }
    }
}
