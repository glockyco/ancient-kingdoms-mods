#nullable disable
using System;
using System.Collections;
using System.Threading;
using Il2Cpp;
using Il2CppMirror;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace HotReplCommands.World
{
    /// <summary>
    /// Outcome of <see cref="WorldEntry.EnterCoroutine"/>: either success, or a
    /// failure with a stable precondition code and a human-readable message.
    /// </summary>
    public sealed class WorldEntryOutcome
    {
        public bool Ok { get; set; }
        public string Code { get; set; }
        public string Message { get; set; }

        /// <summary>Character the run entered as. Set on success.</summary>
        public string Character { get; set; }

        public static WorldEntryOutcome Success(string character)
            => new WorldEntryOutcome { Ok = true, Character = character };
        public static WorldEntryOutcome Failed(string code, string msg)
            => new WorldEntryOutcome { Ok = false, Code = code, Message = msg };
    }

    /// <summary>
    /// Drives the game from the <c>Start</c> scene to a spawned local player.
    /// Shared by <c>world.enter</c> and <c>compendium.export</c>.
    /// </summary>
    public static class WorldEntry
    {
        public static readonly TimeSpan MaxWait = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan SettleTime = TimeSpan.FromSeconds(3);

        /// <summary>
        /// Name of the character currently in the world, or null when none is.
        /// </summary>
        public static string HeldCharacterName()
            => Player.localPlayer == null ? null : Player.localPlayer.name;

        /// <summary>
        /// Drives the game to character selection and waits until the roster is ready.
        /// Character creation and world entry share this path because both begin at the same
        /// single-player button.
        /// </summary>
        public static IEnumerator OpenCharacterSelectionCoroutine(
            CancellationToken ct,
            Action<WorldEntryOutcome> complete)
        {
            var scene = SceneManager.GetActiveScene().name;

            if (scene == "Start")
            {
                yield return null;
                ct.ThrowIfCancellationRequested();
                var login = UnityEngine.Object.FindObjectOfType<UILogin>();
                if (login == null)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "UILogin not found in Start scene."));
                    yield break;
                }
                login.singlePlayerButton.onClick.Invoke();
            }

            var deadline = DateTime.UtcNow + MaxWait;
            while (UICharacterSelection.singleton == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "Timed out waiting for UICharacterSelection."));
                    yield break;
                }
                yield return null;
            }

            var manager = UICharacterSelection.singleton.manager;
            while (manager.state != NetworkState.Lobby ||
                   manager.charactersAvailableMsg.characters == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "Timed out waiting for lobby/character data."));
                    yield break;
                }
                yield return null;
            }

            complete(WorldEntryOutcome.Success(null));
        }

        /// <summary>Enters the world with one character from the ready selection roster.</summary>
        /// <param name="requestedCharacter">
        /// Character to enter as. When null or blank, <see cref="CharacterSelector"/>
        /// picks deterministically.
        /// </param>
        public static IEnumerator EnterCoroutine(
            CancellationToken ct,
            string requestedCharacter,
            Action<WorldEntryOutcome> complete)
        {
            WorldEntryOutcome selectionReady = null;
            yield return OpenCharacterSelectionCoroutine(ct, outcome => selectionReady = outcome);
            if (selectionReady == null || !selectionReady.Ok)
            {
                complete(selectionReady ?? WorldEntryOutcome.Failed(
                    "worldEntryUnavailable",
                    "Character selection failed with no error detail."));
                yield break;
            }

            var charSelect = UICharacterSelection.singleton;
            var manager = charSelect.manager;
            var characters = manager.charactersAvailableMsg.characters;
            var available = new string[characters.Length];
            for (var i = 0; i < characters.Length; i++)
                available[i] = characters[i].name;

            var selection = CharacterSelector.Select(available, requestedCharacter);
            if (!selection.Ok)
            {
                complete(WorldEntryOutcome.Failed(selection.Code, selection.Message));
                yield break;
            }

            var chosenName = selection.Name;
            var chosenIndex = Array.IndexOf(available, chosenName);

            manager.selection = chosenIndex;
            ((NetworkManagerMMO)NetworkManager.singleton).name_character_selected = chosenName;
            PlayerPrefs.SetString("selected_char", chosenName);
            PlayerPrefs.SetInt(chosenName + "_intro_run", 1);
            PlayerPrefs.Save();
            ((NetworkManagerMMO)NetworkManager.singleton).ClearPreviews();
            UIServerList.singleton.StartConnect(null);

            var deadline = DateTime.UtcNow + MaxWait;
            while (NetworkClient.localPlayer == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "Timed out waiting for local player to spawn."));
                    yield break;
                }
                yield return null;
            }

            var settleEnd = DateTime.UtcNow + SettleTime;
            while (DateTime.UtcNow < settleEnd)
            {
                ct.ThrowIfCancellationRequested();
                yield return null;
            }

            complete(WorldEntryOutcome.Success(chosenName));
        }
    }
}
