using System;
using AncientKingdomsMods.Shared;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BetterBestiary.Ui;

/// <summary>
/// The "Skills" toggle button below the Bestiary window's bottom-right corner.
/// </summary>
internal sealed class SkillsToggleButton
{
    private GameObject _go;
    private Button _button;
    private TextMeshProUGUI _label;
    private readonly Action _onClick;

    public SkillsToggleButton(Action onClick) => _onClick = onClick;

    public Selectable VisibleSelectable => _go != null && _go.activeInHierarchy ? _button : null;

    public void EnsureCreated(UIJournal journal)
    {
        if (_go != null || journal == null || journal.panel == null)
            return;

        _go = new GameObject("BetterBestiary_SkillsButton");
        _go.transform.SetParent(journal.panel.transform, false);

        var rect = _go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(1f, 0f);
        rect.anchorMax = new Vector2(1f, 0f);
        rect.pivot = new Vector2(1f, 1f);
        rect.anchoredPosition = new Vector2(-16f, -8f);
        rect.sizeDelta = new Vector2(110f, 40f);

        var image = _go.AddComponent<Image>();
        image.color = new Color(0.15f, 0.15f, 0.18f, 0.95f);

        _button = _go.AddComponent<Button>();
        var onClick = _onClick;
        _button.onClick.AddListener((UnityEngine.Events.UnityAction)(() => onClick()));

        _label = SkillsPanel.MakeText(_go.transform, "Skills", 18f, FontStyles.Bold);
        _label.alignment = TextAlignmentOptions.Center;
        var labelRect = _label.GetComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.sizeDelta = Vector2.zero;
        labelRect.anchoredPosition = Vector2.zero;
    }

    public void Refresh()
    {
        if (_label == null)
            return;
        GameText.ApplyFont(_label);
        _label.text = GameText.Term("Skills", "Skills");
    }

    public void SetVisible(bool visible)
    {
        if (_go != null && _go.activeSelf != visible)
            _go.SetActive(visible);
    }
}
