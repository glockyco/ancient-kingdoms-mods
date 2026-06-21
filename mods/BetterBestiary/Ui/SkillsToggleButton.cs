using System;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BetterBestiary.Ui;

/// <summary>
/// The "Skills" toggle button, created in the Bestiary detail panel's
/// bottom-right. Built with the proven new GameObject + AddComponent idiom.
/// </summary>
internal sealed class SkillsToggleButton
{
    private GameObject _go;
    private readonly Action _onClick;

    public SkillsToggleButton(Action onClick) => _onClick = onClick;

    public void EnsureCreated(UIJournal journal)
    {
        if (_go != null || journal == null || journal.monsterDetail == null)
            return;

        _go = new GameObject("BetterBestiary_SkillsButton");
        _go.transform.SetParent(journal.monsterDetail.transform, false);

        var rect = _go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(1f, 0f);
        rect.anchorMax = new Vector2(1f, 0f);
        rect.pivot = new Vector2(1f, 0f);
        rect.anchoredPosition = new Vector2(-16f, 16f);
        rect.sizeDelta = new Vector2(120f, 36f);

        var image = _go.AddComponent<Image>();
        image.color = new Color(0.15f, 0.15f, 0.18f, 0.95f);

        var button = _go.AddComponent<Button>();
        var onClick = _onClick;
        button.onClick.AddListener((UnityEngine.Events.UnityAction)(() => onClick()));

        var label = SkillsPanel.MakeText(_go.transform, "Skills", 18f, FontStyles.Bold);
        label.alignment = TextAlignmentOptions.Center;
        var labelRect = label.GetComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.sizeDelta = Vector2.zero;
        labelRect.anchoredPosition = Vector2.zero;
    }

    public void SetVisible(bool visible)
    {
        if (_go != null)
            _go.SetActive(visible);
    }
}
