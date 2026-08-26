using System;
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
        private IDisposable _validateFixture;
        private IDisposable _createCharacter;

        public override void OnLateInitializeMelon()
        {
            var registry = GlobalControlCommandRegistry.Instance;
            _validateFixture = registry.Register(new ValidateFixtureCommand());
            _createCharacter = registry.Register(new CreateCharacterCommand());

            LoggerInstance.Msg("CombatVerification: registered 2 typed commands.");
        }

        public override void OnDeinitializeMelon()
        {
            _validateFixture?.Dispose();
            _createCharacter?.Dispose();
        }
    }
}
