using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Il2Cpp;
using Il2CppMirror;
using MelonLoader;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using UnityEngine;

namespace PocketCompendium.Core.Feedback;

/// <summary>Reads the facts a problem report carries from the running game.</summary>
public static class SetupReader
{
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate IntPtr WineGetVersion();

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate void WineGetHostVersion(out IntPtr sysname, out IntPtr release);

    private static string _system;
    private static bool? _underWine;

    /// <summary>
    /// Whether the game runs under Wine, such as CrossOver on macOS or Proton on Linux. Only
    /// Wine's ntdll exports <c>wine_get_version</c>.
    /// </summary>
    public static bool UnderWine
    {
        get
        {
            if (_underWine == null)
            {
                try
                {
                    var ntdll = System.Runtime.InteropServices.NativeLibrary.Load("ntdll.dll");
                    _underWine = System.Runtime.InteropServices.NativeLibrary.TryGetExport(ntdll, "wine_get_version", out _);
                }
                catch (Exception exception)
                {
                    Log.Warning($"Could not tell whether the game runs under Wine: {exception.Message}");
                    _underWine = false;
                }
            }

            return _underWine.Value;
        }
    }

    public static SetupFacts Read(string modVersion, string build, IReadOnlyList<Feature> features)
    {
        var facts = new SetupFacts
        {
            ModVersion = modVersion,
            Build = build,
            GameVersion = Application.version,
            MelonLoaderVersion = typeof(MelonMod).Assembly.GetName().Version?.ToString(3),
            System = SystemName(),
            Language = GameManager.languageSelected,
            Setting = Setting(),
            WorldsEntered = SessionRecord.WorldsEntered,
            ErrorCount = SessionRecord.ErrorCount,
        };

        foreach (var melon in MelonPlugin.RegisteredMelons)
            facts.OtherMods.Add((melon.Info.Name, melon.Info.Version));
        foreach (var melon in MelonMod.RegisteredMelons)
            if (melon.Info.Name != "Pocket Compendium")
                facts.OtherMods.Add((melon.Info.Name, melon.Info.Version));

        // A feature that stopped is among the errors, so it is not also switched off.
        foreach (var feature in features)
            if (!feature.Failed && !feature.Switch.Value)
                facts.SwitchedOff.Add(feature.Title);
        facts.Errors.AddRange(SessionRecord.Errors);

        return facts;
    }

    /// <summary>
    /// Alone when this process hosts a single player world, which the start menu records as
    /// <c>gameMode</c> 0 (<c>UILogin</c>), hosting when it hosts any other world, joined as a client.
    /// </summary>
    public static PlaySetting Setting()
    {
        if (!GameAccess.InWorld) return PlaySetting.NotInWorld;
        if (NetworkServer.active) return PlayerPrefs.GetInt("gameMode", 0) == 0 ? PlaySetting.Alone : PlaySetting.Hosting;
        return NetworkClient.active ? PlaySetting.Joined : PlaySetting.NotInWorld;
    }

    // wine_get_host_version names the host system, Darwin on macOS and Linux on Linux.
    private static string SystemName()
    {
        if (_system != null) return _system;
        _system = "Windows " + Environment.OSVersion.Version;
        if (!UnderWine) return _system;
        try
        {
            var ntdll = System.Runtime.InteropServices.NativeLibrary.Load("ntdll.dll");
            if (!System.Runtime.InteropServices.NativeLibrary.TryGetExport(ntdll, "wine_get_version", out var version)) return _system;

            string wine = Marshal.PtrToStringAnsi(Marshal.GetDelegateForFunctionPointer<WineGetVersion>(version)());
            string host = null;
            if (System.Runtime.InteropServices.NativeLibrary.TryGetExport(ntdll, "wine_get_host_version", out var hostVersion))
            {
                Marshal.GetDelegateForFunctionPointer<WineGetHostVersion>(hostVersion)(out var sysname, out _);
                host = Marshal.PtrToStringAnsi(sysname);
            }

            _system = "Wine " + wine + host switch
            {
                "Darwin" => " on macOS",
                null or "" => string.Empty,
                _ => " on " + host,
            };
        }
        catch (Exception exception)
        {
            Log.Warning($"Could not read the Wine version for a problem report: {exception.Message}");
        }

        return _system;
    }
}
