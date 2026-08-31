#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Comparison;
using HotRepl.Control;

namespace CombatVerification.Commands
{
    public sealed class BaselineCaptureArgs
    {
        public List<FixtureObservation> Fixtures { get; set; }
    }

    public sealed class BaselineCompareArgs
    {
        public VerificationBaseline Baseline { get; set; }
        public List<FixtureObservation> Fixtures { get; set; }
    }

    /// <summary>Creates baseline content for an explicit, reviewed update.</summary>
    public sealed class CaptureBaselineCommand
        : IControlCommandHandler<BaselineCaptureArgs, VerificationBaseline>
    {
        public string Name => "fixture.captureBaseline";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<VerificationBaseline>> ExecuteAsync(
            ControlCommandContext<VerificationBaseline> context,
            BaselineCaptureArgs args,
            CancellationToken cancellationToken)
        {
            try
            {
                return new ValueTask<ControlCommandResult<VerificationBaseline>>(
                    ControlCommandResult.Ok(VerificationBaselineGate.Capture(args?.Fixtures)));
            }
            catch (ComparisonException error)
            {
                return new ValueTask<ControlCommandResult<VerificationBaseline>>(
                    context.PreconditionFailed("invalidBaseline", error.Message));
            }
        }
    }

    /// <summary>Checks a current run without changing its reviewed baseline.</summary>
    public sealed class CompareBaselineCommand
        : IControlCommandHandler<BaselineCompareArgs, BaselineComparison>
    {
        public string Name => "fixture.compareBaseline";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<BaselineComparison>> ExecuteAsync(
            ControlCommandContext<BaselineComparison> context,
            BaselineCompareArgs args,
            CancellationToken cancellationToken)
        {
            try
            {
                return new ValueTask<ControlCommandResult<BaselineComparison>>(
                    ControlCommandResult.Ok(
                        VerificationBaselineGate.Compare(args?.Baseline, args?.Fixtures)));
            }
            catch (GameVersionDifferenceException error)
            {
                return new ValueTask<ControlCommandResult<BaselineComparison>>(
                    context.PreconditionFailed("gameVersionChanged", error.Message));
            }
            catch (ComparisonException error)
            {
                return new ValueTask<ControlCommandResult<BaselineComparison>>(
                    context.PreconditionFailed("invalidBaseline", error.Message));
            }
        }
    }
}
