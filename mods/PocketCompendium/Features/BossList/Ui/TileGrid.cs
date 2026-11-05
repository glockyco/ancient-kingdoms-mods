using System.Collections.Generic;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.BossList.Ui;

/// <summary>
/// Monster tiles in lines of a given number of columns, the boss list's compact style. It reuses
/// its tiles, places them from its parent's top-left corner and reports a click on one.
/// </summary>
internal sealed class TileGrid
{
    public const float Pad = 6f;
    public const float Gap = 6f;

    private readonly Transform _parent;
    private readonly List<TileView> _tiles = new();

    public TileGrid(Transform parent) => _parent = parent;

    /// <summary>The tiles added since <see cref="Begin"/>.</summary>
    public int Count { get; private set; }

    /// <summary>How many columns fit in <paramref name="width"/>.</summary>
    public static int ColumnsFor(float width) =>
        Mathf.Max(1, Mathf.FloorToInt((width - 2f * Pad + Gap) / (TileView.Size + Gap)));

    /// <summary>The width of <paramref name="columns"/> tiles with the padding around them.</summary>
    public static float Width(int columns) => 2f * Pad + columns * TileView.Size + (columns - 1) * Gap;

    /// <summary>The height of <paramref name="count"/> tiles in lines of <paramref name="columns"/>, with the padding.</summary>
    public static float Height(int count, int columns)
    {
        int lines = (count + columns - 1) / columns;
        return 2f * Pad + lines * TileView.Size + (lines - 1) * Gap;
    }

    public void Begin() => Count = 0;

    /// <summary>
    /// Shows the next tile at its place in lines of <paramref name="columns"/>. The parent must be
    /// active, because a new tile's caption cannot take its outline under an inactive one.
    /// </summary>
    public void Add(in RowData data, bool watched, string tooltip, int columns)
    {
        if (Count == _tiles.Count) _tiles.Add(new TileView(_parent));
        var tile = _tiles[Count];
        tile.SetActive(true);
        tile.Set(data, watched);
        tile.SetTooltip(tooltip);
        HudFactory.TopLeft(tile.Rect, Pad + Count % columns * (TileView.Size + Gap),
            Pad + Count / columns * (TileView.Size + Gap), TileView.Size, TileView.Size);
        Count++;
    }

    /// <summary>Hides the tiles not added since <see cref="Begin"/>.</summary>
    public void End()
    {
        for (int index = Count; index < _tiles.Count; index++) _tiles[index].SetActive(false);
    }

    /// <summary>
    /// Updates the hover looks and returns the monster clicked this frame, if any. A click counts
    /// only while <paramref name="clickable"/>, such as while the pointer is inside a scrolled view.
    /// </summary>
    public TrackedMonster UpdateInput(bool clickable)
    {
        TrackedMonster clicked = null;
        foreach (var tile in _tiles)
            if (tile.Monster != null && tile.UpdateHover() && clickable && Pointer.Clicked(tile.Rect))
                clicked = tile.Monster;
        return clicked;
    }

    /// <summary>Forgets the tiles after their parent is destroyed.</summary>
    public void Clear()
    {
        _tiles.Clear();
        Count = 0;
    }
}
