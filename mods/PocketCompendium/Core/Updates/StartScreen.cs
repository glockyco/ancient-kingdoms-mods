using System.Collections.Generic;
using AncientKingdomsMods.Shared.Updates;
using PocketCompendium.Core.Feedback;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace PocketCompendium.Core.Updates;

/// <summary>
/// The first-start question and the update card, drawn over the game's start menu and nowhere else:
/// not over the game's own settings, the loading screen, character selection or the world.
/// </summary>
internal sealed class StartScreen
{
    private const float CardWidth = 404f;
    private const float CardTextX = 66f;
    private const float QuestionWidth = 500f;
    private const float Pad = 24f;

    private readonly UpdateService _updates;
    private readonly LayoutSettings _layout;
    private Il2Cpp.UILogin _login;
    private float _nextSearch;

    private GameObject _question;
    private AnswerRows _answers;
    private ButtonView _continue;
    private EventSystem _pausedEvents;

    private GameObject _card;
    private UpdateCard _cardShown;
    private int _cardRevision = -1;
    private ButtonView _primary;
    private ButtonView _secondary;
    private IconButton _close;

    public StartScreen(UpdateService updates, LayoutSettings layout)
    {
        _updates = updates;
        _layout = layout;
    }

    public void Update()
    {
        bool menu = MenuOpen();
        bool asking = menu && _updates.Answer == null;
        if (asking && _question == null) BuildQuestion();
        if (!asking && _question != null) CloseQuestion();
        if (_question != null) HandleQuestion();

        var card = menu && _question == null ? _updates.Card : UpdateCard.None;
        if (card != _cardShown || card != UpdateCard.None && _cardRevision != _updates.Revision) BuildCard(card);
        if (_card != null) HandleCard();
    }

    public void Destroy()
    {
        CloseQuestion();
        BuildCard(UpdateCard.None);
    }

    // The menu's panel stays active under the game's settings and the loading screen, so those count too.
    private bool MenuOpen()
    {
        if (SceneManager.GetActiveScene().name != "Start")
        {
            _login = null;
            return false;
        }
        if (_login == null)
        {
            // A search a second at most, because finding an object walks the whole scene.
            if (Time.unscaledTime < _nextSearch) return false;
            _nextSearch = Time.unscaledTime + 1f;
            _login = Object.FindObjectOfType<Il2Cpp.UILogin>();
            if (_login == null) return false;
        }
        return _login.homePanel != null && _login.homePanel.activeInHierarchy
            && (_login.settingsPanel == null || !_login.settingsPanel.activeInHierarchy)
            && (_login.loadingPanel == null || !_login.loadingPanel.activeInHierarchy);
    }

    private void BuildQuestion()
    {
        _question = HudFactory.Rect("PC_UpdatesQuestion", Overlay.Windows);
        HudFactory.Stretch(_question.GetComponent<RectTransform>(), Vector2.zero, Vector2.zero);
        var dim = HudFactory.Box("dim", _question.transform, new Color(0f, 0f, 0f, 0.45f));
        dim.raycastTarget = true;
        HudFactory.Stretch(dim, Vector2.zero, Vector2.zero);

        var window = HudFactory.Rect("window", _question.transform).GetComponent<RectTransform>();
        var accent = UpdateUi.Panel(window);
        Bar(window);
        float inner = QuestionWidth - 2f * Pad;
        float y = 42f + 20f;
        UpdateUi.Text(window, "Updates", Pad, y, inner, 17f, Theme.Text, bold: true, wrap: false);
        y += 30f;
        y += UpdateUi.Height(UpdateUi.Text(window, UpdateWords.Summary, Pad, y, inner, 12.5f, Theme.Muted)) + 16f;
        _answers = new AnswerRows(window, Pad, y, inner, chosen: 0);
        y += _answers.Height + 16f;
        UpdateUi.Text(window, $"Change it later in the settings ({_layout.SettingsKey.Value}), on the Updates page.", Pad, y + 7f, inner - 130f, 12f, Theme.Dim);
        _continue = new ButtonView(window, "Continue", ButtonStyle.Primary, 110f, 32f);
        HudFactory.TopLeft(_continue.Rect, QuestionWidth - Pad - 110f, y, 110f, 32f);
        UpdateUi.Size(window, accent, QuestionWidth, y + 32f + 22f);
        UpdateUi.Anchored(window, new Vector2(0.5f, 0.5f), Vector2.zero);

        // The game's menu would otherwise take the arrow keys, the gamepad and Enter behind the window.
        _pausedEvents = EventSystem.current;
        if (_pausedEvents != null) _pausedEvents.sendNavigationEvents = false;
    }

