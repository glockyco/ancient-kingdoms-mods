using Il2Cpp;

namespace BetterBestiary.Ui;

/// <summary>
/// Owns the Skills button + panel + summary store and drives them from the
/// Bestiary detail update. Only active on the Bestiary tab; respects the
/// ShowSkillsPanelButton setting.
/// </summary>
internal static class SkillsPanelController
{
    private static SkillsPanel _panel;
    private static SkillsToggleButton _button;
    private static Monster _current;
    private static Monster _rendered;

    public static void OnBestiaryUpdate(UIBestiaryDetail detail)
    {
        if (!BetterBestiarySettings.ShowSkillsPanelButton)
            return;

        var journal = UIJournal.singleton;
        if (detail == null || detail.monster == null || journal == null ||
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

        // While open, keep the panel in sync with the selected monster.
        if (_panel.IsOpen && _current != _rendered)
            RenderCurrent();
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
        _panel.SetTitle(_current.nameEntity);
        SkillsPanelRenderer.Populate(_panel, _current);
        _rendered = _current;
    }

    private static void Hide()
    {
        if (_button != null)
            _button.SetVisible(false);
        if (_panel != null && _panel.IsOpen)
            _panel.SetOpen(false);
    }
}
