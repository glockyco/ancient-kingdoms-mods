#nullable disable
using System;
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using MelonLoader;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace HotReplCommands.Commands
{
    /// <summary>
    /// Hovers or clicks a point through the game's Input System, which the game's interface and
    /// Pocket Compendium read, so a screenshot can show a hover. The pointer is set every frame of
    /// the hold, because the real cursor's next event would replace a single change. A click sends
    /// whole-device states, because a click check reads the button's press in that frame.
    /// </summary>
    public sealed class UiPointerCommand : IControlCommandHandler<UiPointerArgs, UiPointerResult>
    {
        // Longer than the game's and Pocket Compendium's tooltip delays.
        private const float SettleSeconds = 0.8f;
        private const float ReleaseSeconds = 0.1f;

        private static int _hold;

        public string Name => "ui.pointer";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<UiPointerResult>> ExecuteAsync(
            ControlCommandContext<UiPointerResult> context, UiPointerArgs args, CancellationToken cancellationToken)
        {
            string action = args?.Action ?? "hover";
            if (action != "hover" && action != "click")
                return Done(context.ValidationFailed("action", "action must be \"hover\" or \"click\"."));
            if (args.HoldSeconds < SettleSeconds || args.HoldSeconds > 120f)
                return Done(context.ValidationFailed("holdSeconds", $"holdSeconds must be between {SettleSeconds} and 120."));
            if (Mouse.current == null)
                return Done(context.ValidationFailed("noMouse", "The game has no Input System mouse."));

            Vector2 point;
            if (!string.IsNullOrEmpty(args.Path))
            {
                var target = GameObject.Find(args.Path);
                if (target == null)
                    return Done(context.ValidationFailed("pathNotFound", $"No active GameObject at '{args.Path}'."));
                point = ScreenPoint(target);
            }
            else if (args.X.HasValue && args.Y.HasValue)
            {
                point = new Vector2(args.X.Value, args.Y.Value);
            }
            else
            {
                return Done(context.ValidationFailed("target", "Give a path, or x and y."));
            }

            var completion = new TaskCompletionSource<ControlCommandResult<UiPointerResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(Run(context, point, action == "click", args.HoldSeconds, ++_hold, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<UiPointerResult>>(completion.Task);
        }

        private static IEnumerator Run(ControlCommandContext<UiPointerResult> context, Vector2 point, bool click, float hold,
            int id, CancellationToken cancellationToken, TaskCompletionSource<ControlCommandResult<UiPointerResult>> completion)
        {
            float start = Time.unscaledTime;
            bool clicked = false;
            bool reported = false;
            while (_hold == id && Time.unscaledTime - start < hold)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    completion.TrySetCanceled(cancellationToken);
                    yield break;
                }

                try
                {
                    float elapsed = Time.unscaledTime - start;
                    if (click && !clicked && elapsed >= SettleSeconds / 2f)
                    {
                        Send(point, true);
                        clicked = true;
                    }
                    else if (clicked && elapsed >= SettleSeconds / 2f + ReleaseSeconds)
                    {
                        Send(point, false);
                    }
                    else
                    {
                        InputState.Change(Mouse.current.position, point);
                    }

                    if (!reported && elapsed >= SettleSeconds)
                    {
                        reported = true;
                        completion.TrySetResult(context.Ok(new UiPointerResult
                        {
                            X = point.x,
                            Y = point.y,
                            TopElement = TopElement(point),
                            Clicked = clicked,
                            HeldFor = Mathf.Max(0f, hold - elapsed),
                        }));
                    }
                }
                catch (Exception exception)
                {
                    completion.TrySetException(exception);
                    yield break;
                }

                yield return null;
            }

            // A later call took over before this one settled.
            completion.TrySetResult(context.Ok(new UiPointerResult { X = point.x, Y = point.y, Clicked = clicked }));
        }

        private static void Send(Vector2 point, bool down)
        {
            var state = new MouseState { position = point };
            if (down) state = state.WithButton(MouseButton.Left, true);
            InputSystem.QueueStateEvent(Mouse.current, state);
        }

        // GetWorldCorners writes nothing into a managed array through Il2Cpp, so the centre comes
        // from TransformPoint.
        private static Vector2 ScreenPoint(GameObject target)
        {
            var rect = target.GetComponent<RectTransform>();
            var canvas = rect != null ? target.GetComponentInParent<Canvas>() : null;
            if (canvas != null)
            {
                var root = canvas.rootCanvas;
                var camera = root.renderMode == RenderMode.ScreenSpaceOverlay ? null : root.worldCamera;
                return RectTransformUtility.WorldToScreenPoint(camera, rect.TransformPoint(rect.rect.center));
            }

            var main = Camera.main;
            return main != null ? (Vector2)main.WorldToScreenPoint(target.transform.position) : Vector2.zero;
        }

        private static string TopElement(Vector2 point)
        {
            var system = EventSystem.current;
            if (system == null) return null;
            var data = new PointerEventData(system) { position = point };
            var hits = new Il2CppSystem.Collections.Generic.List<RaycastResult>();
            system.RaycastAll(data, hits);
            return hits.Count > 0 ? hits[0].gameObject.name : null;
        }

        private static ValueTask<ControlCommandResult<UiPointerResult>> Done(ControlCommandResult<UiPointerResult> result) =>
            new(result);
    }
}
