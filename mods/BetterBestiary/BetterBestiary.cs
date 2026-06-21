using System;
using MelonLoader;

[assembly: MelonInfo(typeof(BetterBestiary.BetterBestiary), "Better Bestiary", "0.2.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace BetterBestiary;

public sealed class BetterBestiary : MelonMod
{
    private static MelonLogger.Instance Logger;
    private static bool _reportedPatchException;

    public override void OnInitializeMelon()
    {
        Logger = LoggerInstance;
        BetterBestiarySettings.Initialize();
        LoggerInstance.Msg("Better Bestiary initialized");
        HarmonyInstance.PatchAll();
        LoggerInstance.Msg("Better Bestiary Harmony patches registered");
    }

    public override void OnUpdate()
    {
        BestiaryAltClickHandler.Update();
    }

    internal static void LogMessage(string message)
    {
        if (Logger != null)
            Logger.Msg(message);
    }

    internal static void LogWarning(string message)
    {
        if (Logger != null)
            Logger.Warning(message);
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
