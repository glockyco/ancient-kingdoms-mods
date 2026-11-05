using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// The screen-space canvases Pocket Compendium draws on, created on first use. Markers and panels
/// sit below the game's interface, so its HUD, windows, menus and tooltips cover them. The
/// settings window sits above it. Panels and windows scale like the game's windows: the game's
/// canvas scale for the screen, times its Scaling UI setting relative to the default. Markers keep
/// a 1920x1080 reference, as the game's names in the world ignore Scaling UI. <see cref="Tooltip"/>
/// keeps a canvas of its own.
/// </summary>
public static class Overlay
{
    public const float ReferenceWidth = 1920f;
    public const float ReferenceHeight = 1080f;

    // The game's interface canvases use sorting orders 0 and 1. Overlay canvases draw after every
    // camera, so a negative order still draws over the world, under the game's interface.
    private const int MarkerOrder = -10;
    private const int PanelOrder = -1;
    private const int WindowOrder = 32760;

    private static Layer _markers;
    private static Layer _panels;
    private static Layer _windows;

    /// <summary>World markers and edge arrows.</summary>
    public static RectTransform Markers => (_markers ??= new Layer("PC_Markers", MarkerOrder, raycasts: false)).Root;

    /// <summary>Movable panels such as the boss list and the skill cards.</summary>
    public static RectTransform Panels => (_panels ??= new Layer("PC_Panels", PanelOrder, raycasts: true)).Root;

    /// <summary>The settings window.</summary>
    public static RectTransform Windows => (_windows ??= new Layer("PC_Windows", WindowOrder, raycasts: true)).Root;

    /// <summary>
    /// Hides the panels and markers while the game's map is open, because the map covers the
    /// whole play area.
    /// </summary>
    public static void Update()
    {
        var map = Il2Cpp.UIMap.singleton;
        bool mapOpen = map != null && map.panel != null && map.panel.activeSelf;
        // Inactive panels also ignore the pointer, so a click on the map never reaches one.
        Show(_panels, !mapOpen);
        Show(_markers, !mapOpen);
        FollowGameScale();
    }

    /// <summary>
    /// The game's Scaling UI setting relative to its default, as the game applies it to its
    /// windows. Panels, windows and hovers multiply their scale by it, so the default keeps their size.
    /// </summary>
    public static float InterfaceFactor { get; private set; } = 1f;

    private static CanvasScaler _gameScaler;
    private static bool _factorMissingLogged;

    private static void FollowGameScale()
    {
        InterfaceFactor = ReadInterfaceFactor();
        if (_gameScaler == null)
        {
            var canvas = GameObject.Find("Canvas");
            _gameScaler = canvas != null ? canvas.GetComponent<CanvasScaler>() : null;
        }

        var reference = _gameScaler != null ? _gameScaler.referenceResolution : new Vector2(ReferenceWidth, ReferenceHeight);
        float match = _gameScaler != null ? _gameScaler.matchWidthOrHeight : 0.5f;
        _panels?.Follow(reference / InterfaceFactor, match);
        _windows?.Follow(reference / InterfaceFactor, match);
    }

    // Source: UISettings.cs:SetScalingUI sets the localScale of every window in scalingUIRects,
    // also while the slider moves and before the value is saved, so a window's scale is the
    // setting as the player sees it.
    private static float ReadInterfaceFactor()
    {
        var settings = Il2Cpp.UISettings.singleton;
        if (settings == null || settings.scalingUIRects == null) return 1f;
        foreach (var rect in settings.scalingUIRects)
            if (rect != null && rect.localScale.x > 0f)
                return rect.localScale.x / Il2Cpp.GameManager.defaultscalingUI;

        if (!_factorMissingLogged)
        {
            _factorMissingLogged = true;
            Log.Warning("No window of the game's Scaling UI setting was found, so the panels keep their own size");
        }
        return 1f;
    }

    private static void Show(Layer layer, bool shown)
    {
        if (layer == null) return;
        var root = layer.Root.gameObject;
        if (root.activeSelf != shown) root.SetActive(shown);
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
        private readonly CanvasScaler _scaler;

        public Layer(string name, int order, bool raycasts)
        {
            _canvas = new GameObject(name);
            Object.DontDestroyOnLoad(_canvas);

            var canvas = _canvas.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.pixelPerfect = false;
            canvas.sortingOrder = order;

            _scaler = _canvas.AddComponent<CanvasScaler>();
            _scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            _scaler.referenceResolution = new Vector2(ReferenceWidth, ReferenceHeight);
            _scaler.matchWidthOrHeight = 0.5f;

            if (raycasts) _canvas.AddComponent<GraphicRaycaster>();

            var root = HudFactory.Rect("root", _canvas.transform).GetComponent<RectTransform>();
            root.anchorMin = Vector2.zero;
            root.anchorMax = Vector2.one;
            root.offsetMin = Vector2.zero;
            root.offsetMax = Vector2.zero;
            Root = root;
        }

        public RectTransform Root { get; }

        public void Follow(Vector2 reference, float match)
        {
            if (_scaler.referenceResolution != reference) _scaler.referenceResolution = reference;
            if (!Mathf.Approximately(_scaler.matchWidthOrHeight, match)) _scaler.matchWidthOrHeight = match;
        }

        public void Destroy()
        {
            if (_canvas != null) Object.Destroy(_canvas);
        }
    }
}
