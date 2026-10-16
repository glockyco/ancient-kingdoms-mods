using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using Il2Cpp;
using Il2CppMirror;

namespace HotReplCommands.Commands
{
    public sealed class WorldSummaryCommand : IControlCommandHandler<EmptyArgs, WorldSummaryResult>
    {
        public string Name => "world.summary";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<WorldSummaryResult>> ExecuteAsync(
            ControlCommandContext<WorldSummaryResult> context, EmptyArgs args, CancellationToken cancellationToken)
        {
            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name;
            var localPlayer = NetworkClient.localPlayer;

            string networkState = null;
            int? characterCount = null;
            string selectedChar = null;

            var charSelect = UICharacterSelection.singleton;
            if (charSelect != null)
            {
                networkState = charSelect.manager?.state.ToString();
                var chars = charSelect.manager?.charactersAvailableMsg.characters;
                characterCount = chars?.Length;
                var sel = charSelect.manager?.selection ?? -1;
                if (sel >= 0 && chars != null && sel < chars.Length)
                    selectedChar = chars[sel].name;
            }

            var result = new WorldSummaryResult
            {
                Scene = scene,
                NetworkState = networkState,
                CharacterCount = characterCount,
                SelectedChar = selectedChar,
                LocalPlayerReady = localPlayer != null,
            };

            return new ValueTask<ControlCommandResult<WorldSummaryResult>>(
                ControlCommandResult.Ok(result));
        }
    }
}
