using System;
using System.Collections.Generic;
using System.Diagnostics;
using MelonLoader.Utils;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Feedback;

/// <summary>
/// The settings window's last page: which Pocket Compendium runs, where the project lives, and the
/// report and idea actions.
/// </summary>
public sealed class AboutPage : ISettingsContent
{
    private const float RowHeight = 30f;
    private const float AddressX = 150f;

    private static readonly Color RowHover = new(1f, 1f, 1f, 0.04f);

    private readonly string _version;
    private readonly string _build;
    private readonly IReadOnlyList<Feature> _features;
    private readonly List<LinkRow> _links = new();

    private ButtonView _report;
    private ButtonView _idea;
    private ButtonView _logFolder;
    private Label _help;
    private Label _reported;

    /// <param name="build">The commit the mod was built from. The page and reports show its first
    /// seven characters, which GitHub also links to the commit.</param>
    public AboutPage(string version, string build, IReadOnlyList<Feature> features)
    {
        _version = version;
        _build = build.Length > 7 ? build.Substring(0, 7) : build;
        _features = features;
    }

    public string Title => "About";

    public Sprite Icon => Icons.Info;

    public float Build(RectTransform parent, float x, float y, float width)
    {
        float top = y;
        var version = HudFactory.Label("version", parent, 12.5f, Theme.Muted, Align.Left);
        HudFactory.TopLeft(version.Rect, x, y, width, 18f);
        version.Value = $"Version {_version}, build {_build}, by WoW_Much";
        y += 20f;
        y += Wrapped("fanMade", parent, "A fan-made mod. Please report its problems here, not to the game's developers.", x, y, width, 12.5f, Theme.Muted).Rect.sizeDelta.y + 12f;

        var divider = HudFactory.Box("divider", parent, Theme.Line);
        HudFactory.TopLeft(divider, x, y, width, 1f);
        y += 16f;

        y = Section(parent, "Links", x, y, width);
        _links.Add(new LinkRow(parent, Icons.Globe, "Website", "ancient-kingdoms.compendiums.org", ModLinks.Site, x, y, width));
        y += RowHeight + 2f;
        _links.Add(new LinkRow(parent, Icons.Code, "Source", "github.com/glockyco/ancient-kingdoms-mods", ModLinks.Source, x, y, width));
        y += RowHeight + 2f;
        _links.Add(new LinkRow(parent, Icons.MessageCircle, "Community", "Ancient Kingdoms Discord", ModLinks.Discord, x, y, width));
        y += RowHeight + 2f;
        _links.Add(new LinkRow(parent, Icons.Coffee, "Support", "ko-fi.com/wowmuch", ModLinks.KoFi, x, y, width));
        y += RowHeight + 14f;

        y = Section(parent, "Feedback", x, y, width);
        _report = new ButtonView(parent, "Report a problem", ButtonStyle.Primary, 170f, 32f);
        HudFactory.TopLeft(_report.Rect, x, y, 170f, 32f);
        _idea = new ButtonView(parent, "Suggest an idea", ButtonStyle.Secondary, 160f, 32f);
        HudFactory.TopLeft(_idea.Rect, x + 182f, y, 160f, 32f);
        y += 42f;

        _help = Wrapped("help", parent, "Both open a form on GitHub. A problem report also copies details about your setup.", x, y, width, 12f, Theme.Dim);
        _reported = Wrapped("reported", parent, "Your browser shows the problem form with the details filled in, and your clipboard holds them too. Please attach MelonLoader/Latest.log from the game's folder.", x, y, width, 12f, Theme.Muted);
        float reportedHeight = _reported.Rect.sizeDelta.y + 8f;
        _logFolder = new ButtonView(parent, "Open the log folder", ButtonStyle.Secondary, 160f, 28f);
        HudFactory.TopLeft(_logFolder.Rect, x, y + reportedHeight, 160f, 28f);
        ShowReported(false);
        y += reportedHeight + 28f;

        return y - top;
    }

    public void HandleInput()
    {
        foreach (var link in _links)
            if (link.Update())
                Application.OpenURL(link.Url);

        if (_report.Update()) Report();
        if (_idea.Update()) Application.OpenURL(ModLinks.IdeasForm);
        if (_logFolder.Rect.gameObject.activeSelf && _logFolder.Update()) OpenLogFolder();
    }

