#nullable disable
using System;
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using HotReplCommands.World;
using Il2CppMirror;
using MelonLoader;
using UnityEngine.SceneManagement;

namespace HotReplCommands.Commands
{
    /// <summary>
    /// Drives the game to a spawned local player, without exporting. Shares
    /// <see cref="WorldEntry"/> with <c>compendium.export</c>.
    /// </summary>
    public sealed class WorldEnterCommand : IControlCommandHandler<EmptyArgs, WorldEnterResult>
    {
        public string Name => "world.enter";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<WorldEnterResult>> ExecuteAsync(
            ControlCommandContext<WorldEnterResult> context,
            EmptyArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<WorldEnterResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<WorldEnterResult>>(completion.Task);
        }

        private IEnumerator RunCoroutine(
            ControlCommandContext<WorldEnterResult> context,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<WorldEnterResult>> completion)
        {
            var core = RunCore(context, cancellationToken, completion);
            while (true)
            {
                object current;
                try
                {
                    if (!core.MoveNext())
                        yield break;
                    current = core.Current;
                }
                catch (OperationCanceledException)
                {
                    completion.TrySetCanceled(cancellationToken);
                    yield break;
                }
                catch (Exception ex)
                {
                    completion.TrySetException(ex);
                    yield break;
                }

                yield return current;
            }
        }

        private IEnumerator RunCore(
            ControlCommandContext<WorldEnterResult> context,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<WorldEnterResult>> completion)
        {
            if (NetworkClient.localPlayer == null)
            {
                WorldEntryOutcome outcome = null;
                yield return WorldEntry.EnterCoroutine(cancellationToken, o => outcome = o);
                if (outcome == null || !outcome.Ok)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        outcome?.Code ?? "worldEntryUnavailable",
                        outcome?.Message ?? "World entry failed with no error detail."));
                    yield break;
                }
            }

            var result = new WorldEnterResult
            {
                LocalPlayerReady = NetworkClient.localPlayer != null,
                Scene = SceneManager.GetActiveScene().name,
            };
            completion.TrySetResult(ControlCommandResult.Ok(result));
        }
    }
}
