#nullable disable
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using CombatVerification.Fixtures;
using CombatVerification.Materialization;
using CombatVerification.Probes;
using HotRepl.Control;
using HotRepl.Control.Artifacts;
using HotReplCommands.Isolation;
using Il2Cpp;
using MelonLoader;
using Newtonsoft.Json;
using UnityEngine;

namespace CombatVerification.Commands
{
    public sealed class ObserveFixtureArgs
    {
        [JsonProperty("fixture", Required = Required.Always)]
        public FixtureDescriptor Fixture { get; set; }
    }

    /// <summary>
    /// Takes the measurement a fixture's tier declares from the character the harness built.
    /// </summary>
    /// <remarks>
    /// Tier A reads the stat sheet where the character stands. The other tiers travel to the
    /// declared target, read it back, and drive the declared actions for the declared windows. Every
    /// consumable the build declares is used once first, through the game's own use command, and the
    /// effects on the player are recorded so the comparison sees the state the sheet was read under.
    /// </remarks>
    /// <summary>What the command returns inline; the full record travels as an artifact.</summary>
    public sealed class ObserveFixtureSummary
    {
        [JsonProperty("tier")] public string Tier { get; set; }
        [JsonProperty("fidelity")] public string Fidelity { get; set; }
        [JsonProperty("measurements")] public int Measurements { get; set; }
        /// <summary>The artifact key under which the full observation record is returned.</summary>
        [JsonProperty("artifact")] public string Artifact { get; set; }
    }

