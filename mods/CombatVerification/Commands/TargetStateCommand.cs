#nullable disable
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using CombatVerification.Probes;
using HotRepl.Control;
using Il2Cpp;
using MelonLoader;

namespace CombatVerification.Commands
{
    /// <summary>
    /// Reads the local player's target: its mitigation state and the effects changing it.
    /// </summary>
    /// <remarks>
    /// A job rather than a synchronous read, because one reading is not enough. An effect whose time
    /// has run out stays in the list until the engine's cleanup pass removes it, and every stat
    /// aggregation walks the whole list, so a single reading can report a target that the next hit
    /// will not meet. The command reads, lets the pass run, and reads again.
    /// <para>
    /// It changes nothing. The waiting is the cost, and waiting is not a change.
    /// </para>
    /// </remarks>
    public sealed class TargetStateCommand
        : IControlCommandHandler<TargetStateArgs, TargetStateResult>
    {
        /// <summary>
        /// Frames to wait for the cleanup pass. The pass runs from the engine's own update, so one
        /// frame is enough when it runs at all, and a second frame covers the ordering between that
        /// update and this coroutine rather than assuming it.
        /// </summary>
        private const int CleanupFrames = 2;

        public string Name => "probe.targetState";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<TargetStateResult>> ExecuteAsync(
            ControlCommandContext<TargetStateResult> context,
            TargetStateArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<TargetStateResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<TargetStateResult>>(completion.Task);
        }

        private static IEnumerator RunCoroutine(
            ControlCommandContext<TargetStateResult> context,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<TargetStateResult>> completion)
        {
            if (!Subject.TryRead(context, out var player, out var refused))
            {
                completion.TrySetResult(refused);
                yield break;
            }

            var target = player.Networktarget;
            if (target == null)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "noTarget",
                    "The local player has no target. This probe reads the target, so target what "
                    + "the measurement is about first."));
                yield break;
            }

            if (!Subject.TryReadClock(context, out _, out refused))
            {
                completion.TrySetResult(refused);
                yield break;
            }

            var before = Effects.Read(target);

            var frames = 0;
            while (frames < CleanupFrames)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    completion.TrySetResult(context.PreconditionFailed("cancelled", "Cancelled."));
                    yield break;
                }

                yield return null;
                frames++;

                if (target == null)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        "targetLost", "The target went away between the two readings."));
                    yield break;
                }
            }

            ServerClock.TryRead(out var at);
            completion.TrySetResult(ControlCommandResult.Ok(
                TargetState.Read(target, before, Effects.Read(target), frames, at)));
        }
    }
}
