using System;
using System.Collections.Generic;
using Il2Cpp;
using Il2CppTMPro;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// The Skills window beside the Bestiary page: a copy of the game's Quest Log frame, docked to the
/// Journal's right edge at its height. The game's own <c>UIWindow</c> on the frame lets the player
/// drag it and stores where it was put. Its content scrolls with the mouse wheel and follows the
/// card a gamepad focuses.
/// </summary>
internal sealed class SkillsWindow
{
    public const float Width = 520f;
    private const float Gap = 10f;
    private const float ContentTop = 74f;
    private const float ContentBottom = 24f;
    private const float ScrollStep = 40f;
    private const string WindowName = "PC_SkillsWindow";

    private static readonly Color TrackColor = new(1f, 1f, 1f, 0.06f);
    private static readonly Color ThumbColor = new(0.918f, 0.875f, 0.647f, 0.5f);

    private readonly Action _onClose;
    private GameObject _root;
    private RectTransform _rect;
    private TextMeshProUGUI _title;
    private TextMeshProUGUI _subtitle;
    private RectTransform _viewport;
    private RectTransform _content;
    private Image _track;
    private Image _thumb;
    private float _contentHeight;
    private float _scroll;

    public SkillsWindow(Action onClose) => _onClose = onClose;

    public bool IsOpen => _root != null && _root.activeSelf;

    /// <summary>Where the renderer puts the summary and cards, as wide as <see cref="Width"/>.</summary>
    public RectTransform Content => _content;

    /// <summary>The cards and lines a gamepad moves through, top to bottom, set by the renderer.</summary>
    public List<Selectable> Entries { get; } = new();

    public bool EnsureCreated()
    {
        if (_root != null) return true;

        var journal = UIJournal.singleton;
        var quests = UIQuests.singleton;
        if (journal == null || journal.panel == null || quests == null || quests.panel == null) return false;

        // The copy is made inside an inactive holder, so the game's UIWindow wakes only once the
        // copy has its own name and parent: it keys the stored position by the hierarchy path.
        var holder = new GameObject("PC_SkillsWindowHolder");
        holder.SetActive(false);
        holder.transform.SetParent(journal.panel.transform, false);
        var copy = Object.Instantiate(quests.panel, holder.transform);
        copy.name = WindowName;
        copy.SetActive(false);

        foreach (var name in new[] { "Quests", "ActiveQuests", "CompletedQuests" })
        {
            var child = copy.transform.Find(name);
            if (child == null) continue;
            child.gameObject.SetActive(false);
            Object.Destroy(child.gameObject);
        }

        var journalRect = journal.panel.GetComponent<RectTransform>();
        _rect = copy.GetComponent<RectTransform>();
        _rect.anchorMin = _rect.anchorMax = new Vector2(1f, 1f);
        _rect.pivot = new Vector2(0f, 1f);
        _rect.sizeDelta = new Vector2(Width, journalRect.rect.height);
        _rect.anchoredPosition = new Vector2(Gap, 0f);

        _title = copy.transform.Find("Title/TitleText").GetComponent<TextMeshProUGUI>();
        Pin(copy.transform.Find("Title"), new Vector2(0.5f, 1f), new Vector2(0f, -6f));
        _subtitle = copy.transform.Find("NumberQuestsText").GetComponent<TextMeshProUGUI>();
        Pin(_subtitle.transform, new Vector2(0.5f, 1f), new Vector2(0f, -50f));

        // The Quest Log's close button calls the Quest Log, so it gets a click of its own.
        var close = copy.transform.Find("ButtonClose");
        Pin(close, new Vector2(1f, 1f), new Vector2(-30f, -30f));
        var button = close.GetComponent<Button>();
        button.onClick = new Button.ButtonClickedEvent();
        var onClose = _onClose;
        button.onClick.AddListener((UnityEngine.Events.UnityAction)(() => onClose()));

        _viewport = HudFactory.Rect("PC_SkillsViewport", copy.transform).GetComponent<RectTransform>();
        HudFactory.TopLeft(_viewport, 0f, ContentTop, Width, journalRect.rect.height - ContentTop - ContentBottom);
        _viewport.gameObject.AddComponent<RectMask2D>();
        _content = HudFactory.Rect("PC_SkillsContent", _viewport).GetComponent<RectTransform>();
        HudFactory.TopLeft(_content, 0f, 0f, Width, 0f);

        _track = HudFactory.Box("PC_SkillsTrack", copy.transform, TrackColor);
        _thumb = HudFactory.Box("PC_SkillsThumb", copy.transform, ThumbColor);

        copy.transform.SetParent(journal.panel.transform, false);
        Object.Destroy(holder);
        _root = copy;
        return true;
    }

