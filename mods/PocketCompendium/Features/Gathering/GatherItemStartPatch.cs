using System;
using HarmonyLib;
using Il2Cpp;
using PocketCompendium.Core;

namespace PocketCompendium.Features.Gathering;

/// <summary>Tells the gathering catalogue about each node the game starts after the world loaded.</summary>
[HarmonyPatch(typeof(GatherItem), nameof(GatherItem.Start))]
internal static class GatherItemStartPatch
{
    private static bool _failed;

    [HarmonyPostfix]
    private static void NoteStart(GatherItem __instance)
    {
        var catalogue = GatherCatalogue.Current;
        if (_failed || catalogue == null) return;

        try
        {
            catalogue.OnStarted(__instance);
        }
        catch (Exception exception)
        {
            _failed = true;
            Log.Error("Gathering stopped noticing nodes that start later", exception);
        }
    }
}
