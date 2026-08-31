#nullable disable
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Comparison;
using HotRepl.Control;

namespace CombatVerification.Commands
{
    /// <summary>Compares each predicted quantity with the values observed for one fixture.</summary>
    public sealed class CompareFixtureCommand
        : IControlCommandHandler<FixtureObservation, FixtureComparison>
    {
        public string Name => "fixture.compare";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<FixtureComparison>> ExecuteAsync(
            ControlCommandContext<FixtureComparison> context,
            FixtureObservation observation,
            CancellationToken cancellationToken)
        {
            try
            {
                return new ValueTask<ControlCommandResult<FixtureComparison>>(
                    ControlCommandResult.Ok(ComparisonEngine.CompareFixture(observation)));
            }
            catch (ComparisonException error)
            {
                return new ValueTask<ControlCommandResult<FixtureComparison>>(
                    context.PreconditionFailed("invalidComparison", error.Message));
            }
        }
    }
}
