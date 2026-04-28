using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

    public VisualAssetData ExportComposite(
        string domain,
        string entityId,
        string kind,
        string sourceField,
        IReadOnlyList<SpriteRenderer> renderers)
    {
        var sources = renderers?
            .Where(renderer => renderer != null && renderer.sprite != null)
            .ToList() ?? new List<SpriteRenderer>();

        if (sources.Count == 0)
            return null;

        const int compositeLayer = 31;
        const int pixelsPerUnit = 128;
        const int maxDimension = 512;

        GameObject root = null;
        GameObject cameraObject = null;
        Camera camera = null;
        RenderTexture renderTexture = null;
        RenderTexture previous = null;
        Texture2D readable = null;

        try
        {
            root = new GameObject($"VisualAssetComposite_{domain}_{entityId}_{kind}");
            root.hideFlags = HideFlags.HideAndDontSave;
            root.layer = compositeLayer;

            var cloneRenderers = new List<SpriteRenderer>();
            foreach (var source in sources)
            {
                var clone = new GameObject(source.name);
                clone.hideFlags = HideFlags.HideAndDontSave;
                clone.layer = compositeLayer;
                clone.transform.position = source.transform.position;
                clone.transform.rotation = source.transform.rotation;
                clone.transform.localScale = source.transform.lossyScale;
                clone.transform.SetParent(root.transform, true);

                var cloneRenderer = clone.AddComponent<SpriteRenderer>();
                cloneRenderer.sprite = source.sprite;
                cloneRenderer.color = source.color;
                cloneRenderer.flipX = source.flipX;
                cloneRenderer.flipY = source.flipY;
                cloneRenderer.sortingLayerID = source.sortingLayerID;
                cloneRenderer.sortingOrder = source.sortingOrder;

                cloneRenderers.Add(cloneRenderer);
            }

            if (cloneRenderers.Count == 0)
                return null;

            var bounds = cloneRenderers[0].bounds;
            foreach (var cloneRenderer in cloneRenderers.Skip(1))
            {
                bounds.Encapsulate(cloneRenderer.bounds);
            }
            bounds.Expand(0.05f);

            var rawWidth = Math.Max(1, Mathf.CeilToInt(bounds.size.x * pixelsPerUnit));
            var rawHeight = Math.Max(1, Mathf.CeilToInt(bounds.size.y * pixelsPerUnit));
            var scale = Math.Min(1f, (float)maxDimension / Math.Max(rawWidth, rawHeight));
            var width = Math.Max(1, Mathf.RoundToInt(rawWidth * scale));
            var height = Math.Max(1, Mathf.RoundToInt(rawHeight * scale));

            renderTexture = RenderTexture.GetTemporary(width, height, 24, RenderTextureFormat.ARGB32);
            previous = RenderTexture.active;

            cameraObject = new GameObject($"VisualAssetCompositeCamera_{domain}_{entityId}_{kind}");
            cameraObject.hideFlags = HideFlags.HideAndDontSave;
            cameraObject.layer = compositeLayer;
            camera = cameraObject.AddComponent<Camera>();
            camera.enabled = false;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0, 0, 0, 0);
            camera.orthographic = true;
            camera.orthographicSize = bounds.size.y / 2f;
            camera.aspect = (float)width / height;
            camera.nearClipPlane = 0.01f;
            camera.farClipPlane = 100f;
            camera.cullingMask = 1 << compositeLayer;
            camera.targetTexture = renderTexture;
            camera.transform.position = new Vector3(bounds.center.x, bounds.center.y, bounds.center.z - 10f);
            camera.transform.rotation = Quaternion.identity;

            RenderTexture.active = renderTexture;
            GL.Clear(true, true, new Color(0, 0, 0, 0));
            camera.Render();

            readable = new Texture2D(width, height, TextureFormat.RGBA32, false);
            readable.ReadPixels(new Rect(0, 0, width, height), 0, 0);
            readable.Apply();

            var encoded = ImageConversion.EncodeToPNG(readable);
            if (encoded == null || encoded.Length == 0)
                throw new InvalidOperationException($"Unity returned empty PNG data for composite visual asset {domain}/{entityId}/{kind}.");

            var fileName = $"{SafeSegment(sourceField)}_composite_{width}_{height}.png";
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
                source_type = "UnityEngine.SpriteRenderer[]",
                source_name = $"{sources.Count} renderers",
                sprite_name = null,
                texture_name = null,
                width = width,
                height = height
            };

            _assets.Add(asset);
            return asset;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to export composite visual asset {domain}/{entityId}/{kind} from {sourceField}: {ex.Message}", ex);
        }
        finally
        {
            if (readable != null)
                UnityEngine.Object.Destroy(readable);
            RenderTexture.active = previous;
            if (renderTexture != null)
                RenderTexture.ReleaseTemporary(renderTexture);
            if (cameraObject != null)
                UnityEngine.Object.Destroy(cameraObject);
            if (root != null)
                UnityEngine.Object.Destroy(root);
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
