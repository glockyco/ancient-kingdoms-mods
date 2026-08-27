using System;
using System.Collections.Generic;
using CombatVerification.Commands;
using HotRepl.Control;
using MelonLoader;

[assembly: MelonInfo(typeof(CombatVerification.CombatVerificationMod), "CombatVerification", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace CombatVerification
{
    /// <summary>
    /// Registers the runtime commands a combat verification run drives.
    /// </summary>
    public class CombatVerificationMod : MelonMod
    {
        private readonly List<IDisposable> _registered = new();

        public override void OnLateInitializeMelon()
        {
            var registry = GlobalControlCommandRegistry.Instance;

            _registered.Add(registry.Register(new ValidateFixtureCommand()));
            _registered.Add(registry.Register(new CreateCharacterCommand()));
            _registered.Add(registry.Register(new StatSheetCommand()));
            _registered.Add(registry.Register(new BuildCharacterCommand()));
            _registered.Add(registry.Register(new ActionIntervalCommand()));

            LoggerInstance.Msg($"CombatVerification: registered {_registered.Count} typed commands.");
        }

        public override void OnDeinitializeMelon()
        {
            foreach (var registration in _registered)
                registration.Dispose();

            _registered.Clear();
        }
    }
}
