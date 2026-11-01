using Il2Cpp;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// The Watch button on the Bestiary page of a tracked monster. It toggles the same watchlist as a
/// click on the monster's list row, tile or map pin, and reads "Watching" while the monster is
/// watched.
/// </summary>
internal static class WatchButtonController
{
    private static PageButton _button;
    private static string _key;

    /// <summary>The Watch button, while it is shown, for gamepad navigation.</summary>
    internal static UnityEngine.UI.Selectable VisibleButton => _button?.VisibleSelectable;

    /// <param name="slot">The button's place from the right, after the buttons shown beside it.</param>
    public static void OnBestiaryUpdate(UIBestiaryDetail detail, int slot)
    {
        var journal = UIJournal.singleton;
        var tracker = Tracker.Current;
        var watchlist = Watchlist.Current;
        var monster = detail != null ? detail.monster : null;
        if (monster == null || journal == null || journal.panel == null || !journal.panel.activeSelf ||
            journal.currentTab != "Bestiary" || watchlist == null ||
            tracker == null || !tracker.Ready || tracker.Failed || tracker.Find(monster.name) == null)
        {
            Hide();
            return;
        }

        _key = monster.name;
        _button ??= new PageButton("PC_WatchButton", Toggle);
        _button.EnsureCreated(journal);
        bool watched = watchlist.Contains(_key);
        _button.Show(watched ? "Watching" : "Watch", watched ? Theme.GroupTitle : UnityEngine.Color.white, slot);
    }

    internal static void Hide() => _button?.Hide();

    private static void Toggle()
    {
        if (_key != null) Watchlist.Current?.Toggle(_key);
    }
}
