using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Professions.Ui;
using UnityEngine;

namespace PocketCompendium.Features.Professions;

/// <summary>
/// Shows the character's profession levels in a panel the panel menu shows, so they need no trip
/// to the Skills window. It only reads the levels, once a second.
/// </summary>
public sealed class ProfessionsFeature : Feature
{
    private const float RefreshSeconds = 1f;

    private readonly ProfessionsSettings _settings;
    private readonly ProfessionSource _source = new();
    private ProfessionsPanel _panel;
    private float _nextRefresh;
    private bool _dirty = true;
    private int _shownWatch = -1;
    private float _shownWidth;

    public ProfessionsFeature()
        : base("Professions", "Professions", "Shows your profession levels without opening the Skills window.")
    {
        _settings = new ProfessionsSettings(Settings);
        Settings.Changed += () => _dirty = true;
        PanelMenu.Register(new PanelToggle("Professions", () => Icons.TrendingUp, () => Running, _settings.Shown, _settings.Save));
    }

    protected internal override void Enable()
    {
        _panel = new ProfessionsPanel(_settings, this);
        _dirty = true;
        _nextRefresh = 0f;
    }

    protected internal override void Disable()
    {
        _panel?.Destroy();
        _panel = null;
    }

    protected internal override void Update()
    {
        var player = GameAccess.LocalPlayer;
        if (!GameAccess.InWorld || player == null || !_settings.Shown.Value)
        {
            if (_panel.Exists) _panel.SetVisible(false);
            return;
        }

        if (!_panel.Exists)
        {
            _panel.Create();
            _dirty = true;
        }

        _panel.SetVisible(true);
        if (Time.unscaledTime >= _nextRefresh)
        {
            _nextRefresh = Time.unscaledTime + RefreshSeconds;
            _dirty |= _source.Refresh(player);
        }

        _panel.UpdateInput(out bool changed);
        float width = _settings.Panel.Width;
        if (changed || _dirty || _settings.WatchVersion != _shownWatch || width != _shownWidth)
        {
            _panel.Rebuild(_source);
            _dirty = false;
            _shownWatch = _settings.WatchVersion;
            _shownWidth = width;
        }
    }

    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        _panel?.SetVisible(false);
        // The tab's icons belong to the world's interface, which leaving destroys.
        _source.Forget();
        _dirty = true;
    }
}
