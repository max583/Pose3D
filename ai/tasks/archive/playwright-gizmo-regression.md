# Playwright Gizmo Regression

Date: 2026-05-04

## Current-State Probe

- `git status --short`: clean.
- `STATUS.md`: Focus/Test Mode and Browser Use gizmo calibration are documented.
- `PLAN.md`: controller/gizmo changes must use calculated mechanics and regression checks where possible.
- Existing Playwright smoke covers focus mode, camera wheel zoom, right-button orbit, and middle-button pan.

## Goal

Add first browser-level regression checks for actual left-button gizmo manipulation.

## Boundaries

- Do not change controller behavior.
- Do not try to cover every gizmo in this first pass.
- Use screenshots and visible overlay checks; no app internals.

## Touched Files

- `poseflow/e2e/poseflow-gizmo-regression.spec.ts`
- `ai/docs/playwright-poseflow-3d-smoke.md`
- `CHANGELOG.md`
- `STATUS.md`

## Acceptance Criteria

- Playwright selects a body element in normal mode and verifies the selection overlay.
- Playwright switches to F11 focus mode, left-drags a visible gizmo handle, and verifies the canvas changes.
- Playwright uses Ctrl+Z and verifies the canvas changes again.
- Initial coverage includes at least FootController and PelvisController/root gizmo.

## Tests

- `npm run smoke:browser`
- `npm run typecheck`
- `npm run lint:unused`
- `npm run verify`

## Follow-Up

- Browser smoke should use `npm run dev:web` so Playwright does not start Electron or Python backend.
- After smoke, port `8000` should stay free unless the user explicitly started backend/Electron.
