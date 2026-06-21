using Il2Cpp;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BetterBestiary.Ui;

/// <summary>
/// The Skills side panel: a native uGUI window docked beside the Bestiary
/// window. Built at runtime with the same `new GameObject` + AddComponent idiom
/// proven in BossTracker. Layout constants are initial values tuned during the
/// in-game pass.
/// </summary>
internal sealed class SkillsPanel
{
    private const float Gap = 12f;
    private const float Width = 460f;

    private GameObject _root;
    private RectTransform _rect;
    private TextMeshProUGUI _title;

    public Transform Content { get; private set; }
    public GameObject RowTemplate { get; private set; }

    public bool IsOpen => _root != null && _root.activeSelf;

    /// <summary>Returns a TMP font asset from an existing Bestiary text element so
    /// runtime-created TMP labels actually render. Null if unavailable.</summary>
    public static TMP_FontAsset GameFont()
    {
        var detail = UIBestiaryDetail.singleton;
        if (detail != null && detail.nameBoss != null)
            return detail.nameBoss.font;
        return null;
    }

    public static TextMeshProUGUI MakeText(Transform parent, string text, float size, FontStyles style)
    {
        var go = new GameObject("Text");
        go.transform.SetParent(parent, false);
        go.AddComponent<RectTransform>();
        var tmp = go.AddComponent<TextMeshProUGUI>();
        var font = GameFont();
        if (font != null)
            tmp.font = font;
        tmp.text = text;
        tmp.fontSize = size;
        tmp.fontStyle = style;
        tmp.color = Color.white;
        return tmp;
    }

    public void EnsureCreated()
    {
        var journal = UIJournal.singleton;
        if (_root != null || journal == null || journal.rectTransformJournal == null)
            return;

        var parent = journal.rectTransformJournal.parent;

        _root = new GameObject("BetterBestiary_SkillsPanel");
        _rect = _root.AddComponent<RectTransform>();
        _rect.SetParent(parent, false);

        var bg = _root.AddComponent<Image>();
        bg.color = new Color(0.06f, 0.06f, 0.08f, 0.95f);

        var layout = _root.AddComponent<VerticalLayoutGroup>();
        layout.childControlWidth = true;
        layout.childControlHeight = false;
        layout.childForceExpandWidth = true;
        layout.childForceExpandHeight = false;
        layout.padding = new RectOffset(10, 10, 10, 10);
        layout.spacing = 6f;

        _title = MakeText(_root.transform, "Skills", 20f, FontStyles.Bold);

        var contentGo = new GameObject("Content");
        contentGo.transform.SetParent(_root.transform, false);
        contentGo.AddComponent<RectTransform>();
        var contentLayout = contentGo.AddComponent<VerticalLayoutGroup>();
        contentLayout.childControlWidth = true;
        contentLayout.childControlHeight = false;
        contentLayout.childForceExpandWidth = true;
        contentLayout.childForceExpandHeight = false;
        contentLayout.spacing = 4f;
        var fitter = contentGo.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        Content = contentGo.transform;

        RowTemplate = SkillsPanelRenderer.BuildRowTemplate(_root.transform);
        RowTemplate.SetActive(false);

        _root.SetActive(false);
    }

    public void SetTitle(string monsterName)
    {
        if (_title != null)
            _title.text = "Skills \u2014 " + monsterName;
    }

    public void SetOpen(bool open)
    {
        EnsureCreated();
        if (_root == null)
            return;
        _root.SetActive(open);
        if (open)
            Reposition();
    }

    /// <summary>Dock to the side of the Bestiary window with more room; clamp on-screen.</summary>
    public void Reposition()
    {
        var journal = UIJournal.singleton;
        if (_rect == null || journal == null || journal.rectTransformJournal == null)
            return;
        var win = journal.rectTransformJournal;

        _rect.anchorMin = win.anchorMin;
        _rect.anchorMax = win.anchorMax;
        _rect.pivot = win.pivot;
        _rect.sizeDelta = new Vector2(Width, win.rect.height);

        var corners = new Il2CppStructArray<Vector3>(4);
        win.GetWorldCorners(corners);
        var leftPx = corners[0].x;
        var rightPx = corners[2].x;
        var placeRight = (Screen.width - rightPx) >= leftPx;

        var dir = placeRight ? 1f : -1f;
        var pos = win.anchoredPosition;
        pos.x += dir * (win.rect.width + Gap);
        _rect.anchoredPosition = pos;

        // Clamp fully on-screen using world corners after placement.
        var self = new Il2CppStructArray<Vector3>(4);
        _rect.GetWorldCorners(self);
        var scale = _rect.lossyScale.x <= 0f ? 1f : _rect.lossyScale.x;
        if (self[2].x > Screen.width)
            _rect.anchoredPosition += new Vector2(-(self[2].x - Screen.width) / scale, 0f);
        else if (self[0].x < 0f)
            _rect.anchoredPosition += new Vector2(-self[0].x / scale, 0f);

        _rect.SetAsLastSibling();
    }
}
