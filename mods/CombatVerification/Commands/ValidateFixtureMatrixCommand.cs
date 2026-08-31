#nullable disable
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Fixtures;
using HotRepl.Control;

namespace CombatVerification.Commands
{
    /// <summary>Checks the complete comparison matrix against the running game's definitions.</summary>
    public sealed class ValidateFixtureMatrixCommand
        : IControlCommandHandler<FixtureMatrix, FixtureMatrixResult>
    {
        public string Name => "fixture.validateMatrix";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<FixtureMatrixResult>> ExecuteAsync(
            ControlCommandContext<FixtureMatrixResult> context,
            FixtureMatrix matrix,
            CancellationToken cancellationToken)
        {
            IFixtureRules rules = GameFixtureRules.Read(out string unavailable);
            if (rules == null)
                return new ValueTask<ControlCommandResult<FixtureMatrixResult>>(
                    context.PreconditionFailed("rulesUnavailable", unavailable));
            return new ValueTask<ControlCommandResult<FixtureMatrixResult>>(
                ControlCommandResult.Ok(FixtureMatrixValidator.Validate(matrix, rules)));
        }
    }
}