    public void Clear()
    {
        _links.Clear();
        _report = null;
        _idea = null;
        _logFolder = null;
        _help = null;
        _reported = null;
    }

    private void Report()
    {
        var facts = SetupReader.Read(_version, _build, _features);
        GUIUtility.systemCopyBuffer = ProblemReport.Details(facts);
        Application.OpenURL(ProblemReport.Link(facts));
        ShowReported(true);
    }

    private void ShowReported(bool reported)
    {
        _help.SetActive(!reported);
        _reported.SetActive(reported);
        _logFolder.Rect.gameObject.SetActive(reported);
    }

    // Under Wine, a shell-opened folder appears in Wine's own file manager, which can't hand the
    // log to the player's browser. winebrowser passes the URL to the host system instead, which
    // opens Finder on macOS.
    private static void OpenLogFolder()
    {
        string url = new Uri(MelonEnvironment.MelonLoaderDirectory).AbsoluteUri;
        if (SetupReader.UnderWine)
        {
            try
            {
                Process.Start(new ProcessStartInfo("winebrowser.exe", url) { UseShellExecute = false });
                return;
            }
            catch (Exception exception)
            {
                Log.Warning($"Could not open the log folder through winebrowser: {exception.Message}");
            }
        }

        Application.OpenURL(url);
    }

    private static float Section(RectTransform parent, string title, float x, float y, float width)
    {
        var label = HudFactory.Label("section", parent, 10.5f, Theme.GroupTitle, Align.Left);
        label.Text.characterSpacing = 14f;
        HudFactory.TopLeft(label.Rect, x, y, width, 16f);
        label.Value = title.ToUpperInvariant();
        return y + 22f;
    }

    private static Label Wrapped(string name, RectTransform parent, string text, float x, float y, float width, float size, Color color)
    {
        var label = HudFactory.Label(name, parent, size, color, Align.Left);
        label.Text.enableWordWrapping = true;
        label.Text.overflowMode = Il2CppTMPro.TextOverflowModes.Overflow;
        label.Text.alignment = Il2CppTMPro.TextAlignmentOptions.TopLeft;
        label.Value = text;
        HudFactory.TopLeft(label.Rect, x, y, width, label.Text.GetPreferredValues(text, width, 0f).y);
        return label;
    }

    private sealed class LinkRow
    {
        private readonly Image _background;
        private readonly Image _external;
        private readonly Label _address;

        public LinkRow(RectTransform parent, Sprite icon, string label, string address, string url, float x, float y, float width)
        {
            Url = url;
            _background = HudFactory.Sliced("link", parent, Shapes.Rounded, Color.clear, cornerScale: 0.45f);
            _background.raycastTarget = true;
            Rect = HudFactory.TopLeft(_background, x - 8f, y, width + 16f, RowHeight);

            var image = HudFactory.Tinted("icon", Rect, icon, Theme.Control);
            HudFactory.TopLeft(image, 8f, (RowHeight - 16f) / 2f, 16f, 16f);
            var name = HudFactory.Label("label", Rect, 13.5f, Theme.Text, Align.Left);
            HudFactory.TopLeft(name.Rect, 32f, 0f, AddressX - 32f, RowHeight);
            name.Value = label;
            _address = HudFactory.Label("address", Rect, 13f, Theme.Ready, Align.Left);
            HudFactory.TopLeft(_address.Rect, AddressX + 8f, 0f, width - AddressX - 30f, RowHeight);
            _address.Value = address;
            _external = HudFactory.Tinted("external", Rect, Icons.ExternalLink, Theme.Dim);
            HudFactory.TopLeft(_external, width - 6f, (RowHeight - 14f) / 2f, 14f, 14f);
        }

        public RectTransform Rect { get; }

        public string Url { get; }

        public bool Update()
        {
            bool hovered = Pointer.Over(Rect);
            _background.color = hovered ? RowHover : Color.clear;
            _external.color = hovered ? Theme.Ready : Theme.Dim;
            return Pointer.Clicked(Rect);
        }
    }
}
