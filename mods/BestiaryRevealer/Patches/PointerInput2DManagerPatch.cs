using HarmonyLib;
using Il2Cpp;
using UnityEngine;
using UnityEngine.InputSystem;

namespace BestiaryRevealer.Patches;

[HarmonyPatch(typeof(PointerInput2DManager), "TryClickOnPress")]
internal static class PointerInput2DManagerPatch
{
    [HarmonyPrefix]
    private static bool OpenBestiaryOnAltMonsterClick(Component ____pressedComponent, ref bool __result)
    {
        if (!IsAltHeld())
            return true;

        var monster = ____pressedComponent != null
            ? ____pressedComponent.GetComponentInParent<Monster>()
            : null;
        if (monster == null)
            return true;

        if (!BestiaryPageOpener.Open(monster))
            return true;

        __result = true;
        return false;
    }

    private static bool IsAltHeld()
    {
        var keyboard = Keyboard.current;
        return keyboard != null && (keyboard.leftAltKey.isPressed || keyboard.rightAltKey.isPressed);
    }
}
