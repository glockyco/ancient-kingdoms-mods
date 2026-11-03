using System;
using HarmonyLib;
using Il2Cpp;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Tells the tracker about each monster the game starts. Altar and placeholder spawns are new
/// objects each time, and searching the scene for them stalls the game for a frame.
/// </summary>
[HarmonyPatch(typeof(Monster), nameof(Monster.Start))]
internal static class MonsterStartPatch
{
    private static bool _failed;

    [HarmonyPostfix]
    private static void NoteStart(Monster __instance)
    {
        var tracker = Tracker.Current;
        if (_failed || tracker == null) return;

        try
        {
            tracker.OnMonsterStarted(__instance);
        }
        catch (Exception exception)
        {
            _failed = true;
            Log.Error("Respawn tracking stopped noticing altar and placeholder spawns", exception);
        }
    }
}
