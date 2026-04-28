using System;
using System.IO;
using System.Text.RegularExpressions;
using Il2CppInterop.Runtime;
using MelonLoader;
using Newtonsoft.Json;
using UnityEngine;

namespace DataExporter.Exporters;

public abstract class BaseExporter
{
    protected readonly MelonLogger.Instance Logger;
    protected readonly string ExportPath;
    protected readonly VisualAssetRegistry VisualAssets;

    private static Il2CppSystem.Object[] _zoneTriggers;

    /// <summary>
    /// Gets zone triggers from the scene. Loaded once and cached for all exporters.
    /// </summary>
    protected static Il2CppSystem.Object[] ZoneTriggers
    {
        get
        {
            if (_zoneTriggers == null)
            {
                var zoneTriggerType = Il2CppType.Of<Il2Cpp.ZoneTrigger>();
                _zoneTriggers = Resources.FindObjectsOfTypeAll(zoneTriggerType);
            }
            return _zoneTriggers;
        }
    }

    protected BaseExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets = null)
    {
        Logger = logger;
        ExportPath = exportPath;
        VisualAssets = visualAssets;
    }

    public abstract void Export();

    /// <summary>
    /// Sanitizes a Unity object name to create a URL-safe ID.
    /// Converts to lowercase, replaces spaces with underscores, and removes special characters.
    /// </summary>
    protected static string SanitizeId(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        // Convert to lowercase and replace spaces with underscores
        var sanitized = input.ToLowerInvariant().Replace(" ", "_");

        // Remove URL-unsafe characters: # % ? & / \ and other special chars except _ and -
        sanitized = Regex.Replace(sanitized, @"[^a-z0-9_\-]", "");

        return sanitized;
    }

    protected void WriteJson<T>(T data, string filename)
    {
        try
        {
            var json = JsonConvert.SerializeObject(data, Formatting.Indented, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            var filePath = Path.Combine(ExportPath, filename);
            File.WriteAllText(filePath, json);
            Logger.Msg($"✓ Exported {filename}");
        }
        catch (Exception ex)
        {
            Logger.Error($"Failed to export {filename}: {ex.Message}");
        }
    }

    /// <summary>
    /// Result of zone detection containing both main zone and sub-zone IDs.
    /// </summary>
    protected struct ZoneInfo
    {
        public string ZoneId;
        public string SubZoneId;
    }

    /// <summary>
    /// Determines zone and sub-zone IDs from a position using area containment checking.
    /// Tests if the position falls within any ZoneTrigger's Collider2D boundary.
    /// Falls back to nearest zone collider if not inside any zone.
    /// Filters for scene zone triggers only (not templates).
    /// </summary>
    protected static ZoneInfo GetZoneInfoFromPosition(Vector3 position)
    {
        var position2D = new Vector2(position.x, position.y);

        // First pass: check if position is inside any zone
        foreach (var triggerObj in ZoneTriggers)
        {
            var trigger = triggerObj.TryCast<Il2Cpp.ZoneTrigger>();
            if (trigger == null || trigger.gameObject == null || !trigger.gameObject.scene.IsValid())
                continue;

            var collider = trigger.GetComponent<Collider2D>();
            if (collider == null)
                continue;

            if (collider.OverlapPoint(position2D))
            {
                return new ZoneInfo
                {
                    ZoneId = GetZoneIdFromByte(trigger.idZone),
                    SubZoneId = GetSubZoneId(trigger)
                };
            }
        }

        // Second pass: find nearest zone collider boundary
        Il2Cpp.ZoneTrigger nearestTrigger = null;
        float nearestDistance = float.MaxValue;

        foreach (var triggerObj in ZoneTriggers)
        {
            var trigger = triggerObj.TryCast<Il2Cpp.ZoneTrigger>();
            if (trigger == null || trigger.gameObject == null || !trigger.gameObject.scene.IsValid())
                continue;

            var collider = trigger.GetComponent<Collider2D>();
            if (collider == null)
                continue;

            var closestPoint = collider.ClosestPoint(position2D);
            var distance = Vector2.Distance(position2D, closestPoint);

            if (distance < nearestDistance)
            {
                nearestDistance = distance;
                nearestTrigger = trigger;
            }
        }

        if (nearestTrigger != null)
        {
            return new ZoneInfo
            {
                ZoneId = GetZoneIdFromByte(nearestTrigger.idZone),
                SubZoneId = GetSubZoneId(nearestTrigger)
            };
        }

        return new ZoneInfo { ZoneId = "unknown", SubZoneId = null };
    }

    /// <summary>
    /// Legacy method for backwards compatibility - returns only the main zone ID.
    /// </summary>
    protected static string GetZoneIdFromPosition(Vector3 position)
    {
        return GetZoneInfoFromPosition(position).ZoneId;
    }

    /// <summary>
    /// Gets the sub-zone ID from a zone trigger using its nameZone field.
    /// </summary>
    private static string GetSubZoneId(Il2Cpp.ZoneTrigger trigger)
    {
        var name = trigger.nameZone;
        if (string.IsNullOrEmpty(name))
            return null;
        return $"zone_trigger_{SanitizeId(name)}";
    }

    /// <summary>
    /// Converts a byte zone ID to a sanitized string zone ID using ZoneInfo lookup.
    /// </summary>
    protected static string GetZoneIdFromByte(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return SanitizeId(zone.name);
            }
        }

        return "unknown";
    }
}
