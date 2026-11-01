using PocketCompendium.Core.Text;
using Il2Cpp;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// Owns the Skills button and panel and drives them from the Bestiary detail update. Shown only
/// on the Bestiary tab of a page Pocket Compendium draws, and only while the Skills button
/// setting is on.
/// </summary>
internal static class SkillsPanelController
{
    private static SkillsPanel _panel;
    private static PageButton _button;
    private static Monster _current;
    private static Monster _rendered;
    private static string _renderedLocale;

    /// <summary>The Skills button, while it is shown, for gamepad navigation.</summary>
    internal static UnityEngine.UI.Selectable VisibleButton => _button?.VisibleSelectable;

    /// <summary>Shows or hides the button and panel, and returns whether the button shows.</summary>
    public static bool OnBestiaryUpdate(UIBestiaryDetail detail)
    {
        var journal = UIJournal.singleton;
        if (!BestiaryPagesFeature.ShowSkillsButton ||
            detail == null || detail.monster == null || journal == null ||
            journal.panel == null || !journal.panel.activeSelf ||
            journal.currentTab != "Bestiary")
        {
            Hide();
            return false;
        }

        _panel ??= new SkillsPanel();
        _button ??= new PageButton("PC_SkillsButton", TogglePanel);

        _current = detail.monster;
        _button.EnsureCreated(journal);
        _button.Show(GameText.Term("Skills", "Skills"), UnityEngine.Color.white, slot: 0);

        // While open, keep the panel in sync with the selected monster and language.
        if (_panel.IsOpen && (_current != _rendered || _renderedLocale != EntityNameLocalization.LocaleCode))
            RenderCurrent();
        return true;
    }

    internal static void Hide()
    {
        _button?.Hide();
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
