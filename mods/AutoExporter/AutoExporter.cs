using System;
using System.Collections;
using System.Linq;
using Il2Cpp;
using Il2CppMirror;
using MelonLoader;
using UnityEngine;

[assembly: MelonInfo(typeof(AutoExporter.AutoExporter), "AutoExporter", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace AutoExporter
{
    // Activated by passing --auto-export on the command line (set in Steam launch options).
    // Flow: Start scene → click singleplayer → World scene loads → select first character
    //       → wait for player spawn → export all data → quit.
    public class AutoExporter : MelonMod
    {
        private bool _active;
        private bool _exportStarted;

        public override void OnInitializeMelon()
        {
            _active = Environment.GetCommandLineArgs().Contains("--auto-export");

            if (_active)
                LoggerInstance.Msg("AutoExporter active — will auto-export and quit on launch.");
            else
                LoggerInstance.Msg("AutoExporter standing by (pass --auto-export to activate).");
        }

        public override void OnSceneWasLoaded(int buildIndex, string sceneName)
        {
            if (!_active) return;

            if (sceneName == "Start")
            {
                LoggerInstance.Msg("[AutoExporter] Start scene loaded — clicking singleplayer.");
                MelonCoroutines.Start(ClickSinglePlayer());
            }
            else if (sceneName == "World")
            {
                LoggerInstance.Msg("[AutoExporter] World scene loaded — waiting for character select.");
                MelonCoroutines.Start(HandleCharacterSelectThenExport());
            }
        }

        private IEnumerator ClickSinglePlayer()
        {
            // Wait a frame for UILogin to finish its Start()
            yield return null;

            var login = UnityEngine.Object.FindObjectOfType<UILogin>();
            if (login == null)
            {
                LoggerInstance.Error("[AutoExporter] UILogin not found in Start scene.");
                yield break;
            }

            LoggerInstance.Msg("[AutoExporter] Invoking singleplayer button.");
            login.singlePlayerButton.onClick.Invoke();
        }

        private IEnumerator HandleCharacterSelectThenExport()
        {
            // Wait for UICharacterSelection to be ready
            while (UICharacterSelection.singleton == null)
                yield return null;

            var charSelect = UICharacterSelection.singleton;
            var manager = charSelect.manager;

            // Wait until the lobby state and characters are loaded
            while (manager.state != NetworkState.Lobby || manager.charactersAvailableMsg.characters == null)
                yield return null;

            if (manager.charactersAvailableMsg.characters.Length == 0)
            {
                LoggerInstance.Error("[AutoExporter] No characters found — cannot auto-select. Create a character first.");
                yield break;
            }

            var firstName = manager.charactersAvailableMsg.characters[0].name;
            LoggerInstance.Msg($"[AutoExporter] Selecting first character: {firstName}");

            // Set selection and name exactly as the UI button would
            manager.selection = 0;
            ((NetworkManagerMMO)Il2CppMirror.NetworkManager.singleton).name_character_selected = firstName;
            PlayerPrefs.SetString("selected_char", firstName);
            // Mark intro as already run so we skip the intro cutscene
            PlayerPrefs.SetInt(firstName + "_intro_run", 1);
            PlayerPrefs.Save();
            ((NetworkManagerMMO)Il2CppMirror.NetworkManager.singleton).ClearPreviews();

            LoggerInstance.Msg("[AutoExporter] Starting game (connecting to local world).");
            UIServerList.singleton.StartConnect(null);

            // Wait for the local player to spawn in the world
            LoggerInstance.Msg("[AutoExporter] Waiting for local player to spawn...");
            while (Il2CppMirror.NetworkClient.localPlayer == null)
                yield return null;

            // Extra settle time for all scene objects to be fully loaded
            LoggerInstance.Msg("[AutoExporter] Player spawned. Waiting for scene to settle...");
            yield return new WaitForSeconds(3f);

            if (_exportStarted) yield break;
            _exportStarted = true;

            RunExportAndQuit();
        }

        private void RunExportAndQuit()
        {
            var dataExporterMod = MelonMod.RegisteredMelons
                .OfType<DataExporter.DataExporter>()
                .FirstOrDefault();

            if (dataExporterMod == null)
            {
                LoggerInstance.Error("[AutoExporter] DataExporter mod not found — is DataExporter.dll in Mods/?");
                Application.Quit();
                return;
            }

            try
            {
                LoggerInstance.Msg("[AutoExporter] Starting export...");
                dataExporterMod.ExportAllData();
                LoggerInstance.Msg("[AutoExporter] Export complete. Quitting.");
            }
            catch (Exception ex)
            {
                LoggerInstance.Error($"[AutoExporter] Export failed: {ex.Message}");
                LoggerInstance.Error(ex.StackTrace);
            }
            finally
            {
                Application.Quit();
            }
        }
    }
}
