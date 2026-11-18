using System.Collections.Generic;
using Il2Cpp;
using Il2CppMirror;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.AugmentMarks;

/// <summary>
/// Marks each item that has an augment with the augment's icon, in a frame of the augment's
/// quality colour in the slot's top-right corner. The marks cover the inventory with its
/// equipment slots, the combined backpack, the bank, the house chest and the mercenary's
/// equipment, the places an augmented item can be kept or worn.
/// </summary>
public sealed class AugmentMarksFeature : Feature
{
    // Marks by the slot's icon, so each slot keeps one mark however often its window redraws.
    private readonly Dictionary<int, SlotMark> _marks = new();

    public AugmentMarksFeature()
        : base("AugmentMarks", "Augment marks", "Marks each item that has an augment with the augment's icon.")
    {
    }

    protected internal override void Enable()
    {
    }

    protected internal override void Disable()
    {
        Clear();
        AugmentIcons.Clear();
    }

    // The windows and their slots go with the World scene.
    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName == "World") Clear();
    }

    protected internal override void Update()
    {
        var player = Player.localPlayer;
        if (player == null) return;

        var inventory = UIInventory.singleton;
        if (Open(inventory != null ? inventory.panel : null))
        {
            var content = inventory.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIInventorySlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.inventory.slots);
            }

            var equipment = UIEquipment.singleton;
            if (equipment != null)
            {
                for (int i = 0; i < player.equipment.slots.Count; i++)
                {
                    var slot = equipment.GetEquipmentSlot(i);
                    if (slot != null) Mark(slot.image, slot.dragAndDropable, player.equipment.slots);
                }
            }
        }

        // The backpack's own slots hold backpacks, which take no augment, so only its content counts.
        var backpack = UIBigBackpack.singleton;
        if (Open(backpack != null ? backpack.panel : null))
        {
            var content = backpack.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIInventorySlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.inventory.slots);
            }
        }

        var bank = UIBank.singleton;
        if (Open(bank != null ? bank.panel : null))
        {
            var content = bank.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIBankSlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.bank.slots);
            }
        }

        var chest = UIChest.singleton;
        if (Open(chest != null ? chest.panel : null))
        {
            var content = chest.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIChestSlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.chestHouse.slots);
            }
        }

        // The window also inspects another player's gear, which its inspectedPlayer names.
        var mercenaryWindow = UIEquipmentMercenary.singleton;
        if (Open(mercenaryWindow != null ? mercenaryWindow.panel : null) && mercenaryWindow.inspectedPlayer == null)
        {
            var mercenary = mercenaryWindow.mercenary;
            if (mercenary != null && mercenary.equipment != null)
            {
                for (int i = 0; i < mercenary.equipment.slots.Count; i++)
                {
                    var slot = mercenaryWindow.GetEquipmentSlot(i);
                    if (slot != null) Mark(slot.image, slot.dragAndDropable, mercenary.equipment.slots);
                }
            }
        }
    }

    private static bool Open(GameObject panel) => panel != null && panel.activeInHierarchy;

    // Each window names a slot's drag handle after the index of the item it shows. The combined
    // backpack leaves old names on the slots it no longer uses, so a slot counts only while it
    // draws that item's icon.
    private void Mark(Image icon, UIDragAndDropable drag, SyncList<ItemSlot> items)
    {
        if (icon == null) return;

        AugmentItem augment = null;
        string name = null;
        if (drag != null && int.TryParse(drag.name, out var index) && index >= 0 && index < items.Count && icon.sprite != null)
        {
            var item = items[index];
            if (item.amount > 0 && icon.sprite == item.item.image)
            {
                name = item.augmentName;
                augment = Augment(item, name);
            }
        }

        var key = icon.GetInstanceID();
        _marks.TryGetValue(key, out var mark);
        if (augment == null)
        {
            mark?.Hide();
            return;
        }

        if (mark == null || !mark.Alive)
        {
            mark = new SlotMark(icon.transform.parent);
            _marks[key] = mark;
        }

        mark.Show(augment, name);
    }

    // The slot's name field also holds a pet follower's name and a virtue belonging's details, so
    // it counts only on equipment and only when the game knows it as an augment.
    // Source: ItemSlot.cs:GetAugmentStatsString, FriendlyPetFollowerItem.cs:Use.
    private static AugmentItem Augment(ItemSlot item, string name)
    {
        if (string.IsNullOrEmpty(name) || item.item.data == null || item.item.data.TryCast<EquipmentItem>() == null)
            return null;
        return GameManager.cacheItems.TryGetValue(Il2CppMirror.Extensions.GetStableHashCode(name), out var data) && data != null
            ? data.TryCast<AugmentItem>()
            : null;
    }

    private void Clear()
    {
        foreach (var mark in _marks.Values) mark.Destroy();
        _marks.Clear();
    }
}

/// <summary>A slot's augment icon in a frame of the augment's quality colour.</summary>
internal sealed class SlotMark
{
    // Large enough that a small icon such as the flat Mana Shard reads at a glance.
    private const float Size = 22f;
    private static readonly Color Backing = new(0.05f, 0.06f, 0.08f, 0.9f);

