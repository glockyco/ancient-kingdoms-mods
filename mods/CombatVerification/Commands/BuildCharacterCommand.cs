#nullable disable
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Fixtures;
using CombatVerification.Materialization;
using HotRepl.Control;
using MelonLoader;

namespace CombatVerification.Commands
{
    /// <summary>
    /// Brings the spawned player to the state a fixture's character declares.
    /// </summary>
    /// <remarks>
    /// Progression, attribute spending, and skill spending are one command because their order is
    /// fixed and a partly built character measures nothing. Each step reports what it achieved, so
    /// a failure names the step rather than leaving a caller to compare a stat sheet.
    /// </remarks>
    public sealed class BuildCharacterCommand
        : IControlCommandHandler<BuildCharacterArgs, BuildCharacterResult>
    {
        public string Name => "fixture.buildCharacter";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<BuildCharacterResult>> ExecuteAsync(
            ControlCommandContext<BuildCharacterResult> context,
            BuildCharacterArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<BuildCharacterResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args, completion));
            return new ValueTask<ControlCommandResult<BuildCharacterResult>>(completion.Task);
        }

        private IEnumerator RunCoroutine(
            ControlCommandContext<BuildCharacterResult> context,
            BuildCharacterArgs args,
            TaskCompletionSource<ControlCommandResult<BuildCharacterResult>> completion)
        {
            if (args?.Character == null)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "argumentMissing", "A character specification is required."));
                yield break;
            }

            var character = PlayerUnderConstruction.Wrap(out var unavailable);
            if (character == null)
            {
                completion.TrySetResult(context.PreconditionFailed("playerUnavailable", unavailable));
                yield break;
            }

            // A step yields to the engine between awards, so the level-up pipeline and the
            // commands it triggers run before the next value is read.
            yield return null;

            BuildOutcome outcome;
            try
            {
                outcome = CharacterBuilder.Run(character, args.Character);
            }
            catch (Exception exception)
            {
                completion.TrySetResult(context.PreconditionFailed("buildFailed", exception.Message));
                yield break;
            }

            yield return null;

            var steps = new List<BuildStepDto>();
            foreach (var step in outcome.Steps)
                steps.Add(new BuildStepDto { Name = step.Name, Ok = step.Ok, Detail = step.Detail });

            var result = new BuildCharacterResult
            {
                Ok = outcome.Ok,
                Steps = steps,
                Level = character.Level,
                VeteranPoints = character.TotalVeteranPoints,
                UnspentAttributePoints = character.UnspentAttributePoints,
                UnspentSkillPoints = character.UnspentSkillPoints,
                UnspentVeteranPoints = character.UnspentVeteranPoints,
            };

            completion.TrySetResult(ControlCommandResult.Ok(result));
        }
    }
}
