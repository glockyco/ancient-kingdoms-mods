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
    public sealed class WorldEnterCommand : IControlCommandHandler<WorldEnterArgs, WorldEnterResult>
    {
        public string Name => "world.enter";
        public int Version => 2;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<WorldEnterResult>> ExecuteAsync(
            ControlCommandContext<WorldEnterResult> context,
            WorldEnterArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<WorldEnterResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args?.Character, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<WorldEnterResult>>(completion.Task);
        }

        private IEnumerator RunCoroutine(
            ControlCommandContext<WorldEnterResult> context,
            string requestedCharacter,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<WorldEnterResult>> completion)
        {
            var core = RunCore(context, requestedCharacter, cancellationToken, completion);
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
            string requestedCharacter,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<WorldEnterResult>> completion)
        {
            var character = WorldEntry.HeldCharacterName();

            if (NetworkClient.localPlayer == null)
            {
                WorldEntryOutcome outcome = null;
                yield return WorldEntry.EnterCoroutine(cancellationToken, requestedCharacter, o => outcome = o);
                if (outcome == null || !outcome.Ok)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        outcome?.Code ?? "worldEntryUnavailable",
                        outcome?.Message ?? "World entry failed with no error detail."));
                    yield break;
                }

                character = outcome.Character;
            }
            else if (!string.IsNullOrWhiteSpace(requestedCharacter)
                     && !string.Equals(character, requestedCharacter, StringComparison.OrdinalIgnoreCase))
            {
                // Leaving an entered world is not a path the game's own flow exercises,
                // so report the conflict rather than attempt it.
                completion.TrySetResult(context.PreconditionFailed(
                    "characterAlreadyEntered",
                    $"The world already holds '{character}'; cannot switch to '{requestedCharacter}'. "
                    + "Restart the game to enter as a different character."));
                yield break;
            }

            var result = new WorldEnterResult
            {
                LocalPlayerReady = NetworkClient.localPlayer != null,
                Scene = SceneManager.GetActiveScene().name,
                Character = character,
            };
            completion.TrySetResult(ControlCommandResult.Ok(result));
        }
    }
}
