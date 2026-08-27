#nullable disable
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Probes;
using HotRepl.Control;

namespace CombatVerification.Commands
{
    /// <summary>Arguments for a stat sheet reading. It takes none.</summary>
    public sealed class StatSheetArgs
    {
    }

    /// <summary>
    /// Reads the complete combat state of the player and of every companion it holds.
    /// </summary>
    /// <remarks>
    /// Reads only, and changes nothing. Every value it reports is computed on demand by the game,
    /// so two readings with no action between them must agree, and a comparison that finds them
    /// differing has found something acting on the character.
    /// </remarks>
    public sealed class StatSheetCommand
        : IControlCommandHandler<StatSheetArgs, StatSheetResult>
    {
        public string Name => "probe.statSheet";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<StatSheetResult>> ExecuteAsync(
            ControlCommandContext<StatSheetResult> context,
            StatSheetArgs args,
            CancellationToken cancellationToken)
        {
            var sheet = StatSheet.Read(out var unavailable);

            return new ValueTask<ControlCommandResult<StatSheetResult>>(
                sheet == null
                    ? context.PreconditionFailed("noLocalPlayer", unavailable)
                    : ControlCommandResult.Ok(sheet));
        }
    }
}
