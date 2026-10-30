using AncientKingdomsMods.Shared;
using Il2Cpp;

namespace BetterBestiary.Ui;

/// <summary>
/// Owns the Skills button and panel and drives them from the Bestiary detail update. Shown only
/// on the Bestiary tab of a page Better Bestiary draws, and only while the ShowSkillsPanelButton
/// setting is on.
/// </summary>
internal static class SkillsPanelController
{
    private static SkillsPanel _panel;
    private static SkillsToggleButton _button;
    private static Monster _current;
    private static Monster _rendered;
    private static string _renderedLocale;

    /// <summary>The Skills button, while it is shown, for gamepad navigation.</summary>
    internal static UnityEngine.UI.Selectable VisibleButton => _button != null ? _button.VisibleSelectable : null;

    public static void OnBestiaryUpdate(UIBestiaryDetail detail)
    {
        var journal = UIJournal.singleton;
        if (!BetterBestiarySettings.ShowSkillsPanelButton ||
            detail == null || detail.monster == null || journal == null ||
            journal.panel == null || !journal.panel.activeSelf ||
            journal.currentTab != "Bestiary")
        {
            Hide();
            return;
        }

        _panel ??= new SkillsPanel();
        _button ??= new SkillsToggleButton(TogglePanel);

        _current = detail.monster;
        _button.EnsureCreated(journal);
        _button.SetVisible(true);
        _button.Refresh();

        // While open, keep the panel in sync with the selected monster and language.
        if (_panel.IsOpen && (_current != _rendered || _renderedLocale != EntityNameLocalization.LocaleCode))
            RenderCurrent();
    }

    internal static void Hide()
    {
        if (_button != null)
            _button.SetVisible(false);
        if (_panel != null && _panel.IsOpen)
            _panel.SetOpen(false);
    }

    private static void TogglePanel()
    {
        _panel.SetOpen(!_panel.IsOpen);
        if (_panel.IsOpen)
            RenderCurrent();
    }

    private static void RenderCurrent()
    {
        if (_current == null)
            return;
        _panel.SetTitle(GameText.MonsterName(_current));
        SkillsPanelRenderer.Populate(_panel, _current);
        _rendered = _current;
        _renderedLocale = EntityNameLocalization.LocaleCode;
    }
}
