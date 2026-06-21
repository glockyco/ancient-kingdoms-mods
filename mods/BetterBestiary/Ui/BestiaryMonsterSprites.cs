using Il2Cpp;
using UnityEngine;

namespace BetterBestiary.Ui;

internal static class BestiaryMonsterSprites
{
    private static readonly Color BlankIconColor = new(0.45f, 0.45f, 0.45f, 0.85f);
    private static Sprite _blankMonsterSprite;

    internal static Sprite DetailSpriteFor(Monster monster, out Color imageColor)
    {
        imageColor = Color.white;
        if (monster == null)
        {
            imageColor = BlankIconColor;
            return BlankMonsterSprite();
        }

        if (monster.imageBossBestiary != null)
            return monster.imageBossBestiary;

        var renderer = monster.gameObject != null
            ? monster.gameObject.GetComponent<SpriteRenderer>()
            : null;
        if (renderer != null && renderer.sprite != null)
            return renderer.sprite;

        imageColor = BlankIconColor;
        return BlankMonsterSprite();
    }

    internal static Sprite GridSpriteFor(Monster monster, out Color imageColor)
    {
        return DetailSpriteFor(monster, out imageColor);
    }

    private static Sprite BlankMonsterSprite()
    {
        if (_blankMonsterSprite != null)
            return _blankMonsterSprite;

        var texture = new Texture2D(1, 1);
        texture.SetPixel(0, 0, Color.white);
        texture.Apply();
        _blankMonsterSprite = Sprite.Create(texture, new Rect(0f, 0f, 1f, 1f), new Vector2(0.5f, 0.5f));
        return _blankMonsterSprite;
    }
}