    public sealed class ObserveFixtureCommand
        : IControlCommandHandler<ObserveFixtureArgs, ObserveFixtureSummary>
    {
        public const string ArtifactKey = "observation";
        private const string ArtifactFileName = "observation.json";

        public string Name => "fixture.observe";
        public int Version => 3;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<ObserveFixtureSummary>> ExecuteAsync(
            ControlCommandContext<ObserveFixtureSummary> context,
            ObserveFixtureArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<ObserveFixtureSummary>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args, completion));
            return new ValueTask<ControlCommandResult<ObserveFixtureSummary>>(completion.Task);
        }

        /// <summary>
        /// Writes the record beside the scratch database, which the run owns, and returns it as an
        /// artifact. A window of hits exceeds what the command channel carries inline.
        /// </summary>
        private static ControlCommandResult<ObserveFixtureSummary> Deliver(
            ControlCommandContext<ObserveFixtureSummary> context, ObserveFixtureResult result)
        {
            var database = GameManager.pathFileDB;
            if (!ScratchDatabase.IsScratch(database))
                return context.PreconditionFailed("notScratch",
                    "The observation is written only beside a scratch database.");
            var path = System.IO.Path.Combine(System.IO.Path.GetDirectoryName(database), ArtifactFileName);
            System.IO.File.WriteAllText(path, JsonConvert.SerializeObject(result));
            var info = new System.IO.FileInfo(path);
            string sha;
            using (var hasher = System.Security.Cryptography.SHA256.Create())
            using (var stream = System.IO.File.OpenRead(path))
                sha = System.BitConverter.ToString(hasher.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
            var artifacts = new Dictionary<string, ArtifactRef>
            {
                [ArtifactKey] = new ArtifactRef(
                    LogicalName: ArtifactKey,
                    Uri: new System.Uri(System.IO.Path.GetFullPath(path)).AbsoluteUri,
                    Path: path,
                    ContentType: "application/json",
                    ByteSize: info.Length,
                    Sha256: sha,
                    Finalized: true),
            };
            return ControlCommandResult.Ok(new ObserveFixtureSummary
            {
                Tier = result.Tier,
                Fidelity = result.Fidelity,
                Measurements = result.Measurements.Count,
                Artifact = ArtifactKey,
            }, artifacts);
        }

        /// <summary>
        /// Seconds for one listed skill to land the minimum number of samples: its cooldown or,
        /// when it has none, four seconds per cycle, with headroom for casts that land nothing.
        /// </summary>
        private static double TierBWindowSeconds(Player player, IReadOnlyList<int> priority, int minimumSamples)
        {
            var cycle = 0.0;
            foreach (var index in priority)
                cycle = Math.Max(cycle, player.skills.skills[index].cooldown);
            if (cycle <= 0) cycle = 4.0;
            // Half again as many cycles as samples: an avoided or blocked cast lands nothing, and
            // the window closes as soon as the samples are in hand.
            return cycle * Math.Ceiling(minimumSamples * 1.5) + 10.0;
        }

        private static void RestoreSkillState(Skills ownerSkills, HashSet<string> carriedEffects)
        {
            var skills = ownerSkills.skills;
            for (var i = 0; i < skills.Count; i++)
            {
                var skill = skills[i];
                skill.cooldownEnd = 0;
                skills[i] = skill;
            }
            var buffs = ownerSkills.buffs;
            for (var i = buffs.Count - 1; i >= 0; i--)
            {
                if (carriedEffects == null || !carriedEffects.Contains(buffs[i].name))
                    buffs.RemoveAt(i);
            }
        }

        private static void RestoreInitialState(
            Player player, Monster target, HashSet<string> carriedEffects)
        {
            RestoreSkillState(player.skills, carriedEffects);
            RestoreSkillState(target.skills, null);
            foreach (var pet in new[]
            {
                player.activeMercenary, player.activeMercenary2,
                player.activeMercenary3, player.activeMercenary4,
            })
            {
                if (pet == null) continue;
                pet.skills.CancelCast();
                pet.skills.NetworkcurrentSkill = -1;
                pet.Networktarget = null;
                pet.health.current = pet.health.max;
                if (pet.mana != null) pet.mana.current = pet.mana.max;
                if (pet.energy != null) pet.energy.current = pet.energy.max;
                RestoreSkillState(pet.skills, null);
            }
        }

        private static IEnumerator RunCoroutine(
            ControlCommandContext<ObserveFixtureSummary> context,
            ObserveFixtureArgs args,
            TaskCompletionSource<ControlCommandResult<ObserveFixtureSummary>> completion)
        {
            var fixture = args?.Fixture;
            if (fixture?.Execution?.Seed == null || fixture.Execution.Measurement?.MinimumSamples == null)
            {
                completion.TrySetResult(context.PreconditionFailed("noFixture",
                    "A fixture with an execution seed and measurement is required."));
                yield break;
            }
            if (!Subject.TryRead(context, out var player, out var refused))
            {
                completion.TrySetResult(refused);
                yield break;
            }

            var consumablesUsed = new List<string>();
            foreach (var item in fixture.BuildData?.Consumables ?? new List<CombatVerification.Builds.ItemQuantity>())
            {
                var index = Containers.IndexOf(player.inventory, item.ItemId, null);
                if (index < 0)
                {
                    completion.TrySetResult(context.PreconditionFailed("consumableMissing",
                        $"The inventory holds no '{item.ItemId}' to use."));
                    yield break;
                }
                player.inventory.CmdUseItem(index);
                consumablesUsed.Add(item.ItemId);
                yield return null;
                yield return null;
            }

            var effects = Effects.Read(player).Select(effect => new ActiveEffect
            {
                SkillId = effect.SkillId,
                Name = effect.Name,
                Category = effect.Category,
                Level = effect.Level,
                Remaining = effect.Remaining,
                Expired = effect.Expired,
            }).ToList();

            var result = new ObserveFixtureResult
            {
                Tier = fixture.Tier,
                Seed = fixture.Execution.Seed.Value,
                Character = new MeasuredCharacter { Class = player.className, Level = player.level.current },
                GameVersion = Application.version,
                ConsumablesUsed = consumablesUsed,
                ActiveEffects = effects,
                Measurements = new List<Measurement>(),
            };

            if (fixture.Tier == "A")
            {
                var sheet = StatSheet.Read(out var unavailable);
                if (sheet == null)
                {
                    completion.TrySetResult(context.PreconditionFailed("noLocalPlayer", unavailable));
                    yield break;
                }
                result.Fidelity = "state";
                result.Measurements.Add(new Measurement
                {
                    Quantity = "statSheet",
                    Unit = "stat",
                    SamplingUnit = "reading",
                    Samples = new List<object> { new StatSheetSample { Sheet = sheet, ActiveEffects = effects } },
                });
                completion.TrySetResult(Deliver(context, result));
                yield break;
            }

            if (fixture.Tier != "B" && fixture.Tier != "C" && fixture.Tier != "D")
            {
                completion.TrySetResult(context.PreconditionFailed("unknownTier",
                    $"Tier '{fixture.Tier}' declares no measurement."));
                yield break;
            }

            var execution = fixture.Execution;
            if (execution.Target?.Spawn == null || execution.Target.Level == null)
            {
                completion.TrySetResult(context.PreconditionFailed("noTarget",
                    "A timed or per-hit fixture must declare its target spawn and level."));
                yield break;
            }
            if (execution.Actions == null || execution.Actions.Count == 0)
            {
                completion.TrySetResult(context.PreconditionFailed("noActions",
                    "A timed or per-hit fixture must declare its actions."));
                yield break;
            }
            if (!FixtureWindow.TryResolveActions(player, execution.Actions, out var priority, out var failure))
            {
                completion.TrySetResult(context.PreconditionFailed("unknownAction", failure));
                yield break;
            }

            var target = TargetMaterializer.FindMostIsolated(
                execution.Target.Spawn, execution.Target.Level.Value, out failure);
            if (target == null)
            {
                completion.TrySetResult(context.PreconditionFailed("noSpawn", failure));
                yield break;
            }
            var approach = new TargetMaterializer.Approach();
            yield return TargetMaterializer.ApproachCoroutine(
                player, target, execution.Actions[0].Facing, approach);
            if (approach.Failure != null)
            {
                completion.TrySetResult(context.PreconditionFailed("targetUnreached", approach.Failure));
                yield break;
            }
            result.Target = approach.Readback;

            // Tier B has no timed window. A damaging action needs enough landed hits; a target
            // debuff needs one settled target-state reading after the effect lands. Both use the
            // action's cooldown to bound the attempt without making the clock the sample count.
            var measuresTargetEffect = fixture.Tier == "B"
                && priority.Count == 1
                && player.skills.skills[priority[0]].data.TryCast<TargetDebuffSkill>() != null;
            var windows = fixture.Tier == "D" ? execution.Repetitions : 1;
            var seconds = fixture.Tier == "B"
                ? TierBWindowSeconds(player, priority, execution.Measurement.MinimumSamples.Value)
                : execution.DurationSeconds ?? 0.0;
            if (seconds <= 0)
            {
                completion.TrySetResult(context.PreconditionFailed("noWindow",
                    "A timed fixture must declare a positive window."));
                yield break;
            }

            var companionIds = new List<string>();
            foreach (var companion in fixture.BuildData.Companions)
                companionIds.Add(companion.EntityId);

            var carriedEffects = new HashSet<string>(effects.Select(effect => effect.Name), StringComparer.Ordinal);
            var samples = new List<object>();
            var fidelity = (string)null;
            for (var window = 0; window < windows; window++)
            {
                UnityEngine.Random.InitState(execution.Seed.Value + window);
                var outcome = new FixtureWindow.Outcome();
                yield return FixtureWindow.RunCoroutine(
                    player, target, priority, seconds, companionIds,
                    keepResourcesFull: fixture.Tier == "B",
                    stopAfterListedHits: fixture.Tier == "B" && !measuresTargetEffect
                        ? execution.Measurement.MinimumSamples.Value
                        : 0,
                    stopAfterListedEffect: measuresTargetEffect,
                    outcome: outcome);
                if (outcome.Failure != null)
                {
                    completion.TrySetResult(context.PreconditionFailed("windowFailed",
                        $"Window {window + 1} of {windows}: {outcome.Failure}"));
                    yield break;
                }
                samples.Add(outcome.Sample);
                fidelity = fidelity == null || outcome.Sample.Fidelity == fidelity
                    ? outcome.Sample.Fidelity
                    : "mixed";
                // Every window repeats the fixture's initial state, which is what the engine runs:
                // the follow-up loop stops, every cooldown clears, and any effect the window added
                // is removed. The effects the character carried before the first window stay.
                player.CmdCancelAction();
                RestoreInitialState(player, target, carriedEffects);
                // PetSkills samples its next special-action time up to four seconds ahead. Wait past
                // that private timer so the next window starts from the engine model's ready state.
                for (var frame = 0; frame < 300; frame++) yield return null;
            }

            result.Fidelity = fidelity;
            result.Measurements.Add(new Measurement
            {
                Quantity = measuresTargetEffect
                    ? "targetState"
                    : fixture.Tier == "B" ? "perHit" : fixture.Tier == "C" ? "actionInterval" : "window",
                Unit = measuresTargetEffect ? "state" : fixture.Tier == "C" ? "second" : "damage",
                SamplingUnit = measuresTargetEffect ? "reading" : fixture.Tier == "D" ? "window" : "hit",
                WindowSeconds = seconds,
                Samples = samples,
            });
            completion.TrySetResult(Deliver(context, result));
        }
    }
}
