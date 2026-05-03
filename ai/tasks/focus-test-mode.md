# Focus/Test Mode

Date: 2026-05-03

## Current-State Probe

- App panels are controlled in `poseflow/src/App.tsx`.
- Viewport overlays and camera panel are rendered by `poseflow/src/components/Canvas3D.tsx`.
- Playwright smoke already validates real wheel/right/middle mouse gestures.

## Goal

Make F11 useful for focused manual and automated 3D testing: keep the native window/fullscreen behavior, and hide app panels while focus mode is active.

## Boundaries

- Do not change OrbitControls mouse mapping.
- Do not hide in-scene skeleton controllers or gizmos.
- Do not persist focus mode into sidebar localStorage.

## Touched Files

- `poseflow/src/App.tsx`
- `poseflow/src/components/Canvas3D.tsx`
- `poseflow/e2e/poseflow-3d-smoke.spec.ts`
- `ai/docs/playwright-poseflow-3d-smoke.md`
- `ai/docs/browser-use-poseflow-3d-calibration.md`
- `CHANGELOG.md`
- `STATUS.md`

## Acceptance Criteria

- `F11` toggles focus mode.
- `/?focus=1` opens directly in focus mode for automation.
- Header, sidebar, restore strip, status bar, camera controls, mini-view, viewport info overlay, and export frame UI are hidden in focus mode.
- 3D canvas and in-scene gizmos remain available.
- Playwright smoke covers `/?focus=1`, F11 toggle, wheel zoom, right-button orbit, and middle-button pan.

## Tests

- `npm run typecheck`
- `npm run lint:unused`
- `npm run smoke:browser`
- `npm run verify`
