## 1. Controller

- [x] 1.1 Set the map controller `inertia` option to `false`. Verify that `pnpm check` and `pnpm lint` pass.

## 2. Browser verification

- [x] 2.1 In a 390×844 touch viewport, dispatch a fast one-finger swipe and read the URL position 400 ms and 1.6 s after release. Verify that both positions are equal with the change, and that the position still changes after release with `inertia: 500`.
- [x] 2.2 In a 1280×800 desktop viewport, dispatch a fast mouse drag and read the URL position 400 ms and 1.6 s after release. Verify that both positions are equal.
