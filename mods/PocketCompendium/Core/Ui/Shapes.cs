using System;
using System.Collections.Generic;
using UnityEngine;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// White shapes drawn once in code and tinted by the image that shows them: rounded rectangles
/// for nine-slicing, filled and outlined, a disc and a ring for round badges and radial fills, a
/// fade for accent lines, and a triangle for arrows.
/// </summary>
public static class Shapes
{
    private const int RoundedSize = 32;
    private const float RoundedRadius = 7f;
    private const int RoundSize = 128;

    private static readonly List<UnityEngine.Object> Created = new();
    private static readonly Dictionary<string, Sprite> Sprites = new();

    /// <summary>A filled rectangle with 7 px corners, for <c>Image.Type.Sliced</c>.</summary>
    public static Sprite Rounded => Get("PC_Rounded", () => Make("PC_Rounded", RoundedSize, RoundedSize, (x, y) => Fill(RoundedDistance(x, y)), RoundedBorder));

    /// <summary>The 1.25 px outline of <see cref="Rounded"/>, for <c>Image.Type.Sliced</c>.</summary>
    public static Sprite RoundedOutline => Get("PC_RoundedOutline", () => Make("PC_RoundedOutline", RoundedSize, RoundedSize, (x, y) => Outline(RoundedDistance(x, y), 1.25f), RoundedBorder));

    /// <summary>A disc, for round badges, pins and radial fills.</summary>
    public static Sprite Disc => Get("PC_Disc", () => Make("PC_Disc", RoundSize, RoundSize, (x, y) => Fill(DiscDistance(x, y)), Vector4.zero));

    /// <summary>A ring 6% of the diameter wide, for frames around round portraits.</summary>
    public static Sprite Ring => Get("PC_Ring", () => Make("PC_Ring", RoundSize, RoundSize, (x, y) => Outline(DiscDistance(x, y), RoundSize * 0.06f), Vector4.zero));

    /// <summary>Full opacity on the left, fading to 12% on the right, like the panels' gold accent line.</summary>
    public static Sprite Fade => Get("PC_Fade", () => Make("PC_Fade", 256, 1, (x, _) => Mathf.Lerp(1f, 0.12f, x / 255f), Vector4.zero));

    /// <summary>A triangle pointing up, for edge arrows and the resize grip.</summary>
    public static Sprite Triangle => Get("PC_Triangle", () => Make("PC_Triangle", 64, 64, TriangleCoverage, Vector4.zero));

    /// <summary>A soft round glow, full in the middle third and fading to nothing at the edge, for pins that are up.</summary>
    public static Sprite Glow => Get("PC_Glow", () => Make("PC_Glow", RoundSize, RoundSize, GlowCoverage, Vector4.zero));

    /// <summary>
    /// Opaque over its bottom 45%, then fading to nothing at the top, to keep text readable over a
    /// portrait. The text sits on the opaque band.
    /// </summary>
    public static Sprite Shade => Get("PC_Shade", () => Make("PC_Shade", 1, 64, (_, y) => y < 29 ? 1f : Mathf.SmoothStep(1f, 0f, (y - 29) / 34f), Vector4.zero));

    private static Vector4 RoundedBorder => new(RoundedRadius + 1f, RoundedRadius + 1f, RoundedRadius + 1f, RoundedRadius + 1f);

    // Signed distance to the rounded box: negative inside, zero on the edge.
    private static float RoundedDistance(int x, int y)
    {
        float half = RoundedSize / 2f;
        float qx = Math.Abs(x + 0.5f - half) - half + RoundedRadius;
        float qy = Math.Abs(y + 0.5f - half) - half + RoundedRadius;
        float outside = Mathf.Sqrt(Mathf.Max(qx, 0f) * Mathf.Max(qx, 0f) + Mathf.Max(qy, 0f) * Mathf.Max(qy, 0f));
        return outside + Mathf.Min(Mathf.Max(qx, qy), 0f) - RoundedRadius;
    }

    private static float DiscDistance(int x, int y)
    {
        float centre = RoundSize / 2f;
        float dx = x + 0.5f - centre;
        float dy = y + 0.5f - centre;
        return Mathf.Sqrt(dx * dx + dy * dy) - centre;
    }

    private static float Fill(float distance) => Mathf.Clamp01(0.5f - distance);

    private static float Outline(float distance, float width) =>
        Mathf.Clamp01(0.5f - distance) * Mathf.Clamp01(distance + width + 0.5f);

    private static float GlowCoverage(int x, int y)
    {
        float fromCentre = (DiscDistance(x, y) + RoundSize / 2f) / (RoundSize / 2f);
        float fade = Mathf.Clamp01((1f - fromCentre) / (2f / 3f));
        return fade * fade;
    }

    private static float TriangleCoverage(int x, int y)
    {
        // Apex at the top centre, base along the bottom, sampled four times per pixel.
        int inside = 0;
        for (int sy = 0; sy < 2; sy++)
        for (int sx = 0; sx < 2; sx++)
        {
            float px = x + 0.25f + sx * 0.5f;
            float py = y + 0.25f + sy * 0.5f;
            float halfWidth = 32f * (1f - py / 64f);
            if (Math.Abs(px - 32f) <= halfWidth) inside++;
        }
        return inside / 4f;
    }

    private static Sprite Get(string name, Func<Sprite> make)
    {
        if (Sprites.TryGetValue(name, out var sprite) && sprite != null) return sprite;
        sprite = make();
        Sprites[name] = sprite;
        return sprite;
    }

    private static Sprite Make(string name, int width, int height, Func<int, int, float> coverage, Vector4 border)
    {
        var texture = new Texture2D(width, height, TextureFormat.RGBA32, mipChain: false) { name = name };
        var pixels = new Color32[width * height];
        for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++)
            pixels[y * width + x] = new Color32(255, 255, 255, (byte)Mathf.RoundToInt(coverage(x, y) * 255f));
        texture.SetPixels32(pixels);
        texture.Apply(updateMipmaps: false, makeNoLongerReadable: true);
        texture.filterMode = FilterMode.Bilinear;
        texture.wrapMode = TextureWrapMode.Clamp;
        texture.hideFlags = HideFlags.HideAndDontSave;
        UnityEngine.Object.DontDestroyOnLoad(texture);

        var sprite = Sprite.Create(texture, new Rect(0, 0, width, height), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, border);
        sprite.name = name;
        sprite.hideFlags = HideFlags.HideAndDontSave;
        UnityEngine.Object.DontDestroyOnLoad(sprite);
        Created.Add(sprite);
        Created.Add(texture);
        return sprite;
    }

    public static void Dispose()
    {
        foreach (var created in Created)
            if (created != null)
                UnityEngine.Object.Destroy(created);
        Created.Clear();
        Sprites.Clear();
    }
}
