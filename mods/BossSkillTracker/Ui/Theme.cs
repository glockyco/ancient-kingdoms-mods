using UnityEngine;

namespace BossSkillTracker.Ui;

public static class Theme
{
    public static readonly Color Panel       = new(0.047f, 0.059f, 0.082f, 0.95f);
    public static readonly Color Header      = new(0.063f, 0.078f, 0.110f, 1f);
    public static readonly Color Line        = new(1f, 1f, 1f, 0.10f);
    public static readonly Color Track       = new(1f, 1f, 1f, 0.06f);
    public static readonly Color IconBg      = new(0.020f, 0.027f, 0.043f, 1f);
    public static readonly Color Steel       = new(0.435f, 0.514f, 0.596f, 1f);
    public static readonly Color Ready       = new(0.906f, 0.698f, 0.290f, 1f);
    public static readonly Color Cast        = new(1f, 0.416f, 0.302f, 1f);
    public static readonly Color CastBg      = new(0.353f, 0.122f, 0.094f, 1f);
    public static readonly Color Text        = new(0.940f, 0.958f, 0.980f, 1f);
    public static readonly Color Muted       = new(0.640f, 0.690f, 0.750f, 1f);
    public static readonly Color Dim         = new(0.300f, 0.350f, 0.410f, 1f);
    public static readonly Color WindowZone  = new(1f, 0.416f, 0.302f, 0.26f);
    public static readonly Color Marker      = Color.white;
    public static readonly Color Transparent = new(0f, 0f, 0f, 0f);

    private static Sprite _white;

    public static Sprite White
    {
        get
        {
            if (_white != null) return _white;

            var texture = new Texture2D(1, 1) { name = "BST_White" };
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

    public static void Dispose()
    {
        if (_white == null) return;

        var texture = _white.texture;
        UnityEngine.Object.Destroy(_white);
        if (texture != null) UnityEngine.Object.Destroy(texture);
        _white = null;
    }
}
