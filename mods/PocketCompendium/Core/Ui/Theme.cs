using UnityEngine;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// The colours every Pocket Compendium panel uses: the skill tracker's dark panel palette, the
/// game's gold and important golden, and the game's level colours. Tier colours come from the
/// game at run time through <see cref="Game.GameAccess.TierColor"/>.
/// </summary>
public static class Theme
{
    public static readonly Color Panel       = new(0.047f, 0.059f, 0.082f, 0.95f);
    public static readonly Color Header      = new(0.063f, 0.078f, 0.110f, 1f);
    public static readonly Color Line        = new(1f, 1f, 1f, 0.10f);
    public static readonly Color RowLine     = new(1f, 1f, 1f, 0.045f);
    public static readonly Color GroupBg     = new(1f, 1f, 1f, 0.025f);
    public static readonly Color Hover       = new(1f, 1f, 1f, 0.055f);
    public static readonly Color Track       = new(1f, 1f, 1f, 0.06f);
    public static readonly Color IconBg      = new(0.020f, 0.027f, 0.043f, 1f);
    public static readonly Color Steel       = new(0.435f, 0.514f, 0.596f, 1f);
    public static readonly Color Ready       = new(0.906f, 0.698f, 0.290f, 1f);
    public static readonly Color ReadyBg     = new(0.906f, 0.698f, 0.290f, 0.14f);
    public static readonly Color Cast        = new(1f, 0.416f, 0.302f, 1f);
    public static readonly Color CastBg      = new(0.353f, 0.122f, 0.094f, 1f);
    public static readonly Color Text        = new(0.940f, 0.958f, 0.980f, 1f);
    public static readonly Color Muted       = new(0.640f, 0.690f, 0.750f, 1f);
    public static readonly Color Dim         = new(0.420f, 0.463f, 0.518f, 1f);
    public static readonly Color Control     = new(0.498f, 0.545f, 0.600f, 1f);
    public static readonly Color WindowZone  = new(1f, 0.416f, 0.302f, 0.26f);
    public static readonly Color Marker      = Color.white;
    public static readonly Color Transparent = new(0f, 0f, 0f, 0f);

    // The game's window title gold and its "important" golden (Utils.colorImportantGolden).
    public static readonly Color Gold        = new(0.784f, 0.675f, 0.314f, 1f);
    public static readonly Color Golden      = new(1f, 0.843f, 0f, 1f);
    public static readonly Color GroupTitle  = new(0.839f, 0.761f, 0.498f, 1f);

    // State accents: time-of-day windows and spawns that are due.
    public static readonly Color Night       = new(0.663f, 0.757f, 0.941f, 1f);
    public static readonly Color Due         = new(0.914f, 0.812f, 0.561f, 1f);

    // The game's level colours (UITarget, Monster.LateUpdate): gray, Utils.lowLevelColor, white,
    // yellow and Utils.highLevelColor.
    public static readonly Color LevelGray   = new(0.561f, 0.561f, 0.561f, 1f);
    public static readonly Color LevelGreen  = new(0.565f, 0.784f, 0.549f, 1f);
    public static readonly Color LevelWhite  = new(0.957f, 0.957f, 0.957f, 1f);
    public static readonly Color LevelYellow = new(1f, 0.922f, 0.016f, 1f);
    public static readonly Color LevelRed    = new(1f, 0.392f, 0.392f, 1f);

    private static Sprite _white;

    public static Sprite White
    {
        get
        {
            if (_white != null) return _white;

            var texture = new Texture2D(1, 1) { name = "PC_White" };
            texture.SetPixel(0, 0, Color.white);
            texture.Apply();
            texture.hideFlags = HideFlags.HideAndDontSave;
            UnityEngine.Object.DontDestroyOnLoad(texture);

            _white = Sprite.Create(texture, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 100f);
            _white.hideFlags = HideFlags.HideAndDontSave;
            UnityEngine.Object.DontDestroyOnLoad(_white);
            return _white;
        }
    }

    /// <summary>A name colour lightened towards white so it stays readable on the dark panel.</summary>
    public static Color Readable(Color tier) => Color.Lerp(tier, Color.white, 0.22f);

    public static void Dispose()
    {
        if (_white == null) return;

        var texture = _white.texture;
        UnityEngine.Object.Destroy(_white);
        if (texture != null) UnityEngine.Object.Destroy(texture);
        _white = null;
    }
}
