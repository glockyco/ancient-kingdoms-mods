using System;
using System.IO;
using System.Reflection;
using MelonLoader;
using MelonLoader.Utils;

[assembly: MelonInfo(typeof(PocketCompendiumUpdater.UpdaterPlugin), "Pocket Compendium Updater", "1.0.0", "WoW_Much")]

namespace PocketCompendiumUpdater;

/// <summary>
/// Runs Pocket Compendium's update code before MelonLoader loads mods. A loaded plugin's file can't be
/// replaced while the game runs, so this plugin never changes: it loads the update code from a file
/// Pocket Compendium keeps current, as bytes, which leaves that file free to replace. The path, the type
/// and its two methods are the contract every later update code keeps.
/// </summary>
public sealed class UpdaterPlugin : MelonPlugin
{
    private const string CodeType = "PocketCompendium.UpdateCore.Startup";
    private Type _code;

    public override void OnPreInitialization()
    {
        string path = Path.Combine(MelonEnvironment.UserDataDirectory, "PocketCompendium", "Updates", "PocketCompendium.UpdateCore.dll");
        try
        {
            if (!File.Exists(path)) return;
            _code = Assembly.Load(File.ReadAllBytes(path)).GetType(CodeType);
            Call("Start");
        }
        catch (Exception e)
        {
            LoggerInstance.Warning("Could not start the update code: " + (e.InnerException ?? e).Message);
        }
    }

    public override void OnPreModsLoaded() => Call("BeforeMods");

    private void Call(string method)
    {
        try
        {
            _code?.GetMethod(method, BindingFlags.Public | BindingFlags.Static)?.Invoke(null, null);
        }
        catch (Exception e)
        {
            LoggerInstance.Warning($"The update code failed in {method}: " + (e.InnerException ?? e).Message);
        }
    }
}
