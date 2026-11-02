using System;
using HarmonyLib;
using Il2Cpp;
using Il2CppMirror;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Reads the important messages the server sends this player for a dungeon renewal. It hooks the
/// RPC's invoke wrapper, as <see cref="KillNoticePatch"/> does, because players can write any
/// text into chat.
/// </summary>
[HarmonyPatch(typeof(Player), nameof(Player.InvokeUserCode_TargetRpcImportantMessage__String__Color__Boolean))]
internal static class RenewalNoticePatch
{
    private static bool _failed;

    [HarmonyPrefix]
    private static void ReadMessage(NetworkReader reader)
    {
        var tracker = Tracker.Current;
        if (_failed || tracker == null || !tracker.Ready || tracker.Exact) return;

        try
        {
            // The game reads the message after this prefix, so the reader goes back to where it was.
            int position = reader.Position;
            string message;
            try
            {
                message = reader.ReadString();
            }
            finally
            {
                reader.Position = position;
            }

            tracker.OnImportantMessage(message);
        }
        catch (Exception exception)
        {
            _failed = true;
            Log.Error("Respawn tracking stopped reading dungeon renewals", exception);
        }
    }
}
