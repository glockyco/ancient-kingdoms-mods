using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.WorldMarkers;

/// <summary>
/// Dead monsters of the player's zone shown on their spawn points, and arrows at the screen's
/// edge to monsters that are up out of sight. Both sit under the game's interface.
/// </summary>
public sealed class WorldMarkersFeature : Feature
{
    // Screen pixels from the screen's edge to an edge arrow's centre.
    private const float EdgeMargin = 46f;

    private readonly ToggleSetting _edgeArrows;
    private readonly Dictionary<string, Views> _views = new();
    private RectTransform _root;

    public WorldMarkersFeature()
        : base("WorldMarkers", "World markers", "Marks dead monsters in your zone on their spawn points, and points to living ones that are off screen.")
    {
        _edgeArrows = Settings.Toggle("EdgeArrows", true, "Edge arrows",
            "Shows an arrow at the edge of the screen for each living monster in your zone that is off screen.");
    }

    public override Sprite Icon => Icons.LocateFixed;

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
        _views.Clear();
    }

    protected internal override void Update()
    {
        var tracker = Tracker.Current;
        var player = GameAccess.LocalPlayer;
        var camera = Camera.main;
        if (camera == null && UIMap.singleton != null) camera = UIMap.singleton.MainCamera;
        bool show = tracker != null && tracker.Ready && !tracker.Failed && GameAccess.InWorld && player != null && camera != null;
        if (_root.gameObject.activeSelf != show) _root.gameObject.SetActive(show);
        if (!show) return;

        foreach (var views in _views.Values) views.Used = false;

        int zone = player.idZone;
        Vector2 position = player.transform.position;
        var screen = new Vector2(Screen.width, Screen.height);
        foreach (var monster in tracker.Monsters)
        {
            if (monster.Zone != zone) continue;
            var state = monster.State;
            if (state.IsUp)
            {
                if (_edgeArrows.Value) ShowArrow(monster, camera, position, screen, tracker.Version);
            }
            else if (HasMarker(state.State))
            {
                ShowMarker(monster, camera, tracker.Now, screen, tracker.Version);
            }
        }

        foreach (var views in _views.Values)
        {
            if (views.Used) continue;
            views.Marker?.SetActive(false);
            views.Arrow?.SetActive(false);
        }
    }

    // A marker says when or why a dead monster spawns. Sightings and unknowns have nothing to say.
    private static bool HasMarker(SpawnState state) =>
        state is SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance or SpawnState.Due
            or SpawnState.Window or SpawnState.Guards or SpawnState.Altar;

    private void ShowMarker(TrackedMonster monster, Camera camera, double now, Vector2 screen, int version)
    {
        Vector3 point = camera.WorldToScreenPoint(new Vector3(monster.Where.x, monster.Where.y, 0f));
        if (point.z < 0f || point.x < -EdgeMargin || point.y < -EdgeMargin || point.x > screen.x + EdgeMargin || point.y > screen.y + EdgeMargin)
            return;

        var views = ViewsOf(monster.Key);
        views.Used = true;
        views.Arrow?.SetActive(false);
        views.Marker ??= new SpawnMarkerView(_root);
        views.Marker.SetActive(true);
        views.Marker.Rect.anchoredPosition = Local(point);

        // Positions follow the camera every frame. Text changes once per tracker refresh.
        if (views.Version == version && views.ShowsMarker) return;
        views.Version = version;
        views.ShowsMarker = true;

        var state = monster.State;
        bool named = MonsterTooltip.Discovered(monster.Key);
        var tier = GameAccess.TierColor(monster.Tier);
        float remaining = StateText.Remaining(state, monster.Rules, now);
        bool counting = state.State is SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance;
        views.Marker.Set(GameAccess.Portrait(monster.Definition), tier, Theme.Readable(tier),
            named ? GameText.EntityName(monster.Key) : "???", StateText.Value(state, now),
            state.State == SpawnState.Window && monster.Rules.NightWindow ? Theme.Night : Color.white,
            counting ? 1f - remaining : null, !named);
    }

    private void ShowArrow(TrackedMonster monster, Camera camera, Vector2 player, Vector2 screen, int version)
    {
        // A monster that is up may have left its spawn point, so the arrow follows it while the
        // game shows it here.
        Vector2 where = monster.Where;
        var live = monster.Placed != null ? monster.Placed : monster.Live;
        if (live != null && live.gameObject.activeInHierarchy) where = live.transform.position;

        Vector3 point = camera.WorldToScreenPoint(new Vector3(where.x, where.y, 0f));
        bool behind = point.z < 0f;
        if (!behind && point.x >= 0f && point.y >= 0f && point.x <= screen.x && point.y <= screen.y) return;

        Vector2 centre = screen / 2f;
        Vector2 direction = (Vector2)point - centre;
        if (behind) direction = -direction;
        if (direction.sqrMagnitude < 1f) return;

        // Where the line from the screen's middle leaves the inset screen.
        Vector2 half = centre - new Vector2(EdgeMargin, EdgeMargin);
        float reach = Mathf.Min(half.x / Mathf.Max(0.001f, Mathf.Abs(direction.x)), half.y / Mathf.Max(0.001f, Mathf.Abs(direction.y)));
        Vector2 edge = centre + direction * reach;

        var views = ViewsOf(monster.Key);
        views.Used = true;
        views.Marker?.SetActive(false);
        views.Arrow ??= new EdgeArrowView(_root);
        views.Arrow.SetActive(true);
        views.Arrow.Rect.anchoredPosition = Local(edge);

        views.Arrow.Aim(Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg, edge.x < centre.x);
        if (views.Version == version && !views.ShowsMarker) return;
        views.Version = version;
        views.ShowsMarker = false;

        bool named = MonsterTooltip.Discovered(monster.Key);
        var tier = GameAccess.TierColor(monster.Tier);
        float distance = Vector2.Distance(player, where);
        views.Arrow.Show(GameAccess.Portrait(monster.Definition), tier, Theme.Readable(tier),
            named ? GameText.EntityName(monster.Key) : "???", "Up · " + Mathf.RoundToInt(distance) + " yd", !named);
    }

    private Vector2 Local(Vector2 screenPoint)
    {
        RectTransformUtility.ScreenPointToLocalPointInRectangle(Overlay.Markers, screenPoint, null, out var local);
        return local;
    }

    private Views ViewsOf(string key)
    {
        if (!_views.TryGetValue(key, out var views))
        {
            views = new Views();
            _views[key] = views;
        }

        return views;
    }

    private sealed class Views
    {
        public SpawnMarkerView Marker;
        public EdgeArrowView Arrow;
        public bool Used;

        // The tracker version the text shows, and whether it is the marker's or the arrow's.
        public int Version = -1;
        public bool ShowsMarker;
    }
}
