using System;
using System.Collections.Generic;
using AncientKingdomsMods.Shared;
using Il2Cpp;
using MelonLoader;

[assembly: MelonInfo(typeof(BetterBestiary.BetterBestiary), "Better Bestiary", "0.3.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace BetterBestiary;

public sealed class BetterBestiary : MelonMod
{
    private static MelonLogger.Instance Logger;

    // Monsters whose page failed to draw. The game draws their page for the rest of the session.
    private static readonly HashSet<string> FailedMonsters = new(StringComparer.Ordinal);

    public override void OnInitializeMelon()
    {
        Logger = LoggerInstance;
        BetterBestiarySettings.Initialize();
        LoggerInstance.Msg($"Better Bestiary initialized, build {ModBuild.Commit(typeof(BetterBestiary).Assembly)}");
        HarmonyInstance.PatchAll();
        Ui.GamepadLootNavigation.Patch(HarmonyInstance);
        LoggerInstance.Msg("Better Bestiary Harmony patches registered");
    }

    public override void OnUpdate()
    {
        BestiaryAltClickHandler.Update();
        Ui.GamepadLootNavigation.Update();
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

    /// <summary>Whether Better Bestiary draws this monster's page, rather than the game.</summary>
    internal static bool Draws(Monster monster) =>
        monster != null && !FailedMonsters.Contains(monster.nameEntity ?? string.Empty);

    internal static void ReportPageFailure(Monster monster, Exception ex)
    {
        var name = monster != null ? monster.nameEntity ?? string.Empty : string.Empty;
        if (!FailedMonsters.Add(name))
            return;

        if (Logger != null)
            Logger.Error($"Better Bestiary could not draw the page of '{name}' and leaves it to the game for this session: {ex}");
    }
}
