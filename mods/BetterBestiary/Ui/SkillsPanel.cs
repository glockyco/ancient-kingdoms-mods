using Il2Cpp;
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
    private const float Width = 640f;

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
        if (detail != null && detail.loreBoss != null)
            return detail.loreBoss.font;
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
        if (_root != null || journal == null || journal.panel == null)
            return;

        var parent = journal.panel.transform;

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
        contentLayout.childControlHeight = true;
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

    /// <summary>Dock to the right of the Journal window; auto-tracks as a child.</summary>
    public void Reposition()
    {
        var journal = UIJournal.singleton;
        if (_rect == null || journal == null || journal.panel == null)
            return;
        var win = journal.panel.GetComponent<RectTransform>();
        if (win == null)
            return;

        _rect.anchorMin = new Vector2(1f, 0.5f);
        _rect.anchorMax = new Vector2(1f, 0.5f);
        _rect.pivot = new Vector2(0f, 0.5f);
        _rect.sizeDelta = new Vector2(Width, win.rect.height);
        _rect.anchoredPosition = new Vector2(Gap, 0f);
        _rect.SetAsLastSibling();
    }
}
