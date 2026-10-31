using System;

namespace PocketCompendium.Core;

/// <summary>
/// Pocket Compendium's one Harmony instance. Features apply their patches the first time they are
/// enabled and leave them in place, because the patches pass through while a feature is off.
/// </summary>
internal static class Patching
{
    private static HarmonyLib.Harmony _harmony;

    internal static void Initialize(HarmonyLib.Harmony harmony) => _harmony = harmony;

    internal static HarmonyLib.Harmony Harmony =>
        _harmony ?? throw new InvalidOperationException("Pocket Compendium patched before its Harmony instance was set.");

    /// <summary>Applies the Harmony attribute patches declared on <paramref name="patchClass"/>.</summary>
    internal static void Apply(Type patchClass) => Harmony.CreateClassProcessor(patchClass).Patch();
}
