#nullable disable
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Materialization;
using HotRepl.Control;
using HotReplCommands.World;
using Il2Cpp;
using MelonLoader;

namespace CombatVerification.Commands
{
    /// <summary>
    /// Creates one fixture character through the game's character creator.
    /// </summary>
    /// <remarks>
    /// The command reports what the save holds afterwards rather than what it asked for. No
    /// mutation path in this game reports a refusal, so a step that trusted its own call could
    /// report a character it did not create.
    /// </remarks>
    public sealed class CreateCharacterCommand
        : IControlCommandHandler<CreateCharacterArgs, CreateCharacterResult>
    {
        public string Name => "fixture.createCharacter";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<CreateCharacterResult>> ExecuteAsync(
            ControlCommandContext<CreateCharacterResult> context,
            CreateCharacterArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<CreateCharacterResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<CreateCharacterResult>>(completion.Task);
        }

        private IEnumerator RunCoroutine(
            ControlCommandContext<CreateCharacterResult> context,
            CreateCharacterArgs args,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<CreateCharacterResult>> completion)
        {
            if (args == null || string.IsNullOrWhiteSpace(args.CharacterName)
                || string.IsNullOrWhiteSpace(args.Class) || string.IsNullOrWhiteSpace(args.Race))
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "argumentMissing", "characterName, class and race are all required."));
                yield break;
            }

            if (UICharacterSelection.singleton == null)
            {
                WorldEntryOutcome selection = null;
                var openSelection = WorldEntry.OpenCharacterSelectionCoroutine(
                    cancellationToken, outcome => selection = outcome);
                while (true)
                {
                    object current;
                    try
                    {
                        if (!openSelection.MoveNext())
                            break;
                        current = openSelection.Current;
                    }
                    catch (Exception exception)
                    {
                        completion.TrySetResult(context.PreconditionFailed(
                            "creatorUnavailable", exception.Message));
                        yield break;
                    }

                    yield return current;
                }

                if (selection == null || !selection.Ok)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        selection?.Code ?? "creatorUnavailable",
                        selection?.Message ?? "Character selection failed with no error detail."));
                    yield break;
                }
            }

            var creation = new CharacterCreation();
            IEnumerator run;
            try
            {
                run = creation.Run(
                    args.CharacterName, args.Class, args.Race, args.ReplaceCharacterName);
            }
            catch (Exception exception)
            {
                completion.TrySetResult(context.PreconditionFailed("creatorFailed", exception.Message));
                yield break;
            }

            while (true)
            {
                object current;
                try
                {
                    if (!run.MoveNext())
                        break;
                    current = run.Current;
                }
                catch (Exception exception)
                {
                    completion.TrySetResult(context.PreconditionFailed("creatorFailed", exception.Message));
                    yield break;
                }

                if (cancellationToken.IsCancellationRequested)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        "cancelled", "Creation was cancelled."));
                    yield break;
                }

                yield return current;
            }

            if (!creation.Ok)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    creation.Failure.Code, creation.Failure.Message));
                yield break;
            }

            CreateCharacterResult result;
            try
            {
                result = ReadBack(args.CharacterName, creation.ClassesOfferedForRace);
            }
            catch (Exception exception)
            {
                completion.TrySetResult(context.PreconditionFailed("readBackFailed", exception.Message));
                yield break;
            }

            completion.TrySetResult(ControlCommandResult.Ok(result));
        }

        /// <summary>Reads the stored character, so the result describes the save and not the request.</summary>
        private static CreateCharacterResult ReadBack(string characterName, string[] offered)
        {
            var stored = Database.CharacterLoad(characterName);
            return new CreateCharacterResult
            {
                CharacterName = stored.name,
                StoredClass = stored.className,
                StoredRace = stored.race,
                StoredLevel = stored.level,
                ClassesOfferedForRace = new List<string>(offered),
            };
        }
    }
}
