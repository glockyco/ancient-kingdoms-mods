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
    /// Selects the source whose lifecycle owns the visual branch.
    ///
    /// A Front composite needs the appearance applied to a scene instance. A root
    /// renderer uses the canonical object, whose template holds the initial frame.
    /// </summary>
    protected static GameObject SelectEntityVisualSource(
        GameObject canonical,
        GameObject sceneInstance)
    {
        if (canonical == null)
            return sceneInstance;

        return VisualAssetRendererSelector.FindFrontSubtree(canonical) != null
            ? sceneInstance ?? canonical
            : canonical;
    }

    /// <summary>
    /// Exports the primary sprite from the source the object's structure names.
    ///
    /// A layered creature holds its renderers under a Front child. Every other
    /// entity holds one SpriteRenderer on the root. No monster or NPC holds both,
    /// so the structure decides the source. Deciding it on a populated sprite or
    /// an active object instead made the choice depend on the moment of export.
    /// </summary>
    protected void ExportEntitySprite(
        string domain,
        string entityId,
        string sourceField,
        GameObject gameObject,
        string kind = "primary")
    {
        if (VisualAssets == null || gameObject == null)
            return;

        // A live Animator can advance either a root sprite or a layered character.
        // Keep the initialized source, but sample its controller's initial state.
        var animator = gameObject.GetComponent<Animator>();
        if (gameObject.activeInHierarchy
            && animator != null
            && animator.runtimeAnimatorController != null)
        {
            animator.Rebind();
            animator.Update(0f);
        }

        var front = VisualAssetRendererSelector.FindFrontSubtree(gameObject);
        if (front != null)
        {
            var renderers = VisualAssetRendererSelector.SelectFrontRenderers(front, gameObject.transform);
            if (renderers.Count == 0)
            {
                Logger.Warning($"{entityId}: Front subtree holds no sprite, no {kind} image exported");
                return;
            }

            VisualAssets.ExportComposite(
                domain,
                entityId,
                kind,
                $"{sourceField}.Front.SpriteRenderers",
                renderers);
            return;
        }

        var primaryRenderer = gameObject.GetComponent<SpriteRenderer>();
        if (primaryRenderer == null || primaryRenderer.sprite == null)
        {
            Logger.Warning($"{entityId}: no Front subtree and no root sprite, no {kind} image exported");
            return;
        }

        VisualAssets.ExportRendererSprite(
            domain,
            entityId,
            kind,
            $"{sourceField}.SpriteRenderer",
            primaryRenderer);
    }

    /// <summary>
    /// The point the game places an actor at.
    ///
    /// The transform holds where the actor stands now. A monster that wanders or
    /// patrols stands somewhere else, so two exports of one build disagree.
    ///
    /// A zero captured point means the capture did not run. Monster captures in
    /// Awake. Npc captures in Start, which does not run while its zone is
    /// inactive. An actor that did not start did not move, so its
    /// transform still holds the placed point.
    /// </summary>
    protected static Vector3 PlacedPosition(Vector2 captured, Vector3 current)
    {
        if (captured == Vector2.zero)
            return current;

        return new Vector3(captured.x, captured.y, current.z);
    }

    /// <summary>
    /// Sanitizes a Unity object name to create a URL-safe ID.
    /// Converts to lowercase, replaces spaces with underscores, and removes special characters.
    /// </summary>
    /// <summary>
    /// Identifier for an asset name. The rule lives in <see cref="GameIds"/>, because anything
    /// resolving an exported identifier back to a game asset must apply the same one.
    /// </summary>
    protected static string SanitizeId(string input) => GameIds.Sanitize(input);

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
