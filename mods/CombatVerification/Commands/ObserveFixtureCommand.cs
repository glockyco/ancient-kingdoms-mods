#nullable disable
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
    public sealed class ObserveFixtureCommand
        : IControlCommandHandler<ObserveFixtureArgs, ObserveFixtureResult>
    {
        public string Name => "fixture.observe";
        public int Version => 2;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<ObserveFixtureResult>> ExecuteAsync(
            ControlCommandContext<ObserveFixtureResult> context,
            ObserveFixtureArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<ObserveFixtureResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args, completion));
            return new ValueTask<ControlCommandResult<ObserveFixtureResult>>(completion.Task);
        }

        private static IEnumerator RunCoroutine(
            ControlCommandContext<ObserveFixtureResult> context,
            ObserveFixtureArgs args,
            TaskCompletionSource<ControlCommandResult<ObserveFixtureResult>> completion)
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
                completion.TrySetResult(ControlCommandResult.Ok(result));
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

            // Tier B has no timed window; it needs enough landed hits of its one action. Give it
            // a generous bound so the minimum decides, not the clock.
            var windows = fixture.Tier == "D" ? execution.Repetitions : 1;
            var seconds = fixture.Tier == "B"
                ? 4.0 * execution.Measurement.MinimumSamples.Value + 10.0
                : execution.DurationSeconds ?? 0.0;
            if (seconds <= 0)
            {
                completion.TrySetResult(context.PreconditionFailed("noWindow",
                    "A timed fixture must declare a positive window."));
                yield break;
            }

            var samples = new List<object>();
            var fidelity = (string)null;
            for (var window = 0; window < windows; window++)
            {
                UnityEngine.Random.InitState(execution.Seed.Value + window);
                var outcome = new FixtureWindow.Outcome();
                yield return FixtureWindow.RunCoroutine(player, target, priority, seconds, outcome);
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
                // Let the target and the follow-up loop settle before the next window.
                player.CmdCancelAction();
                for (var frame = 0; frame < 120; frame++) yield return null;
            }

            result.Fidelity = fidelity;
            result.Measurements.Add(new Measurement
            {
                Quantity = fixture.Tier == "B" ? "perHit" : fixture.Tier == "C" ? "actionInterval" : "window",
                Unit = fixture.Tier == "C" ? "second" : "damage",
                SamplingUnit = fixture.Tier == "D" ? "window" : "hit",
                WindowSeconds = seconds,
                Samples = samples,
            });
            completion.TrySetResult(ControlCommandResult.Ok(result));
        }
    }
}
