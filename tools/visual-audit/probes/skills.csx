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

static Dictionary<string, object?> SpriteRef(string entityId, string entityName, string visualKind, string sourceField, Sprite sprite)
{
    return new Dictionary<string, object?>
    {
        ["domain"] = "skill",
        ["entity_id"] = entityId,
        ["entity_name"] = entityName,
        ["visual_kind"] = visualKind,
        ["source_field"] = sourceField,
        ["unity_object_type"] = sprite.GetType().FullName,
        ["unity_object_name"] = sprite.name,
        ["sprite_name"] = sprite.name,
        ["texture_name"] = sprite.texture != null ? sprite.texture.name : null,
        ["runtime_image_path"] = WriteSpriteImage(sprite, "skill", entityId, visualKind, sourceField),
        ["instance_id"] = sprite.GetInstanceID(),
        ["confidence"] = "authoritative",
        ["notes"] = Array.Empty<string>(),
    };
}

static void AddObjectRef(List<Dictionary<string, object?>> rows, string entityId, string entityName, string visualKind, string sourceField, UnityEngine.Object obj)
{
    if (obj == null) return;
    rows.Add(new Dictionary<string, object?>
    {
        ["domain"] = "skill",
        ["entity_id"] = entityId,
        ["entity_name"] = entityName,
        ["visual_kind"] = visualKind,
        ["source_field"] = sourceField,
        ["unity_object_type"] = obj.GetType().FullName,
        ["unity_object_name"] = obj.name,
        ["instance_id"] = obj.GetInstanceID(),
        ["confidence"] = "authoritative",
        ["notes"] = Array.Empty<string>(),
    });
}

var rows = new List<Dictionary<string, object?>>();
var skillType = Il2CppType.Of<Il2Cpp.ScriptableSkill>();
foreach (var obj in Resources.FindObjectsOfTypeAll(skillType))
{
    var skill = obj.TryCast<Il2Cpp.ScriptableSkill>();
    if (skill == null) continue;

    var entityName = skill.name;
    var entityId = SanitizeId(entityName);

    if (skill.image != null)
    {
        rows.Add(SpriteRef(entityId, entityName, "icon", "ScriptableSkill.image", skill.image));
    }

    AddObjectRef(rows, entityId, entityName, "cast_effect", "ScriptableSkill.castEffect", skill.castEffect);
    AddObjectRef(rows, entityId, entityName, "cast_effect", "ScriptableSkill.castEffect2", skill.castEffect2);

    var areaDamage = skill.TryCast<Il2Cpp.AreaDamageSkill>();
    if (areaDamage != null)
    {
        AddObjectRef(rows, entityId, entityName, "projectile_effect", "AreaDamageSkill.projectile", areaDamage.projectile);
        AddObjectRef(rows, entityId, entityName, "target_effect", "AreaDamageSkill.targetEffect", areaDamage.targetEffect);
    }

    var targetProjectile = skill.TryCast<Il2Cpp.TargetProjectileSkill>();
    if (targetProjectile != null)
    {
        AddObjectRef(rows, entityId, entityName, "projectile_effect", "TargetProjectileSkill.projectile", targetProjectile.projectile);
    }

    var targetDamage = skill.TryCast<Il2Cpp.TargetDamageSkill>();
    if (targetDamage != null)
    {
        AddObjectRef(rows, entityId, entityName, "target_effect", "TargetDamageSkill.targetEffect", targetDamage.targetEffect);
    }

    var areaObjectSpawn = skill.TryCast<Il2Cpp.AreaObjectSpawnSkill>();
    if (areaObjectSpawn != null)
    {
        AddObjectRef(rows, entityId, entityName, "projectile_prefab", "AreaObjectSpawnSkill.objectProjectileEffectPrefab", areaObjectSpawn.objectProjectileEffectPrefab);
        AddObjectRef(rows, entityId, entityName, "skill_effect_prefab", "AreaObjectSpawnSkill.objectSkillEffectPrefab", areaObjectSpawn.objectSkillEffectPrefab);
    }
}

var json = JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
var outputDirectory = System.IO.Path.GetDirectoryName(OutputPath);
if (!string.IsNullOrEmpty(outputDirectory)) System.IO.Directory.CreateDirectory(outputDirectory);
System.IO.File.WriteAllText(OutputPath, json);
return JsonSerializer.Serialize(new Dictionary<string, object?> { ["output_path"] = OutputPath, ["row_count"] = rows.Count });
