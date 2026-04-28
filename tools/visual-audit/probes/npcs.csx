using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using Il2CppInterop.Runtime;
using UnityEngine;

const string OutputPath = "__VISUAL_AUDIT_OUTPUT_PATH__";

static string SanitizeId(string input)
{
    if (string.IsNullOrEmpty(input)) return input;
    return Regex.Replace(input.ToLowerInvariant().Replace(" ", "_"), @"[^a-z0-9_\-]", "");
}

static string SafeSegment(string input)
{
    if (string.IsNullOrEmpty(input)) return "unknown";
    return Regex.Replace(input, @"[^A-Za-z0-9_\-.]+", "_");
}

static string ToPortablePath(string path) => path.Replace("\\", "/");
static string ToWritablePath(string path)
{
    var portable = ToPortablePath(path);
    return portable.StartsWith("/") ? "Z:" + portable : portable;
}

static string? WriteSpriteImage(Sprite sprite, string domain, string entityId, string visualKind, string sourceField)
{
    if (sprite == null || sprite.texture == null) return null;

    RenderTexture? renderTexture = null;
    RenderTexture? previous = null;
    Texture2D? readable = null;
    try
    {
        var rect = sprite.textureRect;
        var width = Math.Max(1, Mathf.RoundToInt(rect.width));
        var height = Math.Max(1, Mathf.RoundToInt(rect.height));
        renderTexture = RenderTexture.GetTemporary(sprite.texture.width, sprite.texture.height, 0, RenderTextureFormat.ARGB32);
        previous = RenderTexture.active;
        Graphics.Blit(sprite.texture, renderTexture);
        RenderTexture.active = renderTexture;

        readable = new Texture2D(width, height, TextureFormat.RGBA32, false);
        readable.ReadPixels(new Rect(rect.x, rect.y, width, height), 0, 0);
        readable.Apply();

        var outputDirectory = ToPortablePath(System.IO.Path.GetDirectoryName(OutputPath) ?? ".");
        var imageDirectory = $"{outputDirectory}/images/{domain}/{SafeSegment(entityId)}/{SafeSegment(visualKind)}";
        System.IO.Directory.CreateDirectory(ToWritablePath(imageDirectory));
        var fileName = $"{SafeSegment(sourceField)}_{sprite.GetInstanceID()}_{SafeSegment(sprite.name)}.png";
        var imagePath = $"{imageDirectory}/{fileName}";
        System.IO.File.WriteAllBytes(ToWritablePath(imagePath), ImageConversion.EncodeToPNG(readable));
        return ToPortablePath(imagePath);
    }
    catch
    {
        return null;
    }
    finally
    {
        if (readable != null) UnityEngine.Object.Destroy(readable);
        RenderTexture.active = previous;
        if (renderTexture != null) RenderTexture.ReleaseTemporary(renderTexture);
    }
}

static Dictionary<string, object?> SpriteRendererRef(string entityId, string entityName, string visualKind, string sourceField, SpriteRenderer renderer)
{
    var sprite = renderer.sprite;
    return new Dictionary<string, object?>
    {
        ["domain"] = "npc",
        ["entity_id"] = entityId,
        ["entity_name"] = entityName,
        ["visual_kind"] = visualKind,
        ["source_field"] = sourceField,
        ["unity_object_type"] = renderer.GetType().FullName,
        ["unity_object_name"] = renderer.name,
        ["game_object_name"] = renderer.gameObject != null ? renderer.gameObject.name : null,
        ["sprite_name"] = sprite != null ? sprite.name : null,
        ["texture_name"] = sprite != null && sprite.texture != null ? sprite.texture.name : null,
        ["runtime_image_path"] = sprite != null ? WriteSpriteImage(sprite, "npc", entityId, visualKind, sourceField + "." + renderer.name) : null,
        ["instance_id"] = renderer.GetInstanceID(),
        ["confidence"] = "authoritative",
        ["notes"] = Array.Empty<string>(),
    };
}

static Dictionary<string, object?> ComponentRef(string entityId, string entityName, string visualKind, string sourceField, Component component)
{
    return new Dictionary<string, object?>
    {
        ["domain"] = "npc",
        ["entity_id"] = entityId,
        ["entity_name"] = entityName,
        ["visual_kind"] = visualKind,
        ["source_field"] = sourceField,
        ["unity_object_type"] = component.GetType().FullName,
        ["unity_object_name"] = component.name,
        ["game_object_name"] = component.gameObject != null ? component.gameObject.name : null,
        ["instance_id"] = component.GetInstanceID(),
        ["confidence"] = "authoritative",
        ["notes"] = Array.Empty<string>(),
    };
}

var rows = new List<Dictionary<string, object?>>();
var npcType = Il2CppType.Of<Il2Cpp.Npc>();
foreach (var obj in Resources.FindObjectsOfTypeAll(npcType))
{
    var npc = obj.TryCast<Il2Cpp.Npc>();
    if (npc == null) continue;

    var entityName = npc.name;
    var entityId = SanitizeId(entityName);

    if (npc.gameObject == null) continue;

    foreach (var renderer in npc.gameObject.GetComponentsInChildren<SpriteRenderer>(true))
    {
        rows.Add(SpriteRendererRef(entityId, entityName, "renderer", "Npc.gameObject.SpriteRenderer", renderer));
    }

    foreach (var animator in npc.gameObject.GetComponentsInChildren<Animator>(true))
    {
        rows.Add(ComponentRef(entityId, entityName, "animator", "Npc.gameObject.Animator", animator));
    }
}

var json = JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
var outputDirectory = System.IO.Path.GetDirectoryName(OutputPath);
if (!string.IsNullOrEmpty(outputDirectory)) System.IO.Directory.CreateDirectory(outputDirectory);
System.IO.File.WriteAllText(OutputPath, json);
return JsonSerializer.Serialize(new Dictionary<string, object?> { ["output_path"] = OutputPath, ["row_count"] = rows.Count });
