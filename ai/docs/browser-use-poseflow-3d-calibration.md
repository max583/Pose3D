# Browser Use PoseFlow 3D calibration

This note records the calibrated Browser Use gestures for PoseFlow's in-app browser viewport.

Use it before visual smoke checks so the camera does not need to be recalibrated by trial and error.

For full automated 3D mouse control, including right-button orbit and middle-button pan, use Playwright instead: [`playwright-poseflow-3d-smoke.md`](./playwright-poseflow-3d-smoke.md).

## Environment

- Browser Use backend: `iab` through `node_repl`.
- Working Node after 2026-05-03 setup: system Node `v25.9.0`.
- Local app URL: `http://127.0.0.1:5173/`.
- Focus/test URL: `http://127.0.0.1:5173/?focus=1` hides app panels while keeping the 3D canvas and in-scene gizmos available.
- `tab.goto("http://127.0.0.1:5173/")` may report a navigation timeout even when the tab actually navigates. After `goto`, verify with `await tab.url()`, `await tab.title()`, and a screenshot.

## Viewport Coordinates

Observed screenshot size: `599 x 909`.

Safe regions:

- Canvas starts around `x=27`, `y=52`.
- Bottom status bar starts around `y=880`.
- Collapsed left toolbar occupies roughly `x=0..27`.
- Camera preset panel occupies roughly `x=411..589`, `y=63..281`.
- Good neutral canvas focus / zoom point: `x=315`, `y=470`.
- Good empty-grid drag start point: `x=150`, `y=520`, but see drag warning below.

Avoid starting gestures over:

- Camera panel: `x=411..589`, `y=63..281`.
- Bottom label: around `x=37..245`, `y=838..870`.
- The skeleton or active gizmos, unless intentionally testing a gizmo.

## Camera Preset Buttons

For the current 600px-wide app window, use these approximate button centers:

- Top: `x=500`, `y=163`.
- Left view: `x=448`, `y=163`.
- Right view: `x=552`, `y=163`.
- Up view: `x=500`, `y=119`.
- Down view: `x=500`, `y=207`.
- Diagonals:
  - `x=448`, `y=119`
  - `x=552`, `y=119`
  - `x=448`, `y=207`
  - `x=552`, `y=207`
- Camera reset button: `x=506`, `y=252`.

The camera buttons are more reliable than trying to orbit with Browser Use drag.

## Zoom

Use repeated small wheel events; large one-shot scrolls are less predictable.

Zoom in to inspect knees from the default/top-ish view:

```js
for (let i = 0; i < 18; i++) {
  await tab.cua.scroll({ x: 315, y: 470, scrollY: -120, scrollX: 0 });
}
```

Zoom out by reversing the sign:

```js
for (let i = 0; i < 18; i++) {
  await tab.cua.scroll({ x: 315, y: 470, scrollY: 120, scrollX: 0 });
}
```

Notes:

- A single `scrollY: -650` only zoomed slightly.
- A single `scrollY: -2200` was still weaker than repeated small wheel steps.
- Repeated `18 x -120` brought the knees and feet into a useful inspection scale.

## Orbit / Drag

PoseFlow mouse mapping:

- Left mouse button: selection and gizmo manipulation.
- Middle mouse button: camera pan.
- Right mouse button: camera orbit/rotation.

Current Browser Use finding: `tab.cua.drag(...)` does not expose a mouse button parameter and behaves like a left-button drag. Therefore it should not be used as an OrbitControls camera gesture in PoseFlow: left drag is intentionally not bound to camera pan/orbit.

Retested 2026-05-03 with button priming:

- Right click (`button: 3`) followed by `tab.cua.drag(...)` did not orbit the camera.
- Middle click (`button: 2`) followed by `tab.cua.drag(...)` did not pan the camera.

Conclusion: Browser Use can click with middle/right buttons, but it cannot currently hold those buttons through a drag gesture in the exposed API.

Tested gestures that produced no visible orbit change:

```js
await tab.cua.drag({
  path: [
    { x: 150, y: 520 },
    { x: 185, y: 520 },
    { x: 220, y: 520 },
    { x: 255, y: 520 },
    { x: 290, y: 520 },
  ],
});
```

and:

```js
await tab.cua.click({ x: 310, y: 500, button: 1 });
await tab.cua.drag({
  path: [
    { x: 120, y: 610 },
    { x: 180, y: 585 },
    { x: 250, y: 560 },
    { x: 330, y: 535 },
    { x: 410, y: 510 },
  ],
});
```

Prefer camera preset buttons for view changes. Use wheel scroll for zoom. Use CUA drag primarily for explicit left-button gizmo/manual interaction tests, and confirm with screenshots after each gesture. For right-button orbit or middle-button pan checks, use manual testing unless Browser Use gains a buttoned-drag API.

## Recommended Smoke Recipe

1. Confirm the app tab:

```js
nodeRepl.write(JSON.stringify({
  url: await tab.url(),
  title: await tab.title(),
}, null, 2));
```

2. Take a screenshot before interacting.

3. For close inspection of knees/feet:

