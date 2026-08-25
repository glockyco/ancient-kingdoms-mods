using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace DataExporter.Exporters;

internal static class VisualAssetRendererSelector
{
    /// <summary>
    /// The Front child that holds a layered creature's renderers, or null.
    /// </summary>
    public static Transform FindFrontSubtree(GameObject rootObject)
    {
        if (rootObject == null)
            return null;

        return FindDirectChild(rootObject.transform, "Front");
    }

    /// <summary>
    /// The renderers of a Front subtree, in the order they are drawn.
    /// </summary>
    public static List<SpriteRenderer> SelectFrontRenderers(Transform front, Transform root)
    {
        var selected = new List<SpriteRenderer>();
        if (front == null || root == null)
            return selected;

        var renderers = front.GetComponentsInChildren<SpriteRenderer>(true);
        foreach (var renderer in renderers)
        {
            if (renderer == null || renderer.sprite == null)
                continue;

            if (IsExcludedRendererPath(GetRelativePath(renderer.transform, root)))
                continue;

            selected.Add(renderer);
        }

        return selected
            .OrderBy(renderer => SortingLayer.GetLayerValueFromID(renderer.sortingLayerID))
            .ThenBy(renderer => renderer.sortingOrder)
            .ThenBy(renderer => GetDepth(renderer.transform, front))
            .ThenBy(renderer => GetRelativePath(renderer.transform, root), StringComparer.Ordinal)
            .ToList();
    }

    private static Transform FindDirectChild(Transform parent, string childName)
    {
        for (var i = 0; i < parent.childCount; i++)
        {
            var child = parent.GetChild(i);
            if (child.name == childName)
                return child;
        }

        return null;
    }

    private static int GetDepth(Transform transform, Transform stopParent)
    {
        var depth = 0;
        while (transform != null && transform != stopParent)
        {
            depth++;
            transform = transform.parent;
        }

        return depth;
    }

    private static string GetRelativePath(Transform transform, Transform stopParent)
    {
        var names = new List<string>();
        while (transform != null && transform != stopParent)
        {
            names.Add(transform.name);
            transform = transform.parent;
        }

        names.Reverse();
        return string.Join("/", names);
    }

    private static bool IsExcludedRendererPath(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath))
            return false;

        var segments = relativePath.Split('/');
        foreach (var segment in segments)
        {
            var normalized = segment.ToLowerInvariant().Replace(" ", "").Replace("_", "").Replace("-", "");
            if (normalized.Contains("speechbubble") ||
                normalized.Contains("hp") ||
                normalized.Contains("health") ||
                normalized.Contains("hitbar") ||
                normalized.Contains("bar") ||
                normalized.Contains("label") ||
                normalized.Contains("minimap") ||
                normalized.Contains("shadow") ||
                normalized.Contains("name") ||
                normalized.Contains("grid") ||
                normalized.Contains("background"))
            {
                return true;
            }
        }

        return false;
    }
}
