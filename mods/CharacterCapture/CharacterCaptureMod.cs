using System;
using System.Collections.Generic;
using System.IO;
using HotRepl.Control;
using MelonLoader;
using MelonLoader.Utils;

[assembly: MelonInfo(typeof(CharacterCapture.CharacterCaptureMod), "CharacterCapture", "1.0.0", "WoW_Much")]
[assembly: HarmonyDontPatchAll]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace CharacterCapture
{
    public sealed class CharacterCaptureMod : MelonMod
    {
        private readonly List<IDisposable> _registrations = new();

        public static string OutputPath => Path.Combine(
            MelonEnvironment.UserDataDirectory,
            "CharacterCapture",
            "character-capture.json");

        public override void OnLateInitializeMelon()
        {
            var registry = GlobalControlCommandRegistry.Instance;
            _registrations.Add(registry.Register(new CharacterCaptureCommand(OutputPath)));
            _registrations.Add(registry.Register(new MeterCaptureCommand()));
            LoggerInstance.Msg(
                $"CharacterCapture: registered 2 read-only commands; output={Path.GetFullPath(OutputPath)}.");
        }

        public override void OnDeinitializeMelon()
        {
            foreach (var registration in _registrations)
                registration.Dispose();
            _registrations.Clear();
        }
    }
}
