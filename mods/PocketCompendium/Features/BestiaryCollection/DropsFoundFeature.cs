using System;
using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BestiaryPages.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BestiaryCollection;

/// <summary>
/// Shows on each monster's tile in the Bestiary's list how many of its drops the game records as
/// found: a bar along the top edge, gold once all are found, and the count in the tile's hover.
/// The counts follow the monster's page, which shows the finds of every character in the save.
/// </summary>
public sealed class DropsFoundFeature : Feature
{
    // The Journal's tabs share one list of slots, so the marks belong to this tab only.
    private const string BestiaryTab = "Bestiary";

    private readonly List<TileMark> _marks = new();
    private readonly Dictionary<string, (int Found, int Total)> _counts = new(StringComparer.Ordinal);
    private int _recordSize = -1;
    private int _tiles = -1;
    private bool _undiscovered;
    private bool _drawn;

    public DropsFoundFeature()
        : base("DropsFound", "Drops found", "Shows a bar on each monster in the Bestiary that fills as you find its drops.")
    {
    }

    protected internal override void Enable()
    {
    }

    protected internal override void Disable() => Clear();

    // The tiles live inside the game's Journal, which goes with the World scene.
    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        _marks.Clear();
        _counts.Clear();
        _drawn = false;
    }

    protected internal override void Update()
    {
        var journal = UIJournal.singleton;
        bool open = journal != null && journal.content != null && journal.content.gameObject.activeInHierarchy &&
                    journal.currentTab == BestiaryTab && Player.localPlayer != null;
        if (!open)
        {
            Hide();
            return;
        }

        // The marks change only with the record of finds, the list's tiles or the discovery setting.
        int recordSize = RecordSize(journal);
        bool undiscovered = GeneralSettings.Current == null || GeneralSettings.Current.UndiscoveredMonsters.Value;
        if (_drawn && recordSize == _recordSize && journal.content.childCount == _tiles && undiscovered == _undiscovered)
            return;

        if (recordSize != _recordSize) _counts.Clear();
        _recordSize = recordSize;
        _tiles = journal.content.childCount;
        _undiscovered = undiscovered;
        Draw(journal);
        _drawn = true;
    }

    // The game destroys and creates tiles as the Journal's tabs change, so a mark belongs to a
    // place in the list and is made again once it is no longer on that tile.
    private void Draw(UIJournal journal)
    {
        var monsters = GameManager.singleton.elitesBosses;
        int count = Math.Min(monsters.Count, journal.content.childCount);
        for (int index = 0; index < count; index++)
        {
            var monster = monsters[index];
            var slot = journal.content.GetChild(index).GetComponent<UIJournalSlot>();
            if (monster == null || slot == null || slot.image == null || slot.button == null) continue;

            while (_marks.Count <= index) _marks.Add(null);
            if (_marks[index] == null || !_marks[index].On(slot))
            {
                _marks[index]?.Destroy();
                _marks[index] = new TileMark(slot);
            }

            if (!Discovery.Shown(monster.nameEntity))
            {
                _marks[index].Hide();
                continue;
            }

            var (found, total) = Count(monster);
            _marks[index].Show(found, total, HoverText(monster, found, total));
        }
    }

    private (int Found, int Total) Count(Monster monster)
    {
        if (!_counts.TryGetValue(monster.nameEntity, out var counts))
        {
            counts = BestiaryLootRenderer.CountFound(monster);
            _counts[monster.nameEntity] = counts;
        }
        return counts;
    }

    private static string HoverText(Monster monster, int found, int total)
    {
        string name = GameText.MonsterName(monster);
        if (total == 0) return name;
        return found == total
            ? $"{name}\nAll {total} drops found"
            : $"{name}\n{found} of {total} drops found";
    }

    // Source: Player.cs:TargetRpcUpdateLootItemDiscovered adds finds to this record, so its size
    // changes whenever a find does.
    private static int RecordSize(UIJournal journal)
    {
        var record = journal.listBossesLootDiscovered;
        if (record == null) return 0;
        int size = record.Count;
        foreach (var entry in record) size += entry.Value.Count;
        return size;
    }

    private void Hide()
    {
        if (!_drawn) return;
        foreach (var mark in _marks) mark?.Hide();
        _drawn = false;
    }

    private void Clear()
    {
        foreach (var mark in _marks) mark?.Destroy();
        _marks.Clear();
        _counts.Clear();
        _drawn = false;
    }
}

/// <summary>A tile's bar along its top edge and its hover, clear of the countdown at the bottom.</summary>
internal sealed class TileMark
{
    private static readonly Color Track = new(0f, 0f, 0f, 0.7f);
    private static readonly Color Partial = new(0.85f, 0.85f, 0.85f, 1f);

    private readonly UIJournalSlot _slot;
    private readonly Image _track;
    private readonly Image _fill;
    private readonly HoverText _hover;

    public TileMark(UIJournalSlot slot)
    {
        _slot = slot;
        _track = HudFactory.Box("PC_DropsFound", slot.image.rectTransform, Track);
        _track.raycastTarget = false;
        HudFactory.Place(_track.rectTransform, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(3f, -6f), new Vector2(-3f, -2f));
        _fill = HudFactory.Box("fill", _track.rectTransform, Partial);
        _fill.raycastTarget = false;
        // A gamepad selects the tile's button, so the hover sits on the button for both inputs.
        _hover = new HoverText(slot.button.GetComponent<RectTransform>()) { Look = TooltipLook.Game };
        _track.gameObject.SetActive(false);
    }

    public bool On(UIJournalSlot slot) => _track != null && _slot == slot && _track.transform.parent == slot.image.transform;

    public void Show(int found, int total, string hover)
    {
        bool bar = found > 0 && total > 0;
        if (_track.gameObject.activeSelf != bar) _track.gameObject.SetActive(bar);
        if (bar)
        {
            HudFactory.Place(_fill.rectTransform, Vector2.zero, new Vector2((float)found / total, 1f), Vector2.zero, Vector2.zero);
            _fill.color = found >= total ? Theme.Ready : Partial;
        }
        _hover.Text = hover;
    }

    public void Hide()
    {
        if (_track != null && _track.gameObject.activeSelf) _track.gameObject.SetActive(false);
        _hover.Text = null;
    }

    public void Destroy()
    {
        _hover.Text = null;
        if (_track != null) UnityEngine.Object.Destroy(_track.gameObject);
    }
}
