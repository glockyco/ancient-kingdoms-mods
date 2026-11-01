using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using UnityEngine;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// White icons, tinted by the image that shows them. Each is embedded as its 96x96 alpha
/// channel, gzipped. <c>website/scripts/generate-mod-icons.mjs</c> renders them from Lucide.
/// </summary>
public static class Icons
{
    private const string ResourcePrefix = "PocketCompendium.Assets.Icons.";
    private const int IconSize = 96;
    private static readonly Dictionary<string, Sprite> Sprites = new();
    private static readonly List<Texture2D> Textures = new();

    public static Sprite Arrow => Get("arrow");
    public static Sprite Bell => Get("bell");
    public static Sprite BookOpen => Get("book-open");
    public static Sprite ChevronsDownUp => Get("chevrons-down-up");
    public static Sprite ChevronsUpDown => Get("chevrons-up-down");
    public static Sprite Code => Get("code");
    public static Sprite Coffee => Get("coffee");
    public static Sprite Dices => Get("dices");
    public static Sprite Eye => Get("eye");
    public static Sprite EyeOff => Get("eye-off");
    public static Sprite ExternalLink => Get("external-link");
    public static Sprite Globe => Get("globe");
    public static Sprite Hourglass => Get("hourglass");
    public static Sprite Info => Get("info");
    public static Sprite LayoutGrid => Get("layout-grid");
    public static Sprite LayoutList => Get("layout-list");
    public static Sprite LocateFixed => Get("locate-fixed");
    public static Sprite Lock => Get("lucide-lock");
    public static Sprite LockOpen => Get("lucide-lock-open");
    public static Sprite MapPin => Get("map-pin");
    public static Sprite MessageCircle => Get("message-circle");
    public static Sprite Moon => Get("moon");
    public static Sprite Move => Get("move");
    public static Sprite Pin => Get("pin");
    public static Sprite Shield => Get("shield");
    public static Sprite Skull => Get("skull");
    public static Sprite Sliders => Get("sliders-horizontal");
    public static Sprite Sun => Get("sun");
    public static Sprite Swords => Get("swords");
    public static Sprite Timer => Get("timer");
    public static Sprite Users => Get("users");
    public static Sprite X => Get("x");

    private static Sprite Get(string name)
    {
        if (Sprites.TryGetValue(name, out var existing) && existing != null) return existing;

        var pixels = WhiteRgba(ReadAlpha(name));
        RawImageRows.FlipVerticalInPlace(pixels, IconSize, IconSize, 4);

        var texture = new Texture2D(IconSize, IconSize, TextureFormat.RGBA32, mipChain: false) { name = "PC_" + name };
        texture.LoadRawTextureData(pixels);
        texture.Apply(updateMipmaps: false, makeNoLongerReadable: true);
        texture.filterMode = FilterMode.Bilinear;
        texture.wrapMode = TextureWrapMode.Clamp;
        texture.hideFlags = HideFlags.HideAndDontSave;
        UnityEngine.Object.DontDestroyOnLoad(texture);
        Textures.Add(texture);

        var sprite = Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.5f), 100f);
        sprite.name = texture.name;
        sprite.hideFlags = HideFlags.HideAndDontSave;
        UnityEngine.Object.DontDestroyOnLoad(sprite);
        Sprites[name] = sprite;
        return sprite;
    }

    private static byte[] ReadAlpha(string name)
    {
        string resourceName = ResourcePrefix + name + ".alpha.gz";
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
        if (stream == null)
            throw new InvalidOperationException($"Pocket Compendium is missing the embedded icon '{resourceName}'.");

        using var gzip = new GZipStream(stream, CompressionMode.Decompress);
        using var buffer = new MemoryStream();
        gzip.CopyTo(buffer);
        var alpha = buffer.ToArray();
        if (alpha.Length != IconSize * IconSize)
            throw new InvalidDataException($"Pocket Compendium's icon '{resourceName}' holds {alpha.Length} bytes, expected {IconSize * IconSize}.");
        return alpha;
    }

    private static byte[] WhiteRgba(byte[] alpha)
    {
        var rgba = new byte[alpha.Length * 4];
        for (int index = 0; index < alpha.Length; index++)
        {
            rgba[index * 4] = 255;
            rgba[index * 4 + 1] = 255;
            rgba[index * 4 + 2] = 255;
            rgba[index * 4 + 3] = alpha[index];
        }
        return rgba;
    }

    public static void Dispose()
    {
        foreach (var sprite in Sprites.Values)
            if (sprite != null)
                UnityEngine.Object.Destroy(sprite);
        Sprites.Clear();

        foreach (var texture in Textures)
            if (texture != null)
                UnityEngine.Object.Destroy(texture);
        Textures.Clear();
    }
}
