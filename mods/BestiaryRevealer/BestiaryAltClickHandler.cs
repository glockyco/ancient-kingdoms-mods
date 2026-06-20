using System;
using Il2Cpp;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;

namespace BestiaryRevealer;

internal static class BestiaryAltClickHandler
{
    private static readonly Collider2D[] Hits = new Collider2D[32];

    internal static void Update()
    {
        var mouse = Mouse.current;
        var keyboard = Keyboard.current;
        if (mouse == null || keyboard == null)
            return;

        if (!mouse.leftButton.wasPressedThisFrame || !(keyboard.leftAltKey.isPressed || keyboard.rightAltKey.isPressed))
            return;

        if (!GameManager.isLocalPlayerActive || GameManager.isPointerOverUI)
            return;

        var camera = Camera.main;
        if (camera == null && UIMap.singleton != null)
            camera = UIMap.singleton.MainCamera;
        if (camera == null)
            return;

        var mousePosition = mouse.position.ReadValue();
        var world = camera.ScreenToWorldPoint(new Vector3(mousePosition.x, mousePosition.y, 0f));
        world.z = 0f;

        if (TryPickMonster(world, out var monster))
            BestiaryPageOpener.Open(monster);
    }

    private static bool TryPickMonster(Vector2 world, out Monster monster)
    {
        return TryPickMonster(world, GameManager.clickableFilter, out monster) ||
               TryPickMonster(world, GameManager.noFilter, out monster) ||
               TryPickMonster(world, GameManager.monsterFilter, out monster);
    }

    private static bool TryPickMonster(Vector2 world, ContactFilter2D filter, out Monster monster)
    {
        monster = null;
        var count = Physics2D.OverlapPoint(world, filter, Hits);
        var bestSortingOrder = int.MinValue;

        for (var i = 0; i < count; i++)
        {
            var hit = Hits[i];
            if (hit == null)
                continue;

            var candidate = hit.GetComponentInParent<Monster>();
            if (candidate == null)
                continue;

            var sortingOrder = GetSortingOrder(candidate.transform);
            if (monster != null && sortingOrder < bestSortingOrder)
                continue;

            monster = candidate;
            bestSortingOrder = sortingOrder;
        }

        Array.Clear(Hits, 0, Math.Min(count, Hits.Length));
        return monster != null;
    }

    private static int GetSortingOrder(Transform transform)
    {
        var sortingGroup = transform.GetComponentInParent<SortingGroup>();
        if (sortingGroup != null)
            return sortingGroup.sortingOrder;

        var spriteRenderer = transform.GetComponentInParent<SpriteRenderer>();
        return spriteRenderer != null ? spriteRenderer.sortingOrder : 0;
    }
}
