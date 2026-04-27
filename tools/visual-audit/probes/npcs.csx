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
        rows.Add(new Dictionary<string, object?>
        {
            ["domain"] = "npc",
            ["entity_id"] = entityId,
            ["entity_name"] = entityName,
            ["visual_kind"] = "renderer",
            ["source_field"] = "Npc.gameObject.SpriteRenderer",
            ["unity_object_type"] = renderer.GetType().FullName,
            ["unity_object_name"] = renderer.name,
            ["game_object_name"] = renderer.gameObject != null ? renderer.gameObject.name : null,
            ["instance_id"] = renderer.GetInstanceID(),
            ["confidence"] = "authoritative",
            ["notes"] = Array.Empty<string>(),
        });
    }

    foreach (var animator in npc.gameObject.GetComponentsInChildren<Animator>(true))
    {
        rows.Add(new Dictionary<string, object?>
        {
            ["domain"] = "npc",
            ["entity_id"] = entityId,
            ["entity_name"] = entityName,
            ["visual_kind"] = "animator",
            ["source_field"] = "Npc.gameObject.Animator",
            ["unity_object_type"] = animator.GetType().FullName,
            ["unity_object_name"] = animator.name,
            ["game_object_name"] = animator.gameObject != null ? animator.gameObject.name : null,
            ["instance_id"] = animator.GetInstanceID(),
            ["confidence"] = "authoritative",
            ["notes"] = Array.Empty<string>(),
        });
    }
}

var json = JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
const string OutputPath = "__VISUAL_AUDIT_OUTPUT_PATH__";
var outputDirectory = System.IO.Path.GetDirectoryName(OutputPath);
if (!string.IsNullOrEmpty(outputDirectory)) System.IO.Directory.CreateDirectory(outputDirectory);
System.IO.File.WriteAllText(OutputPath, json);
return JsonSerializer.Serialize(new Dictionary<string, object?> { ["output_path"] = OutputPath, ["row_count"] = rows.Count });
