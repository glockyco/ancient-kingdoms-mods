using System;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public enum Align
{
    Left,
    Right,
    Center,
}

public sealed class Label
{
    public readonly GameObject Go;
    private readonly TextMeshProUGUI _text;

    public Label(GameObject go, TextMeshProUGUI text)
    {
        Go = go;
        _text = text;
    }

    public RectTransform Rect => Go.GetComponent<RectTransform>();

    public void SetActive(bool value)
    {
        if (Go.activeSelf != value) Go.SetActive(value);
    }

    public string Value
    {
        set
        {
            if (_text.text != value) _text.text = value;
        }
    }

    public Color Color
    {
        set
        {
            if (_text.color != value) _text.color = value;
        }
    }
}

public static class HudFactory
{

    public static GameObject Rect(string name, Transform parent)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<RectTransform>();
        return go;
    }

    public static Image Box(string name, Transform parent, Color color)
    {
        var go = Rect(name, parent);
        var image = go.AddComponent<Image>();
        image.sprite = Theme.White;
        image.type = Image.Type.Simple;
        image.color = color;
        image.raycastTarget = false;
        return image;
    }

    public static Image Bar(string name, Transform parent, Color color)
    {
        var image = Box(name, parent, color);
        image.type = Image.Type.Filled;
        image.fillMethod = Image.FillMethod.Horizontal;
        image.fillOrigin = (int)Image.OriginHorizontal.Left;
        image.fillAmount = 0f;
        return image;
    }

    public static Image Icon(string name, Transform parent, Sprite sprite)
    {
        var go = Rect(name, parent);
        var image = go.AddComponent<Image>();
        image.sprite = sprite;
        image.enabled = sprite != null;
        image.preserveAspect = true;
        image.color = Color.white;
        image.raycastTarget = false;
        return image;
    }

    public static Label Label(string name, Transform parent, float size, Color color, Align align, bool bold = false)
    {
        var font = TMP_Settings.defaultFontAsset;
        if (font == null)
            throw new InvalidOperationException("BossSkillTracker requires TMP_Settings.defaultFontAsset to create HUD labels.");

        var go = Rect(name, parent);
        var text = go.AddComponent<TextMeshProUGUI>();
        text.font = font;
        text.fontSize = size;
        text.color = color;
        text.raycastTarget = false;
        text.enableWordWrapping = false;
        text.overflowMode = TextOverflowModes.Ellipsis;
        text.fontStyle = bold ? FontStyles.Bold : FontStyles.Normal;
        text.extraPadding = false;
        text.alignment = align == Align.Right
            ? TextAlignmentOptions.MidlineRight
            : align == Align.Center
                ? TextAlignmentOptions.Midline
                : TextAlignmentOptions.MidlineLeft;
        return new Label(go, text);
    }

    public static RectTransform Stretch(Component component, Vector2 offsetMin, Vector2 offsetMax)
    {
        var rect = component.GetComponent<RectTransform>();
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = offsetMin;
        rect.offsetMax = offsetMax;
        return rect;
    }


    public static void Frame(Transform parent, Color color, float thickness)
    {
        var top = Box("frameTop", parent, color);
        Place(top, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -thickness), Vector2.zero);

        var bottom = Box("frameBottom", parent, color);
        Place(bottom, Vector2.zero, new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, thickness));

        var left = Box("frameLeft", parent, color);
        Place(left, Vector2.zero, new Vector2(0f, 1f), Vector2.zero, new Vector2(thickness, 0f));

        var right = Box("frameRight", parent, color);
        Place(right, new Vector2(1f, 0f), Vector2.one, new Vector2(-thickness, 0f), Vector2.zero);
    }
    public static RectTransform Place(Component component, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
    {
        var rect = component.GetComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = offsetMin;
        rect.offsetMax = offsetMax;
        return rect;
    }
}
