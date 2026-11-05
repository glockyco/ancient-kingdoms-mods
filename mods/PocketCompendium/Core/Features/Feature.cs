using System;
using PocketCompendium.Core.Settings;
using UnityEngine;

namespace PocketCompendium.Core.Features;

/// <summary>
/// One part of Pocket Compendium that a player can switch on and off. The registry enables it
/// while its switch is on, calls <see cref="Update"/> every frame while it runs, and stops it for
/// the session when it fails.
/// </summary>
public abstract class Feature
{
    protected Feature(string id, string title, string summary)
    {
        Settings = new SettingsPage(id, title);
        Summary = summary;
        Switch = Settings.Toggle("Enabled", true, title, summary, shown: false);
    }

    public string Id => Settings.Id;
    public string Title => Settings.Title;

    /// <summary>One sentence on what the feature shows, for the settings window.</summary>
    public string Summary { get; }

    /// <summary>The icon beside the feature's name in the settings window.</summary>
    public abstract Sprite Icon { get; }

    public SettingsPage Settings { get; }
    public ToggleSetting Switch { get; }

    public bool Running { get; internal set; }

    /// <summary>Set after the feature threw. It stays stopped until the game restarts.</summary>
    public bool Failed { get; internal set; }

    /// <summary>Whether the feature reads the respawn tracker, which runs while any such feature runs.</summary>
    public virtual bool UsesTracker => false;

    /// <summary>
    /// Whether the settings window gives the feature a page of its own, for more settings than fit
    /// under its row in its group.
    /// </summary>
    public virtual bool OwnPage => false;

    internal Exception Failure { get; set; }

    /// <summary>Starts the feature. Views can be created lazily once the world is loaded.</summary>
    protected internal abstract void Enable();

    /// <summary>
    /// Stops the feature: removes everything it draws and undoes every change it made to the
    /// game's interface. Patches it applied keep passing through while it is not running.
    /// </summary>
    protected internal abstract void Disable();

    protected internal virtual void Update()
    {
    }

    /// <summary>
    /// Called when a scene unloads while the feature runs. Leaving a world unloads "World", which
    /// destroys the game's interface in it, so a feature forgets every view it keeps there, or
    /// checks with Unity's null test that the view still exists before each use.
    /// </summary>
    protected internal virtual void OnSceneUnloaded(string sceneName)
    {
    }

    /// <summary>
    /// Reports a failure caught outside <see cref="Update"/>, for example in a Harmony patch. The
    /// registry stops the feature on its next update.
    /// </summary>
    public void Fail(Exception exception)
    {
        if (Failed) return;
        Failed = true;
        Failure = exception;
    }
}
