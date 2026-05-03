# Playwright PoseFlow 3D smoke

Use this when Browser Use is not enough for camera or gizmo interaction checks.

Browser Use is still useful for quick screenshots and UI clicks. Playwright is the stronger tool for the 3D viewport because it exposes real mouse button down/move/up gestures.

## Commands

From `poseflow/`:

```powershell
npm run smoke:browser
```

For visible debugging:

```powershell
npm run smoke:browser:headed
```

The Playwright config starts or reuses Vite at `http://127.0.0.1:5173`.

The smoke opens the viewport at `/?focus=1`. Focus mode hides app panels and keeps the canvas clean for automated gestures. F11 toggles the same mode in manual testing.

## What The Smoke Checks

`e2e/poseflow-3d-smoke.spec.ts` verifies:

- the app opens with title `PoseFlow Editor`;
- `/?focus=1` hides header/sidebar/status/camera overlay controls;
- F11 toggles focus mode and restores the previous panel state;
- a `canvas` is visible;
- mouse wheel zoom changes the canvas;
- right-button drag changes the canvas, covering camera orbit;
- middle-button drag changes the canvas, covering camera pan.

Artifacts are written under Playwright `test-results/` and ignored by Git.

## Important Calibration

Do not use fixed Browser Use viewport coordinates in Playwright specs. A fresh Playwright browser may have a different UI state, for example the left sidebar may be expanded. Always compute 3D gesture coordinates from:

```ts
const box = await page.locator('canvas').boundingBox();
```

Then pick points inside that box. This keeps gestures on the canvas instead of accidentally hitting the sidebar or overlay UI.

## Mouse Mapping

PoseFlow camera mapping:

- left mouse button: selection and gizmos;
- middle mouse button: camera pan;
- right mouse button: camera orbit/rotation;
- wheel: zoom.

Playwright supports the required low-level gestures:

```ts
await page.mouse.move(startX, startY);
await page.mouse.down({ button: 'right' });
await page.mouse.move(endX, endY, { steps: 14 });
await page.mouse.up({ button: 'right' });
```

Use `button: 'middle'` for camera pan.

## Next Extension

For full gizmo regression checks, add focused specs that:

- use camera preset buttons or known camera state first;
- select one joint/gizmo;
- use left-button drag on the gizmo handle;
- compare the before/after canvas and, where possible, inspect app state through service-visible UI or exported pose data.

Use [`browser-use-poseflow-3d-calibration.md`](./browser-use-poseflow-3d-calibration.md) as the manual coordinate reference for first-pass gizmo selection points. In Playwright specs, convert those ideas to canvas-relative coordinates instead of copying absolute Browser Use screen points.
