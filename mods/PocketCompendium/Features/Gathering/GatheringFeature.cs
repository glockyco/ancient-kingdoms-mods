using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Features.Gathering.Model;
using PocketCompendium.Features.Gathering.Ui;
using PocketCompendium.Features.MapPins;
using UnityEngine;

namespace PocketCompendium.Features.Gathering;

/// <summary>
/// Lists every herb, ore, fish and spark behind a round button on the minimap, and marks the watched
/// ones on the map, the minimap and the screen's edge. Its work in a frame depends on the watched
/// nodes of the current zone, and it searches the scene only when a world loads.
/// </summary>
public sealed class GatheringFeature : Feature
{
    private const float RefreshSeconds = 1f;

    private readonly GatheringSettings _settings;
    private readonly GatherCatalogue _catalogue = new();
    private readonly MinimapButton _button = new();
    private readonly MinimapIcons _minimap = new();
    private readonly MapPinsLayer _mapPins = new();
    private readonly GatherArrow _arrow = new();
    private readonly List<GatherType> _watched = new();
    private GatherListPanel _panel;
    private bool _patched;
    private bool _settingsChanged;
    private float _nextRefresh;
    private double _now;
    private int _zone = -1;
    private int _version;
    private int _shownVersion = -1;
    private int _watchedFor = -1;
    private int _watchedCatalogue = -1;
    private float _shownWidth;

    public GatheringFeature()
        : base("Gathering", "Gathering", "Lists every herb, ore, fish and Radiant Spark, and marks the ones you watch on the map, the minimap and the screen's edge.")
    {
        _settings = new GatheringSettings(Settings);
        Settings.Changed += () => _settingsChanged = true;
    }

    protected internal override void Enable()
    {
        _panel = new GatherListPanel(_settings, this);
        _shownVersion = -1;
        _nextRefresh = 0f;
    }

    protected internal override void Disable()
    {
        _panel?.Destroy();
        _panel = null;
        _button.Destroy();
        _minimap.Destroy();
        _mapPins.Destroy();
        _arrow.Destroy();
        _catalogue.Clear();
        _zone = -1;
    }

    protected internal override void Update()
    {
        var player = GameAccess.LocalPlayer;
        if (!GameAccess.InWorld || player == null || ZoneInfo.singleton == null || GameAccess.NetworkManagerMmo == null)
        {
            Hide();
            return;
        }

        if (!_catalogue.Built)
        {
            if (!_patched)
            {
                Patching.Apply(typeof(GatherItemStartPatch));
                _patched = true;
            }

            _catalogue.Build();
            _nextRefresh = 0f;
        }

        Vector2 position = player.transform.position;
        bool settingsChanged = _settingsChanged;
        _settingsChanged = false;
        if (player.idZone != _zone || Time.unscaledTime >= _nextRefresh || settingsChanged || WatchedChanged())
            Refresh(player, position);

        if (_button.Ensure() && _button.Update(_settings.Shown.Value))
        {
            _settings.Shown.Value = !_settings.Shown.Value;
            _settings.Save();
        }

        UpdatePanel(settingsChanged);

        var nodes = _catalogue.Zone(_zone);
        bool hideGrowing = _settings.Growing.Value == GrowingNodes.Hide;
        // The local map covers the minimap while open. Temple of Valaark has no map, so its nodes stay off the minimap too.
        var map = UIMap.singleton;
        bool mapShown = map != null && map.panel != null && map.panel.activeSelf;
        if (!_settings.Minimap.Value) _minimap.Destroy();
        else if (mapShown || _zone == MapOverlay.MaplessZone) _minimap.HideAll();
        else _minimap.Update(_now);
        if (_settings.MapPins.Value) _mapPins.Update(nodes, _watched, _catalogue, _now, hideGrowing, _version);
        else _mapPins.Destroy();
        if (_settings.Arrow.Value) _arrow.Update(_catalogue, position, _now);
        else _arrow.Destroy();
    }

    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        // Leaving a world destroys the game's interface the button, icons and pins sit in.
        _button.Forget();
        _minimap.Forget();
        _mapPins.Forget();
        _arrow.Destroy();
        _panel?.SetVisible(false);
        _catalogue.Clear();
        _zone = -1;
    }

    // Once a second, or when the zone, a setting or the watched types change: the zone's ready
    // times, the arrow's node and the minimap's near nodes.
    private void Refresh(Player player, Vector2 position)
    {
        _nextRefresh = Time.unscaledTime + RefreshSeconds;
        _zone = player.idZone;
        _now = GameAccess.ServerTime(GameAccess.NetworkManagerMmo);
        _catalogue.Refresh(_zone, GameAccess.HostsServer);
        UpdateWatched();

        var nodes = _catalogue.Zone(_zone);
        bool hideGrowing = _settings.Growing.Value == GrowingNodes.Hide;
        _minimap.Choose(nodes, _settings.Minimap.Value ? _watched : (IReadOnlyList<GatherType>)System.Array.Empty<GatherType>(),
            _catalogue, position, _now, hideGrowing);
        _arrow.Choose(nodes, _settings.Arrow.Value ? _watched : (IReadOnlyList<GatherType>)System.Array.Empty<GatherType>(), position, _now);
        _version++;
    }

    private void UpdatePanel(bool settingsChanged)
    {
        if (!_settings.Shown.Value)
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
        _panel.UpdateInput(out bool changed);
        float width = _settings.Panel.Width;
        if (changed || settingsChanged || _version != _shownVersion || width != _shownWidth)
        {
            if (changed) UpdateWatched();
            _panel.Rebuild(_catalogue, _zone, _now);
            _shownVersion = _version;
            _shownWidth = width;
        }
    }

    private bool WatchedChanged() => _settings.WatchVersion != _watchedFor || _catalogue.Version != _watchedCatalogue;

    private void UpdateWatched()
    {
        if (!WatchedChanged()) return;
        _watchedFor = _settings.WatchVersion;
        _watchedCatalogue = _catalogue.Version;
        _watched.Clear();
        foreach (var types in _catalogue.Types.Values)
            foreach (var type in types)
                if (_settings.Watched(type.Key))
                    _watched.Add(type);
        // The surfaces pick their nodes again at once, so a click shows on the map without waiting.
        _nextRefresh = 0f;
    }

    private void Hide()
    {
        if (_panel != null && _panel.Exists) _panel.SetVisible(false);
        _arrow.Destroy();
    }
}
