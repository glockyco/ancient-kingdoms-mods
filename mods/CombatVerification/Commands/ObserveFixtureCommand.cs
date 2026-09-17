#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Fixtures;
using CombatVerification.Probes;
using HotRepl.Control;
using UnityEngine;

namespace CombatVerification.Commands
{
    public sealed class ObserveFixtureArgs
    {
        public FixtureDescriptor Fixture { get; set; }
    }

    /// <summary>
    /// Takes the measurement a fixture's tier declares from the character the harness built.
    /// </summary>
    /// <remarks>
    /// Reads only. Building the character and materializing the target are separate commands, so
    /// a failure here names a measurement rather than a mutation. A tier whose measurement needs a
    /// materialized target is refused until that materialization exists.
    /// </remarks>
    public sealed class ObserveFixtureCommand
        : IControlCommandHandler<ObserveFixtureArgs, ObserveFixtureResult>
    {
        public string Name => "fixture.observe";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<ObserveFixtureResult>> ExecuteAsync(
            ControlCommandContext<ObserveFixtureResult> context,
            ObserveFixtureArgs args,
            CancellationToken cancellationToken)
        {
            var fixture = args?.Fixture;
            if (fixture?.Execution?.Seed == null)
                return Done(context.PreconditionFailed("noFixture",
                    "A fixture with an execution seed is required."));

            switch (fixture.Tier)
            {
                case "A":
                    return Done(ObserveStatSheet(context, fixture));
                case "B":
                case "C":
                case "D":
                    return Done(context.PreconditionFailed("unsupportedTier",
                        $"Tier {fixture.Tier} needs a materialized target and a driven action "
                        + "sequence, which this command does not provide."));
                default:
                    return Done(context.PreconditionFailed("unknownTier",
                        $"Tier '{fixture.Tier}' declares no measurement."));
            }
        }

        private static ControlCommandResult<ObserveFixtureResult> ObserveStatSheet(
            ControlCommandContext<ObserveFixtureResult> context, FixtureDescriptor fixture)
        {
            var sheet = StatSheet.Read(out var unavailable);
            if (sheet == null)
                return context.PreconditionFailed("noLocalPlayer", unavailable);

            return ControlCommandResult.Ok(new ObserveFixtureResult
            {
                Tier = fixture.Tier,
                Seed = fixture.Execution.Seed.Value,
                GameVersion = Application.version,
                Fidelity = "state",
                Measurements = new List<Measurement>
                {
                    new Measurement
                    {
                        Quantity = "statSheet",
                        Unit = "stat",
                        SamplingUnit = "reading",
                        WindowSeconds = null,
                        Samples = new List<object> { sheet },
                        Counts = null,
                    },
                },
            });
        }

        private static ValueTask<ControlCommandResult<ObserveFixtureResult>> Done(
            ControlCommandResult<ObserveFixtureResult> result)
            => new ValueTask<ControlCommandResult<ObserveFixtureResult>>(result);
    }
}
