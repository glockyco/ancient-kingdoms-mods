using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using Il2CppInterop.Runtime;
using UnityEngine;

static string SanitizeId(string input)
{
    if (string.IsNullOrEmpty(input)) return input;
    return Regex.Replace(input.ToLowerInvariant().Replace(" ", "_"), @"[^a-z0-9_\-]", "");
}

static Dictionary<string, object?> SpriteRef(string entityId, string entityName, string visualKind, string sourceField, Sprite sprite)
{
    return new Dictionary<string, object?>
    {
        ["domain"] = "monster",
        ["entity_id"] = entityId,
        ["entity_name"] = entityName,
        ["visual_kind"] = visualKind,
        ["source_field"] = sourceField,
        ["unity_object_type"] = sprite.GetType().FullName,
        ["unity_object_name"] = sprite.name,
        ["sprite_name"] = sprite.name,
        ["texture_name"] = sprite.texture != null ? sprite.texture.name : null,
        ["instance_id"] = sprite.GetInstanceID(),
        ["confidence"] = "authoritative",
        ["notes"] = Array.Empty<string>(),
    };
}

static Dictionary<string, object?> ComponentRef(string entityId, string entityName, string visualKind, string sourceField, Component component)
{
    return new Dictionary<string, object?>
    {
        ["domain"] = "monster",
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
var monsterType = Il2CppType.Of<Il2Cpp.Monster>();
foreach (var obj in Resources.FindObjectsOfTypeAll(monsterType))
{
    var monster = obj.TryCast<Il2Cpp.Monster>();
    if (monster == null) continue;

    var entityName = monster.name;
    var entityId = SanitizeId(entityName);

    if (monster.imageBossBestiary != null)
    {
        rows.Add(SpriteRef(entityId, entityName, "bestiary_image", "Monster.imageBossBestiary", monster.imageBossBestiary));
    }

    if (monster.portraitBoss != null)
    {
        rows.Add(SpriteRef(entityId, entityName, "boss_portrait", "Monster.portraitBoss", monster.portraitBoss));
    }

    if (monster.gameObject != null)
    {
        foreach (var renderer in monster.gameObject.GetComponentsInChildren<SpriteRenderer>(true))
        {
            rows.Add(ComponentRef(entityId, entityName, "renderer", "Monster.gameObject.SpriteRenderer", renderer));
        }
        foreach (var animator in monster.gameObject.GetComponentsInChildren<Animator>(true))
        {
            rows.Add(ComponentRef(entityId, entityName, "animator", "Monster.gameObject.Animator", animator));
        }
    }
}

var json = JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
const string OutputPath = "__VISUAL_AUDIT_OUTPUT_PATH__";
var outputDirectory = System.IO.Path.GetDirectoryName(OutputPath);
if (!string.IsNullOrEmpty(outputDirectory)) System.IO.Directory.CreateDirectory(outputDirectory);
System.IO.File.WriteAllText(OutputPath, json);
return JsonSerializer.Serialize(new Dictionary<string, object?> { ["output_path"] = OutputPath, ["row_count"] = rows.Count });