    private static void Bar(RectTransform window)
    {
        var bar = HudFactory.Box("bar", window, Theme.Header);
        var rect = HudFactory.TopLeft(bar, 0f, 2f, QuestionWidth, 40f);
        var line = HudFactory.Box("barLine", rect, Theme.Line);
        HudFactory.Place(line, new Vector2(0f, 0f), new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, 1f));
        var title = HudFactory.Label("title", rect, 15f, Theme.Gold, Align.Left, bold: true);
        HudFactory.TopLeft(title.Rect, 16f, 0f, 220f, 40f);
        title.Value = "Pocket Compendium";
        var subtitle = HudFactory.Label("subtitle", rect, 13f, Theme.Muted, Align.Left);
        HudFactory.TopLeft(subtitle.Rect, 16f + title.PreferredWidth + 10f, 0f, 200f, 40f);
        subtitle.Value = "Welcome";
    }

    private void HandleQuestion()
    {
        int clicked = _answers.Update();
        if (clicked >= 0) _answers.Set(clicked);

        var keyboard = Keyboard.current;
        var gamepad = Gamepad.current;
        bool up = keyboard != null && keyboard.upArrowKey.wasPressedThisFrame || gamepad != null && gamepad.dpad.up.wasPressedThisFrame;
        bool down = keyboard != null && keyboard.downArrowKey.wasPressedThisFrame || gamepad != null && gamepad.dpad.down.wasPressedThisFrame;
        bool confirm = keyboard != null && (keyboard.enterKey.wasPressedThisFrame || keyboard.numpadEnterKey.wasPressedThisFrame)
            || gamepad != null && gamepad.buttonSouth.wasPressedThisFrame;
        if (up) _answers.Set(Mathf.Max(0, _answers.Chosen - 1));
        if (down) _answers.Set(Mathf.Min(UpdateWords.Answers.Length - 1, _answers.Chosen + 1));

        if (_continue.Update() || confirm)
            _updates.Choose((UpdateAnswer)_answers.Chosen);
    }

    private void CloseQuestion()
    {
        if (_question != null) Object.Destroy(_question);
        _question = null;
        _answers = null;
        _continue = null;
        if (_pausedEvents != null) _pausedEvents.sendNavigationEvents = true;
        _pausedEvents = null;
    }

    private void BuildCard(UpdateCard card)
    {
        if (_card != null) Object.Destroy(_card);
        _card = null;
        _primary = _secondary = null;
        _close = null;
        _cardShown = card;
        _cardRevision = _updates.Revision;
        if (card == UpdateCard.None) return;

        string version = (card == UpdateCard.Updated ? _updates.Running : _updates.Version ?? _updates.Running).ToString();
        var (icon, title, primary, secondary) = card switch
        {
            UpdateCard.Out => (Icons.CircleArrowDown, $"Pocket Compendium {version} is out", "Install", "Later"),
            UpdateCard.Downloaded => (Icons.CircleCheck, $"Pocket Compendium {version} is downloaded", null, null),
            UpdateCard.InstallFailed => (Icons.CircleAlert, $"Couldn't install Pocket Compendium {version}", "Download", "Later"),
            _ => (Icons.Sparkles, $"Pocket Compendium updated to {version}", null, null),
        };
        IReadOnlyList<string> lines = card switch
        {
            UpdateCard.Downloaded => new[] { UpdateWords.LoadsNextStart },
            UpdateCard.InstallFailed => new[] { "Download it from the website instead." },
            _ => _updates.Changes(ChangeLines.CardLines),
        };
        bool buttons = primary != null;

        _card = HudFactory.Rect("PC_UpdateCard", Overlay.Windows);
        var root = _card.GetComponent<RectTransform>();
        var accent = UpdateUi.Panel(root);

        // The card widens to its title, so a title never ends in an ellipsis.
        float rightRoom = buttons ? 20f : 42f;
        var heading = UpdateUi.Text(root, title, CardTextX, 17f, 1000f, 15.5f, Theme.Text, bold: true, wrap: false);
        float width = Mathf.Max(CardWidth, CardTextX + heading.PreferredWidth + rightRoom + 4f);
        float textWidth = width - CardTextX - rightRoom;
        heading.Rect.sizeDelta = new Vector2(textWidth, heading.Rect.sizeDelta.y);

        float y = 18f + 22f;
        if (lines.Count > 0)
            y += 4f + UpdateUi.Height(UpdateUi.Text(root, string.Join("\n", lines), CardTextX, y + 4f, textWidth, 13f, Theme.Muted));
        if (buttons)
        {
            _primary = new ButtonView(root, primary, ButtonStyle.Primary, 112f, 30f);
            HudFactory.TopLeft(_primary.Rect, CardTextX, y + 14f, 112f, 30f);
            _secondary = new ButtonView(root, secondary, ButtonStyle.Link, 72f, 30f);
            HudFactory.TopLeft(_secondary.Rect, CardTextX + 124f, y + 14f, 72f, 30f);
            y += 14f + 30f;
        }
        else
        {
            _close = new IconButton(root, Icons.X, 22f, 14f);
            HudFactory.TopLeft(_close.Rect, width - 36f, 14f, 22f, 22f);
        }
        UpdateUi.Disc(root, icon, 18f, 18f, 36f);
        UpdateUi.Size(root, accent, width, y + 18f);
        // Bottom left, above the game's version number.
        UpdateUi.Anchored(root, Vector2.zero, new Vector2(38f, 140f));
    }

    private void HandleCard()
    {
        if (_close != null && _close.Update() || _secondary != null && _secondary.Update())
        {
            _updates.DismissCard();
            return;
        }
        if (_primary == null || !_primary.Update()) return;
        if (_cardShown == UpdateCard.Out)
        {
            _updates.Install();
            return;
        }
        Application.OpenURL(ModLinks.Site + "/mods");
        _updates.DismissCard();
    }
}
