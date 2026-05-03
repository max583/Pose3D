# Unified gizmo sensitivity

## 1. Goal

Add shared user settings for gizmo drag sensitivity and gizmo hit-zone scale.

Why: current gizmo constants are tuned per controller, but there is no single place to make all gizmo controls faster/slower or easier/harder to hit.

## 2. Current-State Probe

- `git status --short`: existing uncommitted Playwright/backend lifecycle docs and test changes are present from the previous task.
- `STATUS.md` / `PLAN.md` / `AGENTS.md`: project is in post-Stage 7 controller cleanup, with follow-up plans for shared gizmo settings.
- Code checked:
  - `poseflow/src/lib/appSettings.ts`
  - `poseflow/src/context/AppSettingsContext.tsx`
  - `poseflow/src/components/SettingsModal.tsx`
  - `poseflow/src/components/controllers/*Controller.tsx`
  - `poseflow/src/lib/__tests__/appSettings.test.ts`

## 3. Boundaries

In scope:

- Add two app settings:
  - `gizmoDragSensitivity`: shared multiplier for gizmo mouse drag response.
  - `gizmoHitZoneScale`: shared multiplier for invisible hit zones.
- Keep existing per-controller base constants as the calibrated defaults.
- Expose both settings in the Settings modal.
- Add unit tests for settings load/sanitize logic.

Out of scope:

- Re-tune individual gizmo direction signs.
- Change gizmo geometry placement, axes, colors, or Stage behavior.
- Add a full settings redesign.

## 4. Mechanics

- Pivot/axis/motion plane are unchanged per controller.
- Direction signs are unchanged; only the final drag delta is multiplied.
- Hit geometry is scaled by multiplying hidden sphere/cylinder/torus radii/tube sizes.
- Right/left convention remains mannequin-relative.

## 5. Acceptance Criteria

- [x] Defaults preserve current behavior (`1.00x` multipliers).
- [x] Settings survive localStorage and clamp invalid/out-of-range values.
- [x] All arrow/ring gizmo hit zones use the shared hit-zone multiplier where they already have explicit invisible hit geometry.
- [x] Drag sensitivity applies to gizmo rotation/bend arrows/rings where the controller computes a mouse delta.
- [x] `npm run typecheck`, focused tests, and final verification pass.

## 6. Result

Changed files for this task:

- `poseflow/src/lib/appSettings.ts`
- `poseflow/src/lib/__tests__/appSettings.test.ts`
- `poseflow/src/components/SettingsModal.tsx`
- `poseflow/src/hooks/useCameraPlaneWorldDrag.ts`
- `poseflow/src/components/controllers/*Controller.tsx`
- `CHANGELOG.md`
- `STATUS.md`

Checks:

- `npx vitest run --config vitest.config.ts src/lib/__tests__/appSettings.test.ts` passed.
- `npm run typecheck` passed.
- `npm run lint:unused` passed.
- `npm run smoke:browser` passed, 5 Playwright tests.
- `npm run verify` passed, 231 unit tests + Vite/Electron build.
