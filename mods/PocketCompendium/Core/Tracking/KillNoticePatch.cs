using System;
using HarmonyLib;
using Il2Cpp;
using Il2CppMirror;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Reads the server's info messages for kill notices. It hooks the RPC's invoke wrapper rather
/// than the chat window, because players can write any text into chat, and rather than the
/// one-line handler, which IL2CPP may inline into the wrapper.
/// </summary>
[HarmonyPatch(typeof(PlayerChat), nameof(PlayerChat.InvokeUserCode_TargetShowInfoMessage__String))]
internal static class KillNoticePatch
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

            tracker.OnInfoMessage(message);
        }
        catch (Exception exception)
        {
            _failed = true;
            Log.Error("Respawn tracking stopped reading kill notices", exception);
        }
    }
}
