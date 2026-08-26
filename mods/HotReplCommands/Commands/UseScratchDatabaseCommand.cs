#nullable disable
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using HotReplCommands.Isolation;
using Il2Cpp;
using Il2CppInterop.Runtime.InteropTypes.Arrays;

namespace HotReplCommands.Commands
{
    /// <summary>
    /// Points the game's database at a scratch file beside the installation's own,
    /// so that a run which creates or mutates characters never reaches player data.
    /// </summary>
    /// <remarks>
    /// The game reads its database path when it opens the connection, and it opens the
    /// connection from the login screen rather than at start-up
    /// (`server-scripts/Database.cs`, `server-scripts/UILogin.cs`). This command therefore
    /// refuses once a connection exists: redirecting afterwards would leave the game using
    /// the already-open player database while reporting the scratch path.
    /// </remarks>
    public sealed class UseScratchDatabaseCommand
        : IControlCommandHandler<EmptyArgs, UseScratchDatabaseResult>
    {
        public string Name => "game.useScratchDatabase";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<UseScratchDatabaseResult>> ExecuteAsync(
            ControlCommandContext<UseScratchDatabaseResult> context,
            EmptyArgs args,
            CancellationToken cancellationToken)
        {
            var previous = GameManager.pathFileDB;

            if (Il2Cpp.Database.connection != null)
                return Failed(context,
                    "databaseAlreadyOpen",
                    "The database connection is already open, so a redirect would not take effect. "
                    + $"Run this before entering the world. Current path: {previous}");

            var resolved = ScratchDatabase.ResolveFrom(previous);
            if (resolved == null)
                return Failed(context,
                    "scratchPathUnresolved",
                    $"Could not resolve a scratch path beside '{previous}'.");

            if (!ScratchDatabase.IsScratch(resolved))
                return Failed(context,
                    "scratchPathRejected",
                    $"Resolved path is not inside a scratch directory: {resolved}");

            GameManager.pathFileDB = resolved;
            Il2Cpp.Database.Connect();

            return new ValueTask<ControlCommandResult<UseScratchDatabaseResult>>(
                ControlCommandResult.Ok(new UseScratchDatabaseResult
                {
                    PreviousPath = previous,
                    ResolvedPath = GameManager.pathFileDB,
                    IsScratch = ScratchDatabase.IsScratch(GameManager.pathFileDB),
                    CharacterCount = CountCharacters(),
                }));
        }

        private static int? CountCharacters()
        {
            if (Il2Cpp.Database.connection == null)
                return null;

            var noParameters = new Il2CppReferenceArray<Il2CppSystem.Object>(0);
            return Il2Cpp.Database.connection.ExecuteScalar<int>(
                "SELECT count(*) FROM characters", noParameters);
        }

        private static ValueTask<ControlCommandResult<UseScratchDatabaseResult>> Failed(
            ControlCommandContext<UseScratchDatabaseResult> context, string code, string message)
            => new ValueTask<ControlCommandResult<UseScratchDatabaseResult>>(
                context.PreconditionFailed(code, message));
    }
}
