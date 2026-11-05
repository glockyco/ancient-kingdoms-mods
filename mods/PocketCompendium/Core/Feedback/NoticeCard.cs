using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Feedback;

/// <summary>
/// Tells the player that a feature stopped after an error, until they close it: "World markers
/// stopped" over "An error turned it off.", with Report and Turn on again. It sits on the panel
/// layer and moves, locks and resets like a panel. The settings' example shows the same card with
/// example text, so a player can place it before anything stops. Several stops share the card's
/// place, newest first.
/// </summary>
internal sealed class NoticeCard
{
    private const float Width = 404f;
    private const float TextX = 66f;
    private const float CrossSpace = 42f;

    private static readonly Color Background = new(0.047f, 0.059f, 0.082f, 1f);
    private static readonly Color Outline = new(1f, 1f, 1f, 0.10f);
    private static readonly Color StopRing = new(1f, 0.416f, 0.302f, 0.16f);
    private static readonly Color ExampleRing = new(0.906f, 0.698f, 0.290f, 0.16f);

    private readonly PanelHost _host;
    private readonly List<Feature> _stops = new();
    private readonly List<RectTransform> _dragHandles = new();
    private bool _example;
    private string _shown;
    private RectTransform _body;
    private ButtonView _primary;
    private ButtonView _secondary;
    private RectTransform _close;

    /// <param name="page">The settings page that keeps the card's place, the one of the panels' Reset.</param>
    public NoticeCard(SettingsPage page)
    {
        // Bottom left above the chat, on the side of the start screen's update card. A panel's
        // place counts from the screen's centre to its top-left corner.
        _host = new PanelHost(page, "NoticeCard", PanelResize.Scale, new Vector2(-932f, -217f), Vector2.zero, Vector2.zero, Vector2.zero);
    }

    public void Add(Feature feature)
    {
        _stops.Remove(feature);
        _stops.Add(feature);
    }

    public void ShowExample() => _example = true;

    public void Update(bool inWorld)
    {
        // A feature turned on again from its settings row needs its card no more.
        _stops.RemoveAll(feature => !feature.Failed);
        var feature = _stops.Count > 0 ? _stops[_stops.Count - 1] : null;
        if (!inWorld || (!_example && feature == null))
        {
            _host.SetVisible(false);
            return;
        }

        _host.Create();
        _host.SetVisible(true);
        string shown = _example ? "\nexample" : feature.Title + "\n" + feature.CanTurnOnAgain;
        if (shown != _shown) Build(feature);

        _host.UpdateGrip();
        if (_primary.Update())
        {
            if (_example) _example = false;
            else ReportAction.Open();
        }
        else if (_secondary != null && _secondary.Update())
        {
            feature.TurnOnAgain();
            _stops.Remove(feature);
        }
        else if (Pointer.Clicked(_close))
        {
            if (_example) _example = false;
            else _stops.Remove(feature);
        }

        _host.Update(_dragHandles);
    }

    private void Build(Feature feature)
    {
        if (_body != null) Object.Destroy(_body.gameObject);
        _shown = _example ? "\nexample" : feature.Title + "\n" + feature.CanTurnOnAgain;

        string title = _example ? "Example: notices show here" : feature.Title + " stopped";
        string line = _example ? "Drag this card where you want it." : "An error turned it off.";
        string primary = _example ? "Done" : "Report";
        string secondary = !_example && feature.CanTurnOnAgain ? "Turn on again" : null;

        _body = HudFactory.Rect("card", _host.Rect).GetComponent<RectTransform>();
        float textWidth = Width - TextX - CrossSpace;
        var lineLabel = HudFactory.Label("line", _body, 13f, Theme.Muted, Align.Left);
        lineLabel.Text.enableWordWrapping = true;
        lineLabel.Value = line;
        float lineHeight = lineLabel.Text.GetPreferredValues(line, textWidth, 0f).y;
        float height = 18f + 22f + 4f + lineHeight + 14f + 30f + 18f;
        HudFactory.TopLeft(_body, 0f, 0f, Width, height);
        _host.SetContentWidth(Width);
        _host.SetHeight(height);

        var background = HudFactory.Sliced("background", _body, Shapes.Rounded, Background, cornerScale: 0.5f);
        HudFactory.Stretch(background, Vector2.zero, Vector2.zero);
        background.raycastTarget = true;
        var frame = HudFactory.Sliced("frame", _body, Shapes.RoundedOutline, Outline, cornerScale: 0.5f);
        HudFactory.Stretch(frame, Vector2.zero, Vector2.zero);
        var accent = HudFactory.Tinted("accent", _body, Shapes.Fade, _example ? Theme.Gold : Theme.Cast);
        accent.type = Image.Type.Simple;
        accent.preserveAspect = false;
        HudFactory.TopLeft(accent, 3f, 0f, Width - 6f, 2f);

        var disc = HudFactory.Tinted("disc", _body, Shapes.Disc, _example ? ExampleRing : StopRing);
        HudFactory.TopLeft(disc, 18f, 18f, 36f, 36f);
        var icon = HudFactory.Tinted("icon", disc.rectTransform, _example ? Icons.Info : Icons.CircleAlert, _example ? Theme.Ready : Theme.Cast);
        HudFactory.TopLeft(icon, 8f, 8f, 20f, 20f);

        var titleLabel = HudFactory.Label("title", _body, 15.5f, Theme.Text, Align.Left, bold: true);
        titleLabel.Value = title;
        HudFactory.TopLeft(titleLabel.Rect, TextX, 17f, textWidth, 24f);
        lineLabel.Rect.SetAsLastSibling();
        HudFactory.TopLeft(lineLabel.Rect, TextX, 18f + 22f + 4f, textWidth, lineHeight);

        float buttonsY = 18f + 22f + 4f + lineHeight + 14f;
        _primary = new ButtonView(_body, primary, ButtonStyle.Primary, 112f, 30f);
        HudFactory.TopLeft(_primary.Rect, TextX, buttonsY, 112f, 30f);
        _secondary = null;
        if (secondary != null)
        {
            _secondary = new ButtonView(_body, secondary, ButtonStyle.Secondary, 128f, 30f);
            HudFactory.TopLeft(_secondary.Rect, TextX + 124f, buttonsY, 128f, 30f);
        }

        var close = HudFactory.Tinted("close", _body, Icons.X, Theme.Control);
        close.raycastTarget = true;
        _close = HudFactory.TopLeft(close, Width - 32f, 18f, 14f, 14f);

        // The card drags by its body. Its buttons take their own presses first.
        _dragHandles.Clear();
        _dragHandles.Add(background.rectTransform);
    }
}
