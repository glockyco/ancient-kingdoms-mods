using System;
using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using UnityEngine;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// One entry in the settings window's sidebar: settings that apply across features, a group of
/// features each shown as a row with its switch, or a page that draws its own content.
/// </summary>
public sealed class SettingsGroup
{
    private SettingsGroup(string title, Sprite icon, IReadOnlyList<SettingsPage> pages, IReadOnlyList<Feature> features, ISettingsContent content)
    {
        Title = title;
        Icon = icon;
        Pages = pages ?? Array.Empty<SettingsPage>();
        Features = features ?? Array.Empty<Feature>();
        Content = content;
    }

    /// <summary>Settings that apply across features, such as General.</summary>
    public static SettingsGroup Shared(string title, Sprite icon, params SettingsPage[] pages) =>
        new(title, icon, pages, null, null);

    /// <summary>Features that belong together, such as everything about respawn times.</summary>
    public static SettingsGroup Of(string title, Sprite icon, params Feature[] features) =>
        new(title, icon, null, features, null);

    /// <summary>A page that draws itself, such as About.</summary>
    public static SettingsGroup Drawn(ISettingsContent content) =>
        new(content.Title, content.Icon, null, null, content);

    public string Title { get; }
    public Sprite Icon { get; }
    public IReadOnlyList<SettingsPage> Pages { get; }
    public IReadOnlyList<Feature> Features { get; }
    public ISettingsContent Content { get; }
}
