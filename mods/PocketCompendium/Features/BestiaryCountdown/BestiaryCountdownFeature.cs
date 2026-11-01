using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BestiaryCountdown;

/// <summary>
/// Counts down dead monsters in the Bestiary: a sweep and time on their grid portraits, and a
/// "Respawns in" plate on their pages between the facts and the lore. It draws its own objects
/// over the game's, so it needs no patch on the page.
/// </summary>
public sealed class BestiaryCountdownFeature : Feature
{
    private readonly Dictionary<int, SlotOverlay> _slots = new();
    private RespawnPlate _plate;
    private int _version = -1;

    public BestiaryCountdownFeature()
        : base("BestiaryCountdown", "Bestiary countdown", "Counts down dead monsters in the Bestiary, on their portraits in the grid and on their pages.")
    {
    }

    public override Sprite Icon => Icons.Timer;

    public override bool UsesTracker => true;

    protected internal override void Enable() => _version = -1;

    protected internal override void Disable()
    {
        foreach (var slot in _slots.Values) slot.Destroy();
        _slots.Clear();
        _plate?.Destroy();
        _plate = null;
    }

    protected internal override void Update()
    {
        var tracker = Tracker.Current;
        var journal = UIJournal.singleton;
        var detail = UIBestiaryDetail.singleton;
        bool open = tracker != null && tracker.Ready && !tracker.Failed && journal != null && journal.content != null
                    && journal.content.gameObject.activeInHierarchy;
        if (!open)
        {
            _plate?.SetActive(false);
            return;
        }

        bool refresh = tracker.Version != _version;
        _version = tracker.Version;
        UpdateGrid(tracker, journal, refresh);
        UpdatePage(tracker, detail, refresh);
    }

    // The grid's slots follow the Bestiary's list one to one.
    private void UpdateGrid(Tracker tracker, UIJournal journal, bool refresh)
    {
        var definitions = GameManager.singleton.elitesBosses;
        int count = Mathf.Min(definitions.Count, journal.content.childCount);
        for (int index = 0; index < count; index++)
        {
            var slot = journal.content.GetChild(index).GetComponent<UIJournalSlot>();
            if (slot == null || slot.image == null || definitions[index] == null) continue;

            int id = slot.GetInstanceID();
            bool created = false;
            if (!_slots.TryGetValue(id, out var overlay))
            {
                overlay = new SlotOverlay(slot.image.rectTransform);
                _slots[id] = overlay;
                created = true;
            }

            if (refresh || created) overlay.Show(tracker.Find(definitions[index].name), tracker.Now);
        }
    }

    private void UpdatePage(Tracker tracker, UIBestiaryDetail detail, bool refresh)
    {
        var monster = detail != null && detail.monster != null && detail.loreBoss != null && detail.zoneBoss != null
            ? tracker.Find(detail.monster.name)
            : null;
        bool counting = monster != null && detail.loreBoss.gameObject.activeInHierarchy && RespawnPlate.Shows(monster.State);
        if (!counting)
        {
            _plate?.SetActive(false);
            return;
        }

        _plate ??= new RespawnPlate(detail.transform);
        _plate.SetActive(true);
        _plate.Place(detail.zoneBoss.rectTransform, detail.loreBoss.rectTransform);
        if (refresh || _plate.ShownKey != monster.Key) _plate.Show(monster, tracker.Now);
    }
}

/// <summary>A dead monster's sweep and time over its portrait in the Bestiary grid.</summary>
internal sealed class SlotOverlay
{
    private readonly RectTransform _root;
    private readonly Image _sweep;
    private readonly Label _time;

    public SlotOverlay(RectTransform portrait)
    {
        _root = HudFactory.Rect("PC_Countdown", portrait).GetComponent<RectTransform>();
        HudFactory.Stretch(_root, Vector2.zero, Vector2.zero);

        _sweep = HudFactory.Box("sweep", _root, new Color(0f, 0f, 0f, 0.62f));
        HudFactory.Stretch(_sweep, Vector2.zero, Vector2.zero);
        _sweep.type = Image.Type.Filled;
        _sweep.fillMethod = Image.FillMethod.Radial360;
        _sweep.fillOrigin = (int)Image.Origin360.Top;
        _sweep.fillClockwise = true;

        _time = HudFactory.Label("time", _root, 13f, Color.white, Align.Center, bold: true, monospaced: true);
        _time.Text.extraPadding = true;
        _time.Text.outlineWidth = 0.3f;
        _time.Text.outlineColor = new Color32(0, 0, 0, 255);
        HudFactory.Place(_time.Rect, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(-4f, -1f), new Vector2(4f, 19f));
        _root.gameObject.SetActive(false);
    }

