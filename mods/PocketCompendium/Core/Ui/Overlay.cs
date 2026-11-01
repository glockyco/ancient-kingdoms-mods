using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// The screen-space canvases Pocket Compendium draws on, created on first use. Markers sit below
/// the game's interface so its windows cover them, panels and the settings window sit above it.
/// Every layer scales with the screen against a 1920x1080 reference, like the game's own HUD.
/// </summary>
public static class Overlay
{
    public const float ReferenceWidth = 1920f;
    public const float ReferenceHeight = 1080f;

    // The game's interface canvases use sorting orders 0 and 1. Overlay canvases draw after every
    // camera, so a negative order still draws over the world, under the game's interface.
    private const int MarkerOrder = -10;
    private const int PanelOrder = 32700;
    private const int TooltipOrder = 32730;
    private const int WindowOrder = 32760;

    private static Layer _markers;
    private static Layer _panels;
    private static Layer _windows;
    private static GameObject _raisedTooltip;

    /// <summary>World markers and edge arrows.</summary>
    public static RectTransform Markers => (_markers ??= new Layer("PC_Markers", MarkerOrder, raycasts: false)).Root;

    /// <summary>Movable panels such as the boss list and the skill cards.</summary>
    public static RectTransform Panels => (_panels ??= new Layer("PC_Panels", PanelOrder, raycasts: true)).Root;

    /// <summary>The settings window.</summary>
    public static RectTransform Windows => (_windows ??= new Layer("PC_Windows", WindowOrder, raycasts: true)).Root;

    /// <summary>
    /// Lifts the game's tooltip above the panels, because the game shows a panel's tooltips beside
    /// the hovered control, often over the panel itself. Hides the panels while the game's map is
    /// open, because the map covers the whole play area.
    /// </summary>
    public static void Update()
    {
        if (_panels != null)
        {
            var map = Il2Cpp.UIMap.singleton;
            bool mapOpen = map != null && map.panel != null && map.panel.activeSelf;
            // Inactive panels also ignore the pointer, so a click on the map never reaches one.
            var root = _panels.Root.gameObject;
            if (root.activeSelf == mapOpen) root.SetActive(!mapOpen);
        }

        var shortcuts = Il2Cpp.UIShortcuts.singleton;
        var tooltip = shortcuts != null ? shortcuts.toolTip : null;
        if (tooltip == null || tooltip == _raisedTooltip) return;

        var tooltipCanvas = tooltip.GetComponent<Canvas>();
        if (tooltipCanvas == null) tooltipCanvas = tooltip.AddComponent<Canvas>();
        tooltipCanvas.overrideSorting = true;
        tooltipCanvas.sortingOrder = TooltipOrder;
        _raisedTooltip = tooltip;
    }

    /// <summary>Screen pixels per canvas unit on the panel layer.</summary>
    public static float PanelScale
    {
        get
        {
            var canvas = Panels.GetComponentInParent<Canvas>();
            float scale = canvas != null ? canvas.scaleFactor : 1f;
            return scale > 0f ? scale : 1f;
        }
    }

    /// <summary>The visible area of a layer in canvas units, origin at the screen centre.</summary>
    public static Vector2 CanvasSize => new(Screen.width / PanelScale, Screen.height / PanelScale);

    public static void Dispose()
    {
        _markers?.Destroy();
        _panels?.Destroy();
        _windows?.Destroy();
        _markers = null;
        _panels = null;
        _windows = null;
    }

    private sealed class Layer
    {
        private readonly GameObject _canvas;

        public Layer(string name, int order, bool raycasts)
        {
            _canvas = new GameObject(name);
            Object.DontDestroyOnLoad(_canvas);

            var canvas = _canvas.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.pixelPerfect = false;
            canvas.sortingOrder = order;

            var scaler = _canvas.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(ReferenceWidth, ReferenceHeight);
            scaler.matchWidthOrHeight = 0.5f;

            if (raycasts) _canvas.AddComponent<GraphicRaycaster>();

            var root = HudFactory.Rect("root", _canvas.transform).GetComponent<RectTransform>();
            root.anchorMin = Vector2.zero;
            root.anchorMax = Vector2.one;
            root.offsetMin = Vector2.zero;
            root.offsetMax = Vector2.zero;
            Root = root;
        }

        public RectTransform Root { get; }

        public void Destroy()
        {
            if (_canvas != null) Object.Destroy(_canvas);
        }
    }
}