    private readonly RectTransform _root;
    private readonly Image _frame;
    private readonly Image _icon;
    private string _shown;

    public SlotMark(Transform slot)
    {
        _root = HudFactory.Rect("PC_AugmentMark", slot).GetComponent<RectTransform>();
        _root.anchorMin = _root.anchorMax = _root.pivot = new Vector2(1f, 1f);
        _root.anchoredPosition = new Vector2(-1f, -1f);
        _root.sizeDelta = new Vector2(Size, Size);
        _root.SetAsLastSibling();

        _frame = HudFactory.Sliced("frame", _root, Shapes.Rounded, Color.white);
        HudFactory.Stretch(_frame, Vector2.zero, Vector2.zero);
        var backing = HudFactory.Sliced("backing", _root, Shapes.Rounded, Backing);
        HudFactory.Stretch(backing, new Vector2(1.5f, 1.5f), new Vector2(-1.5f, -1.5f));
        _icon = HudFactory.Icon("icon", _root, null);
        HudFactory.Stretch(_icon, new Vector2(2f, 2f), new Vector2(-2f, -2f));
        _root.gameObject.SetActive(false);
    }

    public bool Alive => _root != null;

    public void Show(AugmentItem augment, string name)
    {
        if (!_root.gameObject.activeSelf) _root.gameObject.SetActive(true);
        if (_shown == name) return;
        _shown = name;
        _frame.color = QualityColor(augment.quality);
        var icon = AugmentIcons.Visible(augment.image);
        _icon.sprite = icon;
        _icon.enabled = icon != null;
    }

    public void Hide()
    {
        if (_root != null && _root.gameObject.activeSelf) _root.gameObject.SetActive(false);
    }

    public void Destroy()
    {
        if (_root != null) Object.Destroy(_root.gameObject);
    }

    // The colours the game's tooltip gives an item's icon border by quality.
    // Source: UIShowToolTip.cs:GetItemQualityColor.
    private static Color QualityColor(int quality) => quality switch
    {
        1 => new Color32(0x1E, 0xFF, 0x00, 0xFF),
        2 => new Color32(0x00, 0x70, 0xDD, 0xFF),
        3 => new Color32(0xA3, 0x35, 0xEE, 0xFF),
        4 => new Color32(0xE0, 0x8D, 0x3F, 0xFF),
        5 => new Color32(0x7F, 0xDB, 0xFF, 0xFF),
        _ => new Color32(0x8C, 0x8C, 0x8C, 0xFF),
    };
}

/// <summary>
/// Augment icons cut to their visible pixels, so a flat icon with wide transparent padding fills
/// the mark like the others. The game's icon textures are not readable, so each is copied once
/// through the GPU and its cut sprite kept for the session.
/// </summary>
internal static class AugmentIcons
{
    // Alpha at or below this counts as padding.
    private const byte Transparent = 8;

    private static readonly Dictionary<int, Sprite> Cut = new();

    public static Sprite Visible(Sprite sprite)
    {
        if (sprite == null) return null;
        var key = sprite.GetInstanceID();
        if (Cut.TryGetValue(key, out var cut) && cut != null) return cut;
        cut = Trim(sprite);
        Cut[key] = cut;
        return cut;
    }

    public static void Clear()
    {
        // An icon without padding maps to the game's own sprite, which stays.
        foreach (var pair in Cut)
            if (pair.Value != null && pair.Value.GetInstanceID() != pair.Key) Object.Destroy(pair.Value);
        Cut.Clear();
    }

    private static Sprite Trim(Sprite sprite)
    {
        var texture = sprite.texture;
        var rect = sprite.textureRect;
        int width = (int)rect.width, height = (int)rect.height;

        var target = RenderTexture.GetTemporary(texture.width, texture.height, 0, RenderTextureFormat.ARGB32);
        var previous = RenderTexture.active;
        var copy = new Texture2D(width, height, TextureFormat.RGBA32, false);
        try
        {
            Graphics.Blit(texture, target);
            RenderTexture.active = target;
            copy.ReadPixels(new Rect(rect.x, rect.y, width, height), 0, 0);
            copy.Apply();
        }
        finally
        {
            RenderTexture.active = previous;
            RenderTexture.ReleaseTemporary(target);
        }

        var pixels = copy.GetPixels32();
        Object.Destroy(copy);
        int minX = width, minY = height, maxX = -1, maxY = -1;
        for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++)
        {
            if (pixels[y * width + x].a <= Transparent) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        // A blank icon, or one that has no padding, stays as it is.
        if (maxX < 0 || (minX == 0 && minY == 0 && maxX == width - 1 && maxY == height - 1)) return sprite;
        var visible = new Rect(rect.x + minX, rect.y + minY, maxX - minX + 1, maxY - minY + 1);
        return Sprite.Create(texture, visible, new Vector2(0.5f, 0.5f), sprite.pixelsPerUnit);
    }
}
