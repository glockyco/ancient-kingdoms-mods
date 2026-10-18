using System;
using System.Collections.Generic;
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
    private readonly PlacementIds _placementIds = new();

    protected string PlacementId(string prefix, Vector3 position) =>
        _placementIds.Register(prefix, position.x, position.y);

    private static List<(ZoneInfo Info, ZoneBoundary Boundary)> _configuredZones;

    internal static void ResetZoneTriggers() => _configuredZones = null;

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
        var json = JsonConvert.SerializeObject(data, Formatting.Indented, new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            DefaultValueHandling = DefaultValueHandling.Include
        });

        var filePath = Path.Combine(ExportPath, filename);
        File.WriteAllText(filePath, json);
        Logger.Msg($"✓ Exported {filename}");
    }

    /// <summary>
    /// Result of zone detection containing both main zone and sub-zone IDs.
    /// </summary>
    protected struct ZoneInfo
    {
        public string ZoneId;
        public string SubZoneId;
    }

    protected static void PrepareConfiguredZoneGeometry()
    {
        ResetZoneTriggers();
        var triggers = Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.ZoneTrigger>());
        var zones = new List<(ZoneInfo Info, ZoneBoundary Boundary)>(triggers.Length);
        foreach (var obj in triggers)
        {
            var trigger = obj.TryCast<Il2Cpp.ZoneTrigger>();
            if (trigger == null || trigger.gameObject == null || !trigger.gameObject.scene.IsValid()
                || trigger.gameObject.scene.name != "World")
                continue;
            var collider = trigger.GetComponent<Collider2D>();
            if (collider == null)
                throw new InvalidOperationException($"Zone trigger {trigger.name}: missing configured collider. Reload World.");
            var zoneId = GetZoneIdFromByte(trigger.idZone);
            if (zoneId == "unknown")
                throw new InvalidOperationException($"Zone trigger {trigger.name}: configured zone {trigger.idZone} has no public identity. Reload World.");
            zones.Add((new ZoneInfo { ZoneId = zoneId, SubZoneId = GetSubZoneId(trigger) },
                ReadZoneBoundary(collider)));
        }
        if (zones.Count == 0)
            throw new InvalidOperationException("World capture has no configured zone boundaries. Reload World.");
        _configuredZones = zones;
    }

    private static ZoneBoundary ReadZoneBoundary(Collider2D collider)
    {
        // Authored vertices exist before physics registers the collider. Transform
        // them once so all exporters use the same immutable World geometry.
        var matrix = collider.transform.localToWorldMatrix;
        var offset = collider.offset;
        ZoneBoundary.Point ToWorld(Vector2 point)
        {
            double x = point.x + offset.x;
            double y = point.y + offset.y;
            return new ZoneBoundary.Point(matrix.m00 * x + matrix.m01 * y + matrix.m03,
                matrix.m10 * x + matrix.m11 * y + matrix.m13);
        }

        ZoneBoundary.Point[] points;
        var box = collider.TryCast<BoxCollider2D>();
        var polygon = collider.TryCast<PolygonCollider2D>();
        if (box != null)
        {
            if (box.edgeRadius != 0)
                throw new InvalidOperationException($"Zone collider {collider.name}: rounded boxes are unsupported. Reload World.");
            var half = box.size * 0.5f;
            points = new[]
            {
                ToWorld(new Vector2(-half.x, -half.y)), ToWorld(new Vector2(half.x, -half.y)),
                ToWorld(new Vector2(half.x, half.y)), ToWorld(new Vector2(-half.x, half.y))
            };
        }
        else if (polygon != null)
        {
            if (polygon.pathCount != 1)
                throw new InvalidOperationException($"Zone collider {collider.name}: expected one configured polygon path. Reload World.");
            var path = polygon.GetPath(0);
            points = new ZoneBoundary.Point[path.Length];
            for (var i = 0; i < path.Length; i++)
                points[i] = ToWorld(path[i]);
        }
        else
        {
            throw new InvalidOperationException($"Zone collider {collider.name}: unsupported configured shape {collider.GetIl2CppType().FullName}. Reload World.");
        }
        try
        {
            return new ZoneBoundary(points);
        }
        catch (ArgumentException error)
        {
            throw new InvalidOperationException($"Zone collider {collider.name}: invalid authored boundary. Reload World.", error);
        }
    }

    /// <summary>Uses the captured authored boundary, including before physics starts.</summary>
    protected static ZoneInfo GetZoneInfoFromPosition(Vector3 position)
    {
        if (_configuredZones == null || !float.IsFinite(position.x) || !float.IsFinite(position.y))
            throw new InvalidOperationException($"Configured zone geometry or position {position} is unavailable. Reload World.");
        double nearest = double.PositiveInfinity;
        ZoneInfo result = default;
        foreach (var zone in _configuredZones)
        {
            if (zone.Boundary.BoundsDistanceSquared(position.x, position.y) >= nearest)
                continue;
            var distance = zone.Boundary.DistanceSquared(position.x, position.y);
            if (distance == 0)
                return zone.Info;
            if (distance < nearest)
            {
                nearest = distance;
                result = zone.Info;
            }
        }
        return result;
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
