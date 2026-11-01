using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.BossList.Ui;

/// <summary>The icon and colours a state shows with, so colour is never its only signal.</summary>
internal readonly struct StateLook
{
    private StateLook(Sprite icon, Color iconColor, Color textColor, bool bold)
    {
        Icon = icon;
        IconColor = iconColor;
        TextColor = textColor;
        Bold = bold;
    }

    public Sprite Icon { get; }
    public Color IconColor { get; }
    public Color TextColor { get; }
    public bool Bold { get; }

    /// <param name="altarItem">The item that starts the altar event, shown for altar spawns.</param>
    public static StateLook Of(in TrackedState state, bool nightWindow, Sprite altarItem) => state.State switch
    {
        SpawnState.Up => new StateLook(null, Theme.Ready, Theme.Ready, bold: true),
        SpawnState.InCombat => new StateLook(Icons.Swords, Theme.Ready, Theme.Ready, bold: true),
        SpawnState.Chance => new StateLook(Icons.Dices, Theme.Muted, Theme.Text, bold: false),
        SpawnState.Due => new StateLook(Icons.Hourglass, Theme.Due, Theme.Due, bold: false),
        SpawnState.Window => nightWindow
            ? new StateLook(Icons.Moon, Theme.Night, Theme.Night, bold: false)
            : new StateLook(Icons.Sun, Theme.Due, Theme.Due, bold: false),
        SpawnState.Guards => new StateLook(Icons.Shield, Theme.Muted, Theme.Text, bold: false),
        SpawnState.Altar => new StateLook(altarItem, Color.white, Theme.Dim, bold: false),
        SpawnState.Seen => new StateLook(Icons.Eye, Theme.Muted, Theme.Muted, bold: false),
        SpawnState.NotSeen => new StateLook(Icons.EyeOff, Theme.Dim, Theme.Dim, bold: false),
        _ => new StateLook(null, Theme.Text, Theme.Text, bold: false),
    };

    public static Color LevelColor(LevelBand band) => band switch
    {
        LevelBand.Gray => Theme.LevelGray,
        LevelBand.Green => Theme.LevelGreen,
        LevelBand.White => Theme.LevelWhite,
        LevelBand.Yellow => Theme.LevelYellow,
        _ => Theme.LevelRed,
    };
}
