using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using DataExporter.Models;
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

    /// <summary>
    /// Fails unless the game runs in English, because the export publishes the names and
    /// labels an English-speaking player sees.
    /// </summary>
    protected static void RequireEnglishLocale(string purpose)
    {
        var code = UnityEngine.Localization.Settings.LocalizationSettings.SelectedLocale?.Identifier.Code;
        if (string.IsNullOrEmpty(code))
            throw new InvalidOperationException($"{purpose} requires an English selected locale, but no locale is selected.");
        if (code != "en" && !code.StartsWith("en-", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"{purpose} requires an English selected locale, got '{code}'.");
    }

    protected void WriteJson<T>(T data, string filename)
    {
        var filePath = Path.Combine(ExportPath, filename);
        File.WriteAllText(filePath, ExportJson.Serialize(data));
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
            var zoneId = RequiredZoneId(trigger.idZone, $"Zone trigger {trigger.name} (reload World)");
            zones.Add((new ZoneInfo { ZoneId = zoneId, SubZoneId = GetSubZoneId(trigger) },
                ReadZoneBoundary(collider)));
        }
        if (zones.Count == 0)
            throw new InvalidOperationException("World capture has no configured zone boundaries. Reload World.");
        _configuredZones = zones;
    }

    private static ZoneBoundary ReadZoneBoundary(Collider2D collider)
    {
        try
        {
            return new ZoneBoundary(ReadPolygonVertices(collider));
        }
        catch (ArgumentException error)
        {
            throw new InvalidOperationException($"Zone collider {collider.name}: invalid authored boundary. Reload World.", error);
        }
    }

    /// <summary>
    /// The world-space shape of a trigger collider. Circles keep their exact center and radius,
    /// and boxes and polygons become their world-space vertices.
    /// </summary>
    protected static TriggerArea ReadTriggerArea(Collider2D collider)
    {
        var circle = collider.TryCast<CircleCollider2D>();
        if (circle == null)
        {
            var vertices = ReadPolygonVertices(collider);
            try
            {
                _ = new ZoneBoundary(vertices);
            }
            catch (ArgumentException error)
            {
                throw new InvalidOperationException($"Collider {collider.name}: invalid authored shape. Reload World.", error);
            }
            var points = new List<Point2>(vertices.Length);
            foreach (var vertex in vertices)
                points.Add(new Point2((float)vertex.X, (float)vertex.Y));
            return new TriggerArea("polygon") { points = points };
        }
        // Unity scales a circle collider by its larger absolute axis scale.
        var scale = circle.transform.lossyScale;
        var radius = circle.radius * Mathf.Max(Mathf.Abs(scale.x), Mathf.Abs(scale.y));
        if (!(radius > 0))
            throw new InvalidOperationException($"Collider {collider.name}: circle has no area. Reload World.");
        var center = circle.transform.TransformPoint(new Vector3(circle.offset.x, circle.offset.y, 0f));
        return new TriggerArea("circle") { center = new Point2(center.x, center.y), radius = radius };
    }

    /// <summary>The middle of a trigger area's extent, used to place it in a zone.</summary>
    protected static Point2 TriggerAreaCenter(TriggerArea area)
    {
        if (area.shape == "circle")
            return area.center;
        float minX = float.PositiveInfinity, minY = float.PositiveInfinity;
        float maxX = float.NegativeInfinity, maxY = float.NegativeInfinity;
        foreach (var point in area.points)
        {
            minX = Mathf.Min(minX, point.x);
            minY = Mathf.Min(minY, point.y);
            maxX = Mathf.Max(maxX, point.x);
            maxY = Mathf.Max(maxY, point.y);
        }
        return new Point2((minX + maxX) / 2f, (minY + maxY) / 2f);
    }

    private static ZoneBoundary.Point[] ReadPolygonVertices(Collider2D collider)
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

        var box = collider.TryCast<BoxCollider2D>();
        var polygon = collider.TryCast<PolygonCollider2D>();
        if (box != null)
        {
            if (box.edgeRadius != 0)
                throw new InvalidOperationException($"Collider {collider.name}: rounded boxes are unsupported. Reload World.");
            var half = box.size * 0.5f;
            return new[]
            {
                ToWorld(new Vector2(-half.x, -half.y)), ToWorld(new Vector2(half.x, -half.y)),
                ToWorld(new Vector2(half.x, half.y)), ToWorld(new Vector2(-half.x, half.y))
            };
        }
        if (polygon != null)
        {
            if (polygon.pathCount != 1)
                throw new InvalidOperationException($"Collider {collider.name}: expected one configured polygon path. Reload World.");
            var path = polygon.GetPath(0);
            var points = new ZoneBoundary.Point[path.Length];
            for (var i = 0; i < path.Length; i++)
                points[i] = ToWorld(path[i]);
            return points;
        }
        throw new InvalidOperationException($"Collider {collider.name}: unsupported configured shape {collider.GetIl2CppType().FullName}. Reload World.");
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

    /// <summary>The game's zone for a zone number, or an error naming what referred to it.</summary>
    protected static Il2Cpp.Zone RequiredZone(int zone, string context)
    {
        if (zone < byte.MinValue || zone > byte.MaxValue
            || Il2Cpp.ZoneInfo.zones == null || !Il2Cpp.ZoneInfo.zones.ContainsKey((byte)zone))
            throw new InvalidOperationException($"{context}: names unknown zone {zone}.");
        var info = Il2Cpp.ZoneInfo.zones[(byte)zone];
        if (info == null || string.IsNullOrEmpty(info.name))
            throw new InvalidOperationException($"{context}: names unnamed zone {zone}.");
        return info;
    }

    protected static string RequiredZoneId(int zone, string context) => SanitizeId(RequiredZone(zone, context).name);
}
