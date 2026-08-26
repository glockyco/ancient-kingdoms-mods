#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Fixtures;
using HotRepl.Control;

namespace CombatVerification.Commands
{
    /// <summary>
    /// Checks a fixture against the running game's own definitions, before anything is
    /// materialized.
    /// </summary>
    /// <remarks>
    /// Reads only. Materializing an unreachable build would give a precise answer to the wrong
    /// question, and finding that out after two minutes of materialization wastes the run, so
    /// the check happens first and against the game rather than a copy of its rules.
    /// </remarks>
    public sealed class ValidateFixtureCommand
        : IControlCommandHandler<FixtureDescriptor, ValidateFixtureResult>
    {
        public string Name => "fixture.validate";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<ValidateFixtureResult>> ExecuteAsync(
            ControlCommandContext<ValidateFixtureResult> context,
            FixtureDescriptor fixture,
            CancellationToken cancellationToken)
        {
            var rules = GameFixtureRules.Read(out var unavailable);
            if (rules == null)
                return new ValueTask<ControlCommandResult<ValidateFixtureResult>>(
                    context.PreconditionFailed("rulesUnavailable", unavailable));

            var validation = FixtureValidator.Validate(fixture, rules);

            var problems = new List<FixtureProblemDto>();
            foreach (var problem in validation.Problems)
                problems.Add(new FixtureProblemDto { Field = problem.Field, Message = problem.Message });

            var classes = new List<string>();
            foreach (var name in rules.ClassNames)
                classes.Add(name);

            return new ValueTask<ControlCommandResult<ValidateFixtureResult>>(
                ControlCommandResult.Ok(new ValidateFixtureResult
                {
                    Ok = validation.Ok,
                    Problems = problems,
                    MaxLevel = rules.MaxLevel,
                    MaxVeteranPoints = rules.MaxVeteranPoints,
                    EquipmentSlotCount = rules.EquipmentSlotCount,
                    OffhandSlot = rules.OffhandSlot,
                    Classes = classes,
                }));
        }
    }
}
