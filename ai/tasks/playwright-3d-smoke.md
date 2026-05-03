# Playwright 3D smoke tooling

## 1. Goal

Add a browser automation path that can fully test PoseFlow 3D viewport controls, including real right-button orbit and middle-button pan gestures.

## 2. Current-state probe

- `git status --short`: only Browser Use calibration docs were dirty before this tooling task.
- `STATUS.md`: Browser Use works for screenshots, wheel zoom, and camera preset clicks, but cannot hold right/middle buttons through drag.
- `package.json`: no Playwright dependency or smoke script existed.
- `Canvas3D`: OrbitControls mapping is `LEFT: undefined`, `MIDDLE: PAN`, `RIGHT: ROTATE`.

## 3. Scope

In:
- Install Playwright test tooling.
- Add a dedicated Playwright config and smoke spec.
- Verify wheel zoom, right-button orbit, and middle-button pan against the real local app.
- Document how to run it.

Out:
- No app UX changes.
- No replacement for manual subjective gizmo direction checks.
- No broad e2e suite yet.

## 4. Result

- Added `@playwright/test`.
- Added `poseflow/playwright.config.ts`.
- Added `poseflow/e2e/poseflow-3d-smoke.spec.ts`.
- Added scripts:
  - `npm run smoke:browser`
  - `npm run smoke:browser:headed`
- Installed Chromium runtime with `npx playwright install chromium`.
- Smoke passed: wheel zoom, right-button orbit, and middle-button pan all changed the canvas screenshot.

## 5. Notes

The first attempt used Browser Use-calibrated absolute coordinates and failed because a fresh Playwright context had the sidebar expanded, shifting the canvas. The smoke now computes gesture coordinates from `canvas.boundingBox()`.
