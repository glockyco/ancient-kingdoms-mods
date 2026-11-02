using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Text;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// Owns the Skills button and window and drives them from the Bestiary detail update. The window
/// opens with every page until the player closes it, by its close button, the game's own window
/// closing or the Skills button, and stays closed until the player opens it again, also after a
/// restart. Shown only on the Bestiary tab of a page Pocket Compendium draws, and only while the
/// Skills button setting is on.
/// </summary>
internal static class SkillsPanelController
{
    private static SkillsWindow _window;
    private static PageButton _button;
    private static Monster _current;
    private static Monster _rendered;
    private static string _renderedLocale;

    // Whether this controller showed the window, so a window that is gone without a close from
    // here was closed by the game, such as by its key for closing windows.
    private static bool _shown;

    /// <summary>The Skills button, while it is shown, for gamepad navigation.</summary>
    internal static Selectable VisibleButton => _button?.VisibleSelectable;

    /// <summary>The window's cards and lines, top to bottom, while the window is open.</summary>
    internal static IReadOnlyList<Selectable> VisibleEntries =>
        _window != null && _window.IsOpen ? _window.Entries : System.Array.Empty<Selectable>();

    /// <summary>
    /// Shows the details of the card or line <paramref name="selected"/> and scrolls it into view.
    /// Returns false when it is no card or line of the window.
    /// </summary>
    internal static bool ShowFocused(GameObject selected)
    {
        foreach (var entry in VisibleEntries)
        {
            if (entry == null || entry.gameObject != selected) continue;
            _window.ScrollIntoView(entry.GetComponent<RectTransform>());
            var details = entry.GetComponent<UIShowToolTip>();
            if (details != null && details.enabled) details.ShowToolTip();
            return true;
        }

        return false;
    }

    /// <summary>Shows or hides the button and window, and returns whether the button shows.</summary>
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

        _window ??= new SkillsWindow(Close);
        _button ??= new PageButton("PC_SkillsButton", Toggle);

        _current = detail.monster;
        _button.EnsureCreated(journal);
        _button.Show(GameText.Term("Skills", "Skills"), UnityEngine.Color.white, slot: 0);

        if (_shown && !_window.IsOpen)
        {
            _shown = false;
            BestiaryPagesFeature.SkillsWindowOpen = false;
        }

        if (BestiaryPagesFeature.SkillsWindowOpen && !_window.IsOpen) Show();

        // While open, keep the window in step with the selected monster and language.
        if (_window.IsOpen && (_current != _rendered || _renderedLocale != EntityNameLocalization.LocaleCode))
            Render();
        _window.Update();
        return true;
    }

    internal static void Hide()
    {
        _button?.Hide();
        _shown = false;
        _window?.SetOpen(false);
    }

    /// <summary>
    /// Forgets the window and button, which the World scene destroys when it unloads, so a window
    /// that is gone then does not count as closed by the game.
    /// </summary>
    internal static void Forget()
    {
        _window = null;
        _button = null;
        _shown = false;
    }

    private static void Show()
    {
        _window.SetOpen(true);
        _shown = _window.IsOpen;
        _rendered = null;
    }

    private static void Toggle()
    {
        if (_window.IsOpen) Close();
        else
        {
            BestiaryPagesFeature.SkillsWindowOpen = true;
            Show();
            Render();
        }
    }

    private static void Close()
    {
        _shown = false;
        _window.SetOpen(false);
        BestiaryPagesFeature.SkillsWindowOpen = false;
    }

    private static void Render()
    {
        if (_current == null) return;
        _window.SetHeading(GameText.MonsterName(_current), _current.level.current);
        SkillsContent.Build(_window, _current);
        _rendered = _current;
        _renderedLocale = EntityNameLocalization.LocaleCode;
    }
}
