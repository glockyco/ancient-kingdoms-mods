using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using DataExporter.Models;
using MelonLoader;
using Newtonsoft.Json;
using UnityEngine;

namespace DataExporter.Exporters;

public class VisualAssetRegistry
{
    private readonly MelonLogger.Instance _logger;
    private readonly string _exportPath;
    private readonly List<VisualAssetData> _assets = new();

    public VisualAssetRegistry(MelonLogger.Instance logger, string exportPath)
    {
        _logger = logger;
        _exportPath = ToPortablePath(exportPath).TrimEnd('/');
    }

    public VisualAssetData ExportRendererSprite(
        string domain,
        string entityId,
        string kind,
        string sourceField,
        SpriteRenderer renderer)
    {
        if (renderer == null || renderer.sprite == null)
            return null;

        return ExportSprite(
            domain,
            entityId,
            kind,
            sourceField,
            renderer.GetType().FullName,
            renderer.name,
            renderer.sprite);
    }

    public VisualAssetData ExportSprite(
        string domain,
        string entityId,
        string kind,
        string sourceField,
        string sourceType,
        string sourceName,
        Sprite sprite)
    {
        if (sprite == null)
            return null;

        if (sprite.texture == null)
            throw new InvalidOperationException($"Visual asset {domain}/{entityId}/{kind} has sprite '{sprite.name}' without a texture.");

        RenderTexture renderTexture = null;
        RenderTexture previous = null;
        Texture2D readable = null;

        try
        {
            var rect = sprite.textureRect;
            var rectX = Mathf.RoundToInt(rect.x);
            var rectY = Mathf.RoundToInt(rect.y);
            var width = Math.Max(1, Mathf.RoundToInt(rect.width));
            var height = Math.Max(1, Mathf.RoundToInt(rect.height));

            renderTexture = RenderTexture.GetTemporary(sprite.texture.width, sprite.texture.height, 0, RenderTextureFormat.ARGB32);
            previous = RenderTexture.active;
            Graphics.Blit(sprite.texture, renderTexture);
            RenderTexture.active = renderTexture;

            readable = new Texture2D(width, height, TextureFormat.RGBA32, false);
            readable.ReadPixels(new Rect(rectX, rectY, width, height), 0, 0);
            readable.Apply();

            var encoded = ImageConversion.EncodeToPNG(readable);
            if (encoded == null || encoded.Length == 0)
                throw new InvalidOperationException($"Unity returned empty PNG data for visual asset {domain}/{entityId}/{kind} from sprite '{sprite.name}'.");

            var fileName = $"{SafeSegment(sourceField)}_{SafeSegment(sprite.name)}_{rectX}_{rectY}_{width}_{height}.png";
            var exportPath = $"images/{SafeSegment(domain)}/{SafeSegment(entityId)}/{SafeSegment(kind)}/{fileName}";
            var imagePath = $"{_exportPath}/{exportPath}";
            var imageDirectory = $"{_exportPath}/images/{SafeSegment(domain)}/{SafeSegment(entityId)}/{SafeSegment(kind)}";

            Directory.CreateDirectory(ToWritablePath(imageDirectory));
            File.WriteAllBytes(ToWritablePath(imagePath), encoded);

            var asset = new VisualAssetData
            {
                domain = domain,
                entity_id = entityId,
                kind = kind,
                export_path = exportPath,
                source_field = sourceField,
                source_type = sourceType,
                source_name = sourceName,
                sprite_name = sprite.name,
                texture_name = sprite.texture.name,
                width = width,
                height = height
            };

            _assets.Add(asset);
            return asset;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to export visual asset {domain}/{entityId}/{kind} from {sourceField}: {ex.Message}", ex);
        }
        finally
        {
            if (readable != null)
                UnityEngine.Object.Destroy(readable);
            RenderTexture.active = previous;
            if (renderTexture != null)
                RenderTexture.ReleaseTemporary(renderTexture);
        }
    }

    public void WriteManifest()
    {
        var json = JsonConvert.SerializeObject(_assets, Formatting.Indented, new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            DefaultValueHandling = DefaultValueHandling.Include
        });

        Directory.CreateDirectory(ToWritablePath(_exportPath));
        File.WriteAllText(ToWritablePath($"{_exportPath}/visual_assets.json"), json);
        _logger.Msg($"✓ Exported visual_assets.json with {_assets.Count} visual assets");
    }

    private static string SafeSegment(string input)
    {
        if (string.IsNullOrEmpty(input))
            return "unknown";

        return Regex.Replace(input, @"[^A-Za-z0-9_\-.]+", "_");
    }

    private static string ToPortablePath(string path) => path.Replace("\\", "/");

    private static string ToWritablePath(string path)
    {
        var portable = ToPortablePath(path);
        return portable.StartsWith("/") ? "Z:" + portable : portable;
    }
}
