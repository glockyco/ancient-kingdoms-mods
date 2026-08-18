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

        public static WorldEntryOutcome Success() => new WorldEntryOutcome { Ok = true };
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

        public static IEnumerator EnterCoroutine(
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

            var charSelect = UICharacterSelection.singleton;
            var manager = charSelect.manager;

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

            var characters = manager.charactersAvailableMsg.characters;
            if (characters.Length == 0)
            {
                complete(WorldEntryOutcome.Failed(
                    "characterMissing",
                    "No characters found. Create a character first."));
                yield break;
            }

            var firstName = characters[0].name;
            manager.selection = 0;
            ((NetworkManagerMMO)NetworkManager.singleton).name_character_selected = firstName;
            PlayerPrefs.SetString("selected_char", firstName);
            PlayerPrefs.SetInt(firstName + "_intro_run", 1);
            PlayerPrefs.Save();
            ((NetworkManagerMMO)NetworkManager.singleton).ClearPreviews();
            UIServerList.singleton.StartConnect(null);

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

            complete(WorldEntryOutcome.Success());
        }
    }
}
