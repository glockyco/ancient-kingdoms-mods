using System;
using System.Collections;
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
        ["domain"] = "item",
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

static Dictionary<string, object?> PathRef(string entityId, string entityName, string visualKind, string sourceField, string path)
{
    return new Dictionary<string, object?>
    {
        ["domain"] = "item",
        ["entity_id"] = entityId,
        ["entity_name"] = entityName,
        ["visual_kind"] = visualKind,
        ["source_field"] = sourceField,
        ["unity_object_type"] = "System.String",
        ["unity_object_name"] = path,
        ["path"] = path,
        ["confidence"] = "authoritative",
        ["notes"] = Array.Empty<string>(),
    };
}

var rows = new List<Dictionary<string, object?>>();
var itemType = Il2CppType.Of<Il2Cpp.ScriptableItem>();
foreach (var obj in Resources.FindObjectsOfTypeAll(itemType))
{
    var item = obj.TryCast<Il2Cpp.ScriptableItem>();
    if (item == null) continue;

    var entityName = item.name;
    var entityId = SanitizeId(entityName);

    if (!string.IsNullOrEmpty(item.image_name))
    {
        rows.Add(PathRef(entityId, entityName, "icon", "ScriptableItem.image_name", item.image_name));
    }

    if (item.image != null)
    {
        rows.Add(SpriteRef(entityId, entityName, "icon", "ScriptableItem.image", item.image));
    }

    var treasureMap = item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.TreasureMapItem>();
    if (treasureMap != null && treasureMap.imageLocation != null)
    {
        rows.Add(SpriteRef(entityId, entityName, "treasure_map_image", "TreasureMapItem.imageLocation", treasureMap.imageLocation));
    }
}

foreach (var collectionObj in HotRepl.Helpers.Il2Cpp.Il2CppHelpers.FindObjects("Assets.HeroEditor4D.FantasyInventory.Scripts.ItemCollection"))
{
    var itemParamsLists = new[] { "UserItems", "GeneratedItems" };
    foreach (var listFieldName in itemParamsLists)
    {
        var listField = collectionObj.GetType().GetField(listFieldName);
        var itemParamsList = listField?.GetValue(collectionObj) as IEnumerable;
        if (itemParamsList == null) continue;

        foreach (var itemParams in itemParamsList)
        {
            var itemParamsType = itemParams.GetType();
            var id = itemParamsType.GetField("Id")?.GetValue(itemParams) as string;
            var path = itemParamsType.GetField("Path")?.GetValue(itemParams) as string;
            if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(path)) continue;

            rows.Add(PathRef(SanitizeId(id), id, "equipment_path", $"ItemCollection.{listFieldName}[].Path", path));
        }
    }
}

return JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