```js
await tab.cua.click({ x: 315, y: 470, button: 1 });
for (let i = 0; i < 18; i++) {
  await tab.cua.scroll({ x: 315, y: 470, scrollY: -120, scrollX: 0 });
}
```

4. Use camera buttons for side/front/top changes.

5. Take a fresh screenshot after every camera/zoom gesture and compare visually.

6. When done, return to a known view with the `Top` button (`x=500`, `y=163`) or camera reset (`x=506`, `y=252`).

## Gizmo Calibration

Use this section when testing actual skeleton gizmos with Browser Use. It was calibrated on 2026-05-03 in the in-app browser at roughly `599 x 909`.

Important rule: Browser Use left-drag can manipulate gizmos, but it is easy to miss small joints. First select the body element in normal mode and confirm the bottom overlay label, then switch to F11 focus mode for the drag.

### Stable Setup

1. Open `http://127.0.0.1:5173/`.
2. If focus mode is active, press F11 once to return to normal mode.
3. Use the camera panel:
   - Front View: `x=500`, `y=207`.
   - 3/4 Front Right: `x=552`, `y=207`.
   - Reset Camera: `x=506`, `y=252` only for perspective checks; do not use it as the default gizmo-selection view.
4. For most joint selection, use Front View, not Top View. Top collapses the body vertically and makes spine/head/leg selection ambiguous.
5. After selecting the element, verify `.selected-element-info` or the visible bottom overlay. Then press F11 for a clean drag viewport.

### Front View Selection Points

These points are for normal mode after clicking Front View (`x=500`, `y=207`). The camera panel is visible, the left sidebar is collapsed, and the bottom overlay is visible.

| Element to show | Click point | Verified overlay |
| --- | ---: | --- |
| Spine gizmo | `x=313, y=219` | `Позвоночник` |
| Neck gizmo | `x=313, y=180` | `Шея` |
| Shoulder, viewer-left joint | `x=280, y=228` | `Левое плечо` |
| Shoulder, viewer-right joint | `x=346, y=228` | `Правое плечо` |
| Arm, viewer-left elbow/wrist | `x=228, y=228` | `Левая рука` |
| Arm, viewer-right elbow/wrist | `x=399, y=228` | `Правая рука` |
| Pelvis/root gizmo | `x=313, y=314` | `Таз` |
| Leg, viewer-left knee | `x=287, y=396` | `Левая нога` |
| Leg, viewer-right knee | `x=340, y=396` | `Правая нога` |
| Foot, viewer-left toes/heel | `x=270..287, y=469..470` or `x=280, y=458` | `Левая стопа` |
| Foot, viewer-right toes/heel | `x=356, y=470` | `Правая стопа` |

Side naming note: the overlay is the source of truth. Do not infer right/left from screen side when the view may be front/back/3/4; user-facing right/left still means the mannequin side.

### Head Selection

Head points are too small in straight Front View. Use 3/4 Front Right (`x=552`, `y=207`) first.

Verified Head click points in 3/4 Front Right:

- `x=293, y=192`
- `x=319, y=205`

Expected overlay: `Голова`.

For Neck, Front View `x=313, y=180` is more reliable than 3/4.

### Zoom Before Drag

Zoom is useful for enlarging the active gizmo after selection. Use small repeated wheel steps, not a single huge wheel:

```js
for (let i = 0; i < 8; i++) {
  await tab.cua.scroll({ x: 315, y: 470, scrollY: -120, scrollX: 0 });
}
```

Suggested zoom anchors:

- Head/neck/shoulders: `x=313, y=180..230`.
- Pelvis/root: `x=313, y=314`.
- Knees/feet: `x=313, y=430..470`.

If the target drifts out of frame, return to normal mode, click Front View again, reselect the element, then enter F11. Browser Use cannot reliably middle-drag pan the camera.

### Drag Recipe

After the element is selected and F11 focus mode is active:

1. Take a screenshot.
2. Drag a visible cyan gizmo handle, not the joint itself.
3. Take another screenshot and compare. A changed screenshot means the left-button gizmo drag worked.
4. Immediately undo any calibration movement:

```js
await tab.cua.keypress({ keys: ['CTRL', 'Z'] });
```

Known working Browser Use left-drag examples:

```js
// Right foot roll/yaw area in normal mode, after selecting right foot.
await tab.cua.drag({
  path: [
    { x: 354, y: 470 },
    { x: 372, y: 455 },
    { x: 390, y: 445 },
    { x: 405, y: 438 },
  ],
});
```

```js
// Same right-foot gizmo after switching to F11 focus mode.
await tab.cua.drag({
  path: [
    { x: 343, y: 452 },
    { x: 365, y: 438 },
    { x: 386, y: 429 },
    { x: 405, y: 425 },
  ],
});
```

Both produced a visible screenshot change during calibration. Use these as proof that Browser Use can test left-button gizmos; for new gizmos, always recalibrate the handle start point from the visible cyan handle.

### Browser Use Limits

- Reliable: selecting joints, clicking camera preset buttons, wheel zoom, left-button gizmo drag, screenshots.
- Unreliable: camera orbit and pan via Browser Use drag, because `tab.cua.drag(...)` has no button parameter and behaves as left-drag.
- Use Playwright for right-button orbit and middle-button pan.
