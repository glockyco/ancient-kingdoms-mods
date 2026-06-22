using BossSkillTracker.Model;
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEngine;

namespace BossSkillTracker.Ui;

public static class ControlSprites
{
    private const string ResourcePrefix = "BossSkillTracker.Assets.Controls.";
    private const int IconSize = 96;
    private const int BytesPerPixel = 4;
    private static readonly Dictionary<string, Sprite> Sprites = new();
    private static readonly List<Texture2D> Textures = new();

    public static Sprite Collapse => Load("collapse.rgba");
    public static Sprite Expand => Load("expand.rgba");
    public static Sprite LockOpen => Load("lock-open.rgba");
    public static Sprite LockClosed => Load("lock-closed.rgba");

    private static Sprite Load(string fileName)
    {
        if (Sprites.TryGetValue(fileName, out var existing)) return existing;

        var assembly = Assembly.GetExecutingAssembly();
        string resourceName = ResourcePrefix + fileName;
        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
            throw new InvalidOperationException($"BossSkillTracker missing embedded icon resource '{resourceName}'.");

        byte[] bytes = new byte[stream.Length];
        int read = stream.Read(bytes, 0, bytes.Length);
        if (read != bytes.Length)
            throw new EndOfStreamException($"BossSkillTracker could not read embedded icon resource '{resourceName}'.");

        int expectedLength = IconSize * IconSize * BytesPerPixel;
        if (bytes.Length != expectedLength)
            throw new InvalidOperationException($"BossSkillTracker embedded icon '{resourceName}' has {bytes.Length} bytes; expected {expectedLength}.");

        var texture = new Texture2D(IconSize, IconSize, TextureFormat.RGBA32, mipChain: false) { name = "BST_" + Path.GetFileNameWithoutExtension(fileName) };
        RawImageRows.FlipVerticalInPlace(bytes, IconSize, IconSize, BytesPerPixel);
        texture.LoadRawTextureData(bytes);
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
        Sprites[fileName] = sprite;
        return sprite;
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
