using System;
using MelonLoader;

[assembly: MelonInfo(typeof(BestiaryRevealer.BestiaryRevealer), "Bestiary Revealer", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace BestiaryRevealer;

public sealed class BestiaryRevealer : MelonMod
{
    private static MelonLogger.Instance Logger;
    private static bool _reportedPatchException;

    public override void OnInitializeMelon()
    {
        Logger = LoggerInstance;
        BestiaryRevealerSettings.Initialize();
        LoggerInstance.Msg("Bestiary Revealer initialized");
        HarmonyInstance.PatchAll();
        LoggerInstance.Msg("Bestiary Revealer Harmony patches registered");
    }

    internal static void LogMessage(string message)
    {
        if (Logger != null)
            Logger.Msg(message);
    }

    internal static bool IsPatchDisabled => _reportedPatchException;

    internal static void ReportPatchException(Exception ex)
    {
        if (_reportedPatchException)
            return;

        _reportedPatchException = true;
        if (Logger != null)
            Logger.Warning($"Bestiary Revealer disabled its render patch after an error: {ex.Message}");
    }
}
