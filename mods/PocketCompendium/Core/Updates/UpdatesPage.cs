using System;
using AncientKingdomsMods.Shared.Updates;
using PocketCompendium.Core.Feedback;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Core.Updates;

/// <summary>
/// The settings page before About: a status line and the first-start question's three answers, in
/// the same words, so the player finds the answer they gave.
/// </summary>
internal sealed class UpdatesPage : ISettingsContent
{
    private readonly UpdateService _updates;
    private int _builtRevision = -1;
    private AnswerRows _answers;
    private ButtonView _action;

    public UpdatesPage(UpdateService updates) => _updates = updates;

    public string Title => "Updates";

    public Sprite Icon => Icons.RefreshCw;

    public bool Stale => _builtRevision != _updates.Revision;

    public float Build(RectTransform parent, float x, float y, float width)
    {
        _builtRevision = _updates.Revision;
        float top = y;
        y += UpdateUi.Height(UpdateUi.Text(parent, UpdateWords.Summary, x, y, width, 12.5f, Theme.Muted)) + 4f;

        var status = _updates.Answer is null or UpdateAnswer.Off ? UpdateStatus.None : _updates.Status;
        string version = _updates.Version?.ToString();
        switch (status)
        {
            case UpdateStatus.Checking:
                y += 10f + UpdateUi.Height(UpdateUi.Text(parent, "Checking for updates.", x, y + 10f, width, 13f, Theme.Text));
                break;
            case UpdateStatus.UpToDate:
                y += 10f + UpdateUi.Height(UpdateUi.Text(parent, $"Pocket Compendium {_updates.Running} is up to date.", x, y + 10f, width, 13f, Theme.Text));
                break;
            case UpdateStatus.Out:
                y += 10f;
                UpdateUi.Text(parent, $"Pocket Compendium {version} is out.", x, y + 4f, width - 130f, 13f, Theme.Gold, wrap: false);
                _action = Button(parent, "Install", x + width - 110f, y);
                y += 28f;
                var changes = _updates.Changes(int.MaxValue);
                if (changes.Count > 0)
                    y += UpdateUi.Height(UpdateUi.Text(parent, string.Join("\n", changes), x, y, width - 130f, 12.5f, Theme.Muted));
                break;
            case UpdateStatus.Downloaded:
                y += 10f + UpdateUi.Height(UpdateUi.Text(parent, $"Pocket Compendium {version} is downloaded. {UpdateWords.LoadsNextStart}", x, y + 10f, width, 13f, Theme.Text));
                break;
            case UpdateStatus.CheckFailed:
                y += 10f + UpdateUi.Height(UpdateUi.Text(parent, "Couldn't check for updates. Pocket Compendium tries again the next time the game starts.", x, y + 10f, width, 13f, Theme.Text));
                break;
            case UpdateStatus.InstallFailed:
                y += 10f;
                UpdateUi.Text(parent, $"Couldn't install Pocket Compendium {version}.", x, y + 4f, width - 130f, 13f, Theme.Text, wrap: false);
                _action = Button(parent, "Download", x + width - 110f, y);
                y += 28f;
                break;
        }

        y += 10f;
        var divider = HudFactory.Box("divider", parent, Theme.Line);
        HudFactory.TopLeft(divider, x, y, width, 1f);
        y += 14f;
        _answers = new AnswerRows(parent, x, y, width, _updates.Answer is { } answer ? (int)answer : -1);
        y += _answers.Height;
        return y - top;
    }

    public void HandleInput()
    {
        if (_answers == null) return;
        int clicked = _answers.Update();
        if (clicked >= 0) _updates.Choose((UpdateAnswer)clicked);

        if (_action == null || !_action.Update()) return;
        if (_updates.Status == UpdateStatus.Out) _updates.Install();
        else Application.OpenURL(ModLinks.Site + "/mods");
    }

    public void Clear()
    {
        _answers = null;
        _action = null;
    }

    private static ButtonView Button(RectTransform parent, string text, float x, float y)
    {
        var button = new ButtonView(parent, text, ButtonStyle.Primary, 110f, 28f);
        HudFactory.TopLeft(button.Rect, x, y, 110f, 28f);
        return button;
    }
}