    public void SetOpen(bool open)
    {
        if (!EnsureCreated()) return;
        if (_root.activeSelf != open) _root.SetActive(open);
        if (open) _root.transform.SetAsLastSibling();
    }

    public void SetHeading(string monsterName, int level)
    {
        if (_title == null) return;
        GameText.ApplyFont(_title);
        _title.text = GameText.Term("Skills", "Skills").ToUpperInvariant();
        GameText.ApplyFont(_subtitle);
        _subtitle.text = monsterName + " · " + GameText.Level(level);
    }

    /// <summary>Called by the renderer once the content is laid out, so the scroll range fits it.</summary>
    public void SetContentHeight(float height)
    {
        _contentHeight = height;
        _content.sizeDelta = new Vector2(Width, height);
        _scroll = 0f;
        Place();
    }

    /// <summary>Scrolls with the mouse wheel while the pointer is over the content.</summary>
    public void Update()
    {
        if (!IsOpen) return;
        float overflow = Overflow();
        if (overflow > 0f && !Mathf.Approximately(Pointer.Scroll, 0f) && Pointer.Over(_viewport))
        {
            _scroll = Mathf.Clamp(_scroll - Pointer.Scroll * ScrollStep, 0f, overflow);
            Place();
        }
    }

    /// <summary>Scrolls just far enough to show <paramref name="entry"/>, a child of the content.</summary>
    public void ScrollIntoView(RectTransform entry)
    {
        const float margin = 6f;
        float top = -entry.anchoredPosition.y;
        float bottom = top + entry.sizeDelta.y;
        float visible = _viewport.rect.height;
        if (top - margin < _scroll) _scroll = top - margin;
        else if (bottom + margin > _scroll + visible) _scroll = bottom + margin - visible;
        _scroll = Mathf.Clamp(_scroll, 0f, Overflow());
        Place();
    }

    private float Overflow() => Mathf.Max(0f, _contentHeight - _viewport.rect.height);

    private void Place()
    {
        _content.anchoredPosition = new Vector2(0f, _scroll);

        // A thin bar along the right edge shows that more follows, and how far down the view is.
        float overflow = Overflow();
        bool scrolls = overflow > 0f;
        _track.enabled = scrolls;
        _thumb.enabled = scrolls;
        if (!scrolls) return;

        float visible = _viewport.rect.height;
        float trackHeight = visible - 8f;
        float thumbHeight = Mathf.Max(24f, trackHeight * visible / _contentHeight);
        HudFactory.TopLeft(_track, Width - 16f, ContentTop + 4f, 4f, trackHeight);
        HudFactory.TopLeft(_thumb, Width - 16f, ContentTop + 4f + (trackHeight - thumbHeight) * (_scroll / overflow), 4f, thumbHeight);
    }

    private static void Pin(Transform child, Vector2 anchor, Vector2 position)
    {
        if (child == null) return;
        var rect = child.GetComponent<RectTransform>();
        rect.anchorMin = rect.anchorMax = anchor;
        rect.anchoredPosition = position;
    }
}
