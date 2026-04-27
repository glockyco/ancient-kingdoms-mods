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
var petType = Il2CppType.Of<Il2Cpp.Pet>();
foreach (var obj in Resources.FindObjectsOfTypeAll(petType))
{
    var pet = obj.TryCast<Il2Cpp.Pet>();
    if (pet == null) continue;

    var entityName = pet.name;
    var entityId = SanitizeId(entityName);

    if (pet.portraitIcon != null)
    {
        rows.Add(new Dictionary<string, object?>
        {
            ["domain"] = "pet",
            ["entity_id"] = entityId,
            ["entity_name"] = entityName,
            ["visual_kind"] = "icon",
            ["source_field"] = "Pet.portraitIcon",
            ["unity_object_type"] = pet.portraitIcon.GetType().FullName,
            ["unity_object_name"] = pet.portraitIcon.name,
            ["sprite_name"] = pet.portraitIcon.name,
            ["texture_name"] = pet.portraitIcon.texture != null ? pet.portraitIcon.texture.name : null,
            ["instance_id"] = pet.portraitIcon.GetInstanceID(),
            ["confidence"] = "authoritative",
            ["notes"] = Array.Empty<string>(),
        });
    }

    if (pet.gameObject != null)
    {
        foreach (var renderer in pet.gameObject.GetComponentsInChildren<SpriteRenderer>(true))
        {
            rows.Add(new Dictionary<string, object?>
            {
                ["domain"] = "pet",
                ["entity_id"] = entityId,
                ["entity_name"] = entityName,
                ["visual_kind"] = "renderer",
                ["source_field"] = "Pet.gameObject.SpriteRenderer",
                ["unity_object_type"] = renderer.GetType().FullName,
                ["unity_object_name"] = renderer.name,
                ["game_object_name"] = renderer.gameObject != null ? renderer.gameObject.name : null,
                ["instance_id"] = renderer.GetInstanceID(),
                ["confidence"] = "authoritative",
                ["notes"] = Array.Empty<string>(),
            });
        }
    }
}

return JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
