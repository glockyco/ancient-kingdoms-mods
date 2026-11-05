using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.WorldMarkers;

/// <summary>Dead monsters of the player's zone shown on their spawn points, under the game's interface.</summary>
public sealed class WorldMarkersFeature : Feature
{
    private readonly Dictionary<string, Slot> _markers = new();
    private readonly MelonLoader.MelonPreferences_Entry<bool> _earlierEdgeArrows;
    private RectTransform _root;

    public WorldMarkersFeature()
        : base("WorldMarkers", "World markers", "Marks dead monsters in your zone on their spawn points.")
    {
        // Edge arrows were a setting here before they had a switch of their own.
        _earlierEdgeArrows = Settings.Stored("EdgeArrows", true);
    }

    /// <summary>Whether edge arrows showed while they were part of world markers. Their own switch starts from it.</summary>
    public bool EarlierEdgeArrows => Switch.Value && _earlierEdgeArrows.Value;

    public override bool UsesTracker => true;

    protected internal override void Enable()
    {
        _root = HudFactory.Rect("PC_WorldMarkers", Overlay.Markers).GetComponent<RectTransform>();
        HudFactory.Stretch(_root, Vector2.zero, Vector2.zero);
    }

    protected internal override void Disable()
    {
        if (_root != null) Object.Destroy(_root.gameObject);
        _root = null;
        _markers.Clear();
    }

    protected internal override void Update()
    {
        bool show = WorldView.Ready(out var tracker, out var player, out var camera);
        if (_root.gameObject.activeSelf != show) _root.gameObject.SetActive(show);
        if (!show) return;

        foreach (var slot in _markers.Values) slot.Used = false;

        var screen = new Vector2(Screen.width, Screen.height);
        foreach (var monster in tracker.Monsters)
            if (monster.Zone == player.idZone && !monster.State.IsUp && HasMarker(monster.State.State))
                Show(monster, camera, tracker.Now, screen, tracker.Version);

        foreach (var slot in _markers.Values)
            if (!slot.Used)
                slot.Marker.SetActive(false);
    }

    // A marker says when or why a dead monster spawns. Sightings and unknowns have nothing to say.
    private static bool HasMarker(SpawnState state) =>
        state is SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance or SpawnState.Due
            or SpawnState.Window or SpawnState.Guards or SpawnState.Altar;

    private void Show(TrackedMonster monster, Camera camera, double now, Vector2 screen, int version)
    {
        Vector3 point = camera.WorldToScreenPoint(new Vector3(monster.Where.x, monster.Where.y, 0f));
        const float margin = WorldView.EdgeMargin;
        if (point.z < 0f || point.x < -margin || point.y < -margin || point.x > screen.x + margin || point.y > screen.y + margin)
            return;

        if (!_markers.TryGetValue(monster.Key, out var slot))
        {
            slot = new Slot(new SpawnMarkerView(_root));
            _markers[monster.Key] = slot;
        }

        slot.Used = true;
        slot.Marker.SetActive(true);
        slot.Marker.Rect.anchoredPosition = WorldView.Local(point);

        // Positions follow the camera every frame. Text changes once per tracker refresh.
        if (slot.Version == version) return;
        slot.Version = version;

        var state = monster.State;
        bool named = Discovery.Shown(monster.Key);
        var tier = GameAccess.TierColor(monster.Tier);
        float remaining = StateText.Remaining(state, monster.Rules, now);
        bool counting = state.State is SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance;
        slot.Marker.Set(GameAccess.Portrait(monster.Definition), tier, Theme.Readable(tier),
            named ? GameText.EntityName(monster.Key) : "???", StateText.Value(state, now),
            state.State == SpawnState.Window && monster.Rules.NightWindow ? Theme.Night : Color.white,
            counting ? 1f - remaining : null, !named);
    }

    private sealed class Slot
    {
        public Slot(SpawnMarkerView marker) => Marker = marker;

        public SpawnMarkerView Marker { get; }
        public bool Used;

        // The tracker version the marker's text shows.
        public int Version = -1;
    }
}
