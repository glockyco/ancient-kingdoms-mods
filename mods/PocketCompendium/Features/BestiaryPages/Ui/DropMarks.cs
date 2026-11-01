using Il2Cpp;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// The marks on a Bestiary drop slot, as chosen on Verdant Glacius: the chance per kill along the
/// bottom, the zone's Fatecharm in the top-left corner when it raises the chance, and a gold check
/// in the top-right corner for a drop this character has found.
/// </summary>
internal static class DropMarks
{
    private const string Shade = "PC_ChanceShade";
    private const string Chance = "PC_Chance";
    private const string Fatecharm = "PC_Fatecharm";
    private const string Found = "PC_Found";

    public static void Apply(UIBestiaryLoot slot, string chance, Sprite fatecharm, bool found)
    {
        var parent = slot.transform;

        var shade = Ensure(parent, Shade, () =>
        {
            var image = HudFactory.Box(Shade, parent, new Color(0f, 0f, 0f, 0.85f));
            image.sprite = Shapes.Shade;
            image.raycastTarget = false;
            Bottom(image.rectTransform, 24f);
            return image.gameObject;
        });
        var label = Ensure(parent, Chance, () =>
        {
            var text = HudFactory.Label(Chance, parent, 12f, Theme.Text, Align.Center, bold: true);
            // The line is taller than the strip, and an ellipsis would hide the whole number.
            text.Text.overflowMode = Il2CppTMPro.TextOverflowModes.Overflow;
            text.Text.raycastTarget = false;
            Bottom(text.Rect, 16f);
            return text.Go;
        });
        shade.SetActive(chance != null);
        label.SetActive(chance != null);
        if (chance != null) label.GetComponent<Il2CppTMPro.TextMeshProUGUI>().text = chance;

        var fate = Ensure(parent, Fatecharm, () =>
        {
            var icon = HudFactory.Icon(Fatecharm, parent, null);
            icon.raycastTarget = false;
            Corner(icon.rectTransform, new Vector2(0f, 1f), new Vector2(1f, -1f), 18f);
            return icon.gameObject;
        });
        fate.SetActive(fatecharm != null);
        if (fatecharm != null)
        {
            var image = fate.GetComponent<Image>();
            image.sprite = fatecharm;
            image.enabled = true;
        }

        var check = Ensure(parent, Found, () =>
        {
            var disc = HudFactory.Tinted(Found, parent, Shapes.Disc, Theme.Ready);
            disc.raycastTarget = false;
            Corner(disc.rectTransform, new Vector2(1f, 1f), new Vector2(-2f, -2f), 14f);
            var mark = HudFactory.Icon("check", disc.transform, Icons.Check);
            mark.color = new Color(0.08f, 0.06f, 0.02f, 1f);
            mark.raycastTarget = false;
            HudFactory.Stretch(mark.rectTransform, new Vector2(2f, 2f), new Vector2(-2f, -2f));
            return disc.gameObject;
        });
        check.SetActive(found);

        // The slot's own art is scaled with the cell. The marks are sized for the slot itself.
        foreach (var mark in new[] { shade, label, fate, check })
        {
            mark.transform.localScale = Vector3.one;
            mark.transform.SetAsLastSibling();
        }
    }

    public static void Clear(UIBestiaryLoot slot) => Apply(slot, null, null, false);

    private static GameObject Ensure(Transform parent, string name, System.Func<GameObject> create)
    {
        var existing = parent.Find(name);
        return existing != null ? existing.gameObject : create();
    }

    private static void Bottom(RectTransform rect, float height)
    {
        rect.anchorMin = new Vector2(0f, 0f);
        rect.anchorMax = new Vector2(1f, 0f);
        rect.pivot = new Vector2(0.5f, 0f);
        rect.anchoredPosition = new Vector2(0f, 2f);
        rect.sizeDelta = new Vector2(-4f, height);
    }

    private static void Corner(RectTransform rect, Vector2 anchor, Vector2 offset, float size)
    {
        rect.anchorMin = rect.anchorMax = rect.pivot = anchor;
        rect.anchoredPosition = offset;
        rect.sizeDelta = new Vector2(size, size);
    }
}
