using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using UnityEngine;

namespace HotReplCommands.Commands
{
    public sealed class GameQuitCommand : IControlCommandHandler<EmptyArgs, GameQuitResult>
    {
        public string Name => "game.quit";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Synchronous;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<GameQuitResult>> ExecuteAsync(
            ControlCommandContext context, EmptyArgs args, CancellationToken cancellationToken)
        {
            Application.Quit();
            return new ValueTask<ControlCommandResult<GameQuitResult>>(
                ControlCommandResult.Ok(new GameQuitResult { Quitting = true }));
        }
    }
}