    public void Show(TrackedMonster monster, double now)
    {
        var state = monster?.State ?? default;
        bool counting = monster != null && RespawnPlate.Shows(state);
        if (_root.gameObject.activeSelf != counting) _root.gameObject.SetActive(counting);
        if (!counting) return;

        _sweep.fillAmount = StateText.Remaining(state, monster.Rules, now);
        _time.Value = StateText.Caption(state, now);
    }

    public void Destroy()
    {
        if (_root != null) Object.Destroy(_root.gameObject);
    }
}

/// <summary>
/// "Respawns in 4:19" with a filling bar, on the split between a page's facts and its lore,
/// starting under the zone line.
/// </summary>
internal sealed class RespawnPlate
{
    private const float Height = 28f;
    private static readonly Color Background = new(0.031f, 0.035f, 0.051f, 0.92f);
    private static readonly Color Edge = new(0.784f, 0.675f, 0.314f, 0.6f);
    private static readonly Color Track = new(1f, 1f, 1f, 0.1f);
    private static readonly Color Text = new(0.925f, 0.902f, 0.827f, 1f);

    private readonly Image _background;
    private readonly Label _label;
    private readonly Image _fill;
    private readonly RectTransform _bar;
    private readonly RectTransform _page;

    // GetWorldCorners writes into an Il2Cpp array. A managed one would be copied and stay empty.
    private readonly Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppStructArray<Vector3> _corners = new(4);

    public RespawnPlate(Transform page)
    {
        _page = page.GetComponent<RectTransform>();
        _background = HudFactory.Sliced("PC_RespawnPlate", page, Shapes.Rounded, Background, cornerScale: 0.45f);
        var rect = _background.rectTransform;
        rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.pivot = new Vector2(0f, 0.5f);
        var edge = HudFactory.Sliced("edge", rect, Shapes.RoundedOutline, Edge, cornerScale: 0.45f);
        HudFactory.Stretch(edge, Vector2.zero, Vector2.zero);

        var icon = HudFactory.Tinted("icon", rect, Icons.Timer, Theme.Golden);
        HudFactory.TopLeft(icon, 10f, (Height - 14f) / 2f - 1f, 14f, 14f);
        _label = HudFactory.Label("text", rect, 13f, Text, Align.Left, monospaced: true);
        HudFactory.TopLeft(_label.Rect, 31f, 0f, 200f, Height - 3f);

        var track = HudFactory.Box("track", rect, Track);
        _bar = track.rectTransform;
        _fill = HudFactory.Bar("fill", _bar, Theme.Gold);
        HudFactory.Stretch(_fill, Vector2.zero, Vector2.zero);
    }

    public string ShownKey { get; private set; }

    public static bool Shows(in TrackedState state) =>
        state.State is (SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance or SpawnState.Window) && state.At.HasValue;

    public void SetActive(bool active)
    {
        if (_background.gameObject.activeSelf != active) _background.gameObject.SetActive(active);
        if (!active) ShownKey = null;
    }

    /// <summary>Puts the plate under the zone line, centred between the facts and the lore.</summary>
    public void Place(RectTransform zone, RectTransform lore)
    {
        zone.GetWorldCorners(_corners);
        Vector2 zoneLeftBottom = _page.InverseTransformPoint(_corners[0]);
        lore.GetWorldCorners(_corners);
        Vector2 loreTop = _page.InverseTransformPoint(_corners[1]);

        // The zone line's icon sits left of its text.
        _background.rectTransform.anchoredPosition = new Vector2(zoneLeftBottom.x - 37f, (zoneLeftBottom.y + loreTop.y) / 2f) - _page.rect.center;
    }

    public void Show(TrackedMonster monster, double now)
    {
        ShownKey = monster.Key;
        var state = monster.State;
        string lead = state.State switch
        {
            SpawnState.Chance => "Next roll in",
            SpawnState.Window => "Window opens in",
            _ => "Respawns in",
        };
        string time = state.State == SpawnState.Window
            ? (state.Estimate ? "~" : "") + StateText.Minutes(state.At.Value - now)
            : StateText.Value(state, now);
        _label.Value = lead + " <b><color=#FFFFFF>" + time + "</color></b>";

        float width = 31f + Mathf.Ceil(_label.PreferredWidth) + 12f;
        _background.rectTransform.sizeDelta = new Vector2(width, Height);
        HudFactory.TopLeft(_bar, 9f, Height - 5f, width - 18f, 2f);
        _fill.fillAmount = state.State == SpawnState.Window ? 0f : 1f - StateText.Remaining(state, monster.Rules, now);
    }

    public void Destroy()
    {
        if (_background != null) Object.Destroy(_background.gameObject);
    }
}
