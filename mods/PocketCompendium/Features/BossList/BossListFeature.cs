using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossList.Ui;
using UnityEngine;

namespace PocketCompendium.Features.BossList;

/// <summary>The list of bosses, elites and fabled monsters in the player's zone and on the watchlist.</summary>
public sealed class BossListFeature : Feature
{
    private readonly BossListSettings _settings;
    private BossListPanel _panel;
    private int _shownVersion = -1;
    private int _shownWatchlist = -1;
    private float _shownWidth;
    private bool _settingsChanged;

    public BossListFeature()
        : base("BossList", "Boss list", "Lists the bosses, elites and fabled monsters in your zone, plus the ones you watch, and when they spawn.")
    {
        _settings = new BossListSettings(Settings);
        Settings.Changed += () => _settingsChanged = true;
    }

    public override Sprite Icon => Icons.LayoutList;

    public override bool UsesTracker => true;

    protected internal override void Enable()
    {
        _panel = new BossListPanel(_settings, this);
        _shownVersion = -1;
    }

    protected internal override void Disable()
    {
        _panel?.Destroy();
        _panel = null;
    }

    protected internal override void Update()
    {
        var tracker = Tracker.Current;
        var watchlist = Watchlist.Current;
        if (tracker == null || !tracker.Ready || tracker.Failed || !GameAccess.InWorld || GameAccess.LocalPlayer == null)
        {
            if (_panel.Exists) _panel.SetVisible(false);
            return;
        }

        if (!_panel.Exists)
        {
            _panel.Create();
            _shownVersion = -1;
        }

        _panel.SetVisible(true);
        _panel.UpdateInput(watchlist, out bool changed);

        float width = _settings.Panel.Width;
        if (changed || _settingsChanged || tracker.Version != _shownVersion || watchlist.Version != _shownWatchlist || width != _shownWidth)
        {
            _panel.Rebuild(tracker, watchlist);
            _shownVersion = tracker.Version;
            _shownWatchlist = watchlist.Version;
            _shownWidth = width;
            _settingsChanged = false;
        }
    }

    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName == "World") _panel?.SetVisible(false);
    }
}
