using System;
using Il2Cpp;
using Il2CppTMPro;
using PocketCompendium.Core.Text;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// A button below the Bestiary window's bottom-right corner, such as Skills or Watch. Slot 0 is
/// the rightmost, and each further slot stands one button to the left.
/// </summary>
internal sealed class PageButton
{
    private const float Width = 110f;
    private const float Height = 40f;
    private const float Gap = 8f;

    private readonly string _name;
    private readonly Action _onClick;
    private GameObject _go;
    private RectTransform _rect;
    private Button _button;
    private TextMeshProUGUI _label;

    public PageButton(string name, Action onClick)
    {
        _name = name;
        _onClick = onClick;
    }

    public Selectable VisibleSelectable => _go != null && _go.activeInHierarchy ? _button : null;

    public void EnsureCreated(UIJournal journal)
    {
        if (_go != null || journal == null || journal.panel == null)
            return;

        _go = new GameObject(_name);
        _go.transform.SetParent(journal.panel.transform, false);

        _rect = _go.AddComponent<RectTransform>();
        _rect.anchorMin = new Vector2(1f, 0f);
        _rect.anchorMax = new Vector2(1f, 0f);
        _rect.pivot = new Vector2(1f, 1f);
        _rect.sizeDelta = new Vector2(Width, Height);

        var image = _go.AddComponent<Image>();
        image.color = new Color(0.15f, 0.15f, 0.18f, 0.95f);

        _button = _go.AddComponent<Button>();
        var onClick = _onClick;
        _button.onClick.AddListener((UnityEngine.Events.UnityAction)(() => onClick()));

        // The Bestiary's own Latin font, so the button reads like the page. GameText.ApplyFont
        // switches it to the game's CJK fonts in those languages.
        var labelObject = new GameObject("Text");
        labelObject.transform.SetParent(_go.transform, false);
        labelObject.AddComponent<RectTransform>();
        _label = labelObject.AddComponent<TextMeshProUGUI>();
        var detail = UIBestiaryDetail.singleton;
        var font = GameText.LatinFont(detail != null && detail.loreBoss != null ? detail.loreBoss.font : null);
        if (font != null) _label.font = font;
        _label.fontSize = 18f;
        _label.fontStyle = FontStyles.Bold;
        _label.color = Color.white;
        _label.alignment = TextAlignmentOptions.Center;
        var labelRect = _label.GetComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.sizeDelta = Vector2.zero;
        labelRect.anchoredPosition = Vector2.zero;
    }

    public void Show(string text, Color colour, int slot)
    {
        if (_go == null)
            return;

        if (!_go.activeSelf) _go.SetActive(true);
        _rect.anchoredPosition = new Vector2(-16f - slot * (Width + Gap), -8f);
        GameText.ApplyFont(_label);
        if (_label.text != text) _label.text = text;
        if (_label.color != colour) _label.color = colour;
    }

    public void Hide()
    {
        if (_go != null && _go.activeSelf)
            _go.SetActive(false);
    }
}
