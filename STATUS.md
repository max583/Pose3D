# PoseFlow - Current Status

Last compacted: 2026-05-06.

This file is intentionally short. Long history was archived in `archive/STATUS-before-doc-cleanup-2026-05-06.md`.

## Product State

PoseFlow Editor is an offline desktop 3D pose editor for OpenPose BODY_25 poses.

Implemented:

- Base BODY_25 editor, presets, camera controls, PNG/JSON export, export frame, settings, Electron/FastAPI bridge.
- Rotation-tree rig architecture with `SkeletonRig`, `RigService`, `resolveSkeleton()`, virtual spine/neck chains, undo/redo.
- Controllers through Stage 7:
  - pelvis/root, spine, neck, head;
  - arm IK and elbow twist;
  - shoulder FK;
  - visual hand primitives;
  - leg ankle IK and knee twist;
  - foot pitch/yaw/roll.
- F11 focus/test mode, collapsible panels, Browser Use/Playwright calibration, Playwright 3D smoke/gizmo regression.
- Unified gizmo drag and hit-zone sensitivity settings.
- Joint anatomy markers for elbows and knees.
- Natural arm-limit first slice.
- Electron logger hardening for closed stdout/stderr `EPIPE`.

## Current Active Work

### Documentation Cleanup

Completed on 2026-05-06:

- Completed plans and task briefs were archived.
- Documentation folders now have `index.md`.
- Active `PLAN.md` and `STATUS.md` are compact.
- `CLAUDE.md` and `AGENTS.md` now link to separate source-module and unit-test references.

### Architectural Cleanup

Completed on 2026-05-09. Parallel mechanisms and zombie code removed (see `CHANGELOG.md` and `ai/docs/codebase-map.md` §6 — A–E помечены ✅). Plan archived at `ai/tasks/archive/architectural-cleanup-plan.md`.

Decision on Leg IK Trace performance: not pursuing optimization. The flag is a diagnostic tool, off by default; FPS drop during tracing is expected and acceptable for the few minutes per session it is enabled.

### Leg Model Refactor

Active, not finished.

Manual validation found the current leg model is not anatomically explicit enough:

- Ankle IK can rotate the kneecap backward.
- Natural knee flexion can be blocked or confused with invalid backward-knee movement.
- Tibia axial twist must be strongly limited.

Accepted direction:

- Add explicit `kneeAnterior`, true `kneeFlexion`, and `tibiaAxialTwist` helpers.
- Rework ankle IK plane selection around patella/anterior validity.
- Rework knee twist gizmo into limited knee swivel.
- Add focused regression tests for both legs and root rotation.

Task brief: `ai/tasks/leg-limits-refinement-analysis.md`.

Current checkpoint, 2026-05-06:

- A first experimental slice is in the working tree:
  - added `legAnatomy.ts` with explicit knee anterior/flexion/tibia twist helpers;
  - changed `legIK.ts`, `legLimits.ts`, and `RigService.ts`;
  - added/updated focused tests.
- Automated checks for the current experimental slice passed:
  - `npm run typecheck`;
  - focused leg regression passed with 49 tests.
- Manual check is still unsuccessful:
  - side escape is improved: the leg no longer flies upward through the side;
  - deep front hip flexion still does not reach the needed "knees to belly" range in the viewport;
  - user supplied `limits.png`; it is useful, but its angles are table-style residual joint angles and must be translated carefully before using as code constants.
- Important: do not treat the current leg refactor as complete. Tomorrow continue with a hip-first solver:
  - solve thigh/hip direction first in the mannequin pelvis frame;
  - clamp hip flexion/extension and lateral abduction/adduction there;
  - solve knee flexion after the thigh direction is fixed;
  - then choose the reachable ankle position.
- Do not start tomorrow by flipping signs or moving the current high-front threshold again.

Hip-only solver slice, 2026-05-06:

- Added `legHip.ts` as a pure helper module for pelvis-frame hip/femur direction.
- Added `legHip.test.ts` with H1-H12 hip-only scenarios from `ai/tasks/leg-hierarchical-solver-design.md`.
- Connected the hip layer to `legIK.ts` for femur direction measurement and clamping.
- Updated hip-related `legIK` tests to match the new first-pass hip model:
  - flexion max 150 degrees;
  - extension max 25 degrees;
  - happy-baby high-flexion abduction is allowed;
  - extreme high-side escape remains blocked.
- Runtime now uses the hip layer, but the full leg model is still unfinished: knee and ankle/reach layers still need hierarchical refactor.
- Added temporary `LegIKTrace` diagnostics for development:
  - Settings has "Показывать отладку" to show/hide the left-sidebar Debug section;
  - Debug section has "Leg IK Trace", "Export Logs", and "Clear Logs";
  - console fallback: `localStorage.setItem('poseflow-debug-leg-ik', 'true')`;
  - disable fallback: `localStorage.removeItem('poseflow-debug-leg-ik')`.
- Fixed Debug toggle persistence to use `globalThis.localStorage`; the first toggle now logs whether
  the flag was actually persisted.
- User-supplied `poseflow/logs/console.log` confirms the current jerk case reaches `solver-null`
  while hip flexion is clamped at 150 degrees in a high-front pose.
- Added the first hip-first fallback slice for that logged high-front case:
  - stable-thigh attempt;
  - reachable ankle along `hip -> target`;
  - knee point chosen from a hip-limited preferred thigh direction;
  - nearest-valid scan from the target outward when the requested ankle is inside the reachable
    two-bone distance.
- Added explicit `trueKneeFlexion` for knee limits:
  - limits use unsigned thigh-to-tibia hinge angle;
  - signed knee flexion remains in diagnostics only;
  - removed the temporary target-high-front exception from hip-first reach acceptance.
- 2026-05-08 debug-log pass:
  - user supplied `debug-logs/*` traces for ankle drag and knee twist jerk cases;
  - the worst ankle-drag case was a branch-continuity failure: ankle movement was tiny, but the
    knee jumped about 0.7 scene units to the other IK branch;
  - small ankle-drag steps now preserve the current high-front knee branch, while larger posing
    moves may still choose the high-front branch automatically;
  - follow-up log showed excessive sticking during bottom-to-top ankle drag; root cause was the
    high-front hip adduction limit being too narrow at 20 degrees;
  - high-front adduction is now relaxed to 30 degrees, and limit handling now returns boundary
    poses instead of hard `null` for outside targets that can be clamped smoothly;
  - this is a targeted bridge fix, not the final hierarchical solver.
- Technical checks passed:
  - `npm run typecheck`;
  - focused settings + leg regression passed with 69 tests;
  - after Debug toggle persistence fix, focused debug/settings/leg regression passed with 43 tests.
  - after Export Logs button, `npm run typecheck` and focused debug/settings tests passed.
  - after first hip-first fallback slice, focused leg regression passed with 65 tests.
  - after `trueKneeFlexion` knee-layer slice, `npm run lint:unused` passed and focused leg regression passed with 66 tests.
  - after 2026-05-08 branch-continuity / high-front adduction fixes, `npm run typecheck`,
    `npm run lint:unused`, and focused leg regression passed with 68 tests.

- 2026-05-08 Session 1 second-opinion diagnosis and D1/D2 fixes:
  - Independent diagnosis of the leg IK model identified five defects (D1–D5) documented in
    `ai/tasks/leg-hierarchical-solver-design.md`.
  - Session 1 addressed D1 and D2 (the two interacting bugs blocking "knees to belly" high-front
    poses):
    - D2: removed the `targetAboveHip` gate from `constrainKneeFlexionWithFixedThigh`; extended
      shin-fold range now activates whenever the thigh is in high-front (≥ 90°), not only when the
      ankle target is above the hip.
    - D1: replaced the raw hip-to-ankle direction estimate in `buildKneeOnAxisWithPreferredRadial`
      with the anatomically limited hip direction from `solveHipDirection`; `preferHighFrontBranch`
      now uses the same hip measurement as the rest of the solver.
  - Added regression tests DK1, DK2, DK3.
  - Updated `не допускает переднее гиперразгибание колена` assertion to use diagnostics validity
    instead of raw signed flexion (old assertion checked an artifact of the prior incorrect clamp).
  - `npm run typecheck` passed.
  - `npm run lint:unused` passed.
  - Full rig regression passed with 152 tests (30 legIK, 13 legHip, 9 legAnatomy, 7 legLimits).

- 2026-05-09 Session 2 maintenance and structural improvements:
  - D4: removed duplicate `buildLegFrame` from `legAnatomy.ts`; now re-exported from `legHip.ts`.
  - D5: `isKneeAnteriorValid` threshold tightened from `-EPS` to `-0.1`; sideways knees
    no longer pass the patella-direction validity check.
  - D3: `solveLegIKHipFirst` promoted to position 3 (before `solveLegFABRIK`) in
    the `solveLegIKWithinLimits` fallback cascade; `isHighFrontTarget` computed once
    before the block.
  - All checks passed: typecheck, lint:unused, 152 rig regression tests.

- 2026-05-09 Knee-layer slice 2 partial (limit raise + dropped no-op):
  - Raised `LEG_ANATOMY_LIMITS.kneeFlexion.max` from 130° to 150° to match
    `legKnee.ts` `DEFAULT_KNEE_LIMITS.flexionMax`. Updated three boundary-asserting tests
    in `legIK.test.ts`. Full leg + service regression: 253 tests pass.
  - Dropped the "preserve femur axial twist in `applyLegChainToRig`" subtask. Math: `worldPosToLocalRot`
    uses `setFromUnitVectors` (shortest-arc) → quaternion vector part is `restDir × actualDir`
    (perpendicular to `restDir`) → twist component about `restDir` is identically zero. Preserving
    a structurally-zero quantity is meaningless. The genuine user concern (knee swivel feels
    erased on ankle drag) is about geometric `kneePlaneTwist` around the `hip→ankle` axis, not
    local-rotation twist; that is the branch-continuity fix from 2026-05-08 and lives in
    `solveLegIKWithinLimits`. Symmetric arm "fix" dropped for the same reason.
  - Slice 2 remaining: replace `constrainKneeFlexionWithFixedThigh` with `solveKneePose` calls,
    plus manual viewport verification of deep-front "knees-to-belly" at the new 150° ceiling.

- 2026-05-09 Knee-layer slice 1 (pure helpers, no runtime change):
  - Added `src/lib/rig/legKnee.ts` with `buildKneeFrame`, `patellaDirection`, `tibiaDirection`,
    `posFromKneePose`, `measureKneePose`, `tibiaTwistLimitAtFlexion`, `limitKneePose`, and
    `DEFAULT_KNEE_LIMITS` (flexion 0–150°, patella outward +45° / inward −20°,
    tibia twist 15° at fold collapsing to 3° near full extension).
  - Added `src/lib/rig/__tests__/legKnee.test.ts` with K1–K14 plus helper coverage (22 tests).
  - Round-trip `posFromKneePose ↔ measureKneePose` stable under femur tilt and root rotation.
  - Right/left mirror verified.
  - During implementation found and fixed three sign/orientation errors in the design doc
    (cross product order for `kneeSide`, sign on `tibiaDir`, patella vs. radial naming).
  - `legIK.ts` and `RigService` not modified — runtime IK still uses the old path.
  - `npm run typecheck`, `npm run lint:unused` clean; full leg + service regression: 248 tests pass.

- 2026-05-09 Knee-layer design extension:
  - Extended `ai/tasks/leg-hierarchical-solver-design.md` with the full knee-layer specification:
    `KneePose` model (`flexion`, `patellaAngle`, `tibiaTwist`), knee frame derivation from femur direction,
    first-pass limits (including locked-tibia-twist near full extension), K1–K14 scenario set,
    `legKnee.ts` code shape, and a three-slice implementation plan.
  - PLAN.md updated: slice 1 is `legKnee.ts` + `legKnee.test.ts` (pure helpers, no runtime change).
  - Femur-twist preservation moved into slice 2 (runtime integration).
  - Doc-only commit; no code change yet.

- 2026-05-09 Architectural cleanup (parallel-mechanism removal):
  - Deleted zombie Zustand stores (`lib/stores/settingsStore.ts`, `uiStore.ts`).
  - Deleted `lib/debugFlags.ts`; all debug flags migrated to `feature-flags/registry.ts`
    (`ENABLE_PERFORMANCE_LOGGING`, `ENABLE_LEG_IK_TRACE`).
  - Removed `FeatureFlagProvider` / second `FeatureFlagService` instance from `App.tsx`;
    `context/FeatureFlagContext.tsx` hooks now use DI singleton directly.
  - Removed modular `cameraService` singleton export; `CameraControls` and
    `AppSettingsContext` now go through DI.
  - Created `lib/storageKeys.ts` — unified registry for all localStorage keys; updated all
    five touch-points (`FeatureFlagService`, `logger.ts`, `appSettings.ts`, `App.tsx`,
    `Canvas3D.tsx`).
  - Fixed perf-trace console output: `console.debug` → `console.log` in `RigService`.
  - Full test suite: 306 tests (2 removed debugFlags tests, expected).
  - `npm run typecheck` passed.

## Latest Technical Checks

Latest checks:

- 2026-05-09 after architectural cleanup (parallel-mechanism removal):
  - `npm run typecheck` passed.
  - Full test suite passed with 306 tests.
- 2026-05-09 after Session 2 D3/D4/D5:
  - `npm run typecheck` passed.
  - `npm run lint:unused` passed.
  - Full rig regression passed with 152 tests.
- 2026-05-08 after Session 1 D1/D2 fixes:
  - `npm run typecheck` passed.
  - `npm run lint:unused` passed.
  - Full rig regression passed with 152 tests.
- 2026-05-08 after ankle-drag branch-continuity / high-front adduction fixes:
  - `npm run typecheck` passed.
  - `npm run lint:unused` passed.
  - Focused leg regression passed with 68 tests.
- 2026-05-06 after hip layer integration:
  - `npm run typecheck` passed.
  - `npm run lint:unused` passed after `trueKneeFlexion` cleanup.
  - Focused leg regression passed with 66 tests after `trueKneeFlexion` knee-layer slice.
  - Focused leg regression passed with 65 tests after first hip-first fallback slice.
  - Focused debug/settings/leg regression passed with 43 tests after Debug toggle persistence fix.
  - Focused settings + leg regression passed with 69 tests after Debug UI.
- 2026-05-06 during current leg-refactor slice:
  - `npm run typecheck` passed.
  - Focused leg regression passed with 49 tests.
- Before documentation cleanup:
  - `npm run typecheck` passed.
  - `npm test` passed with 263 tests.
  - Focused leg tests passed with 33 tests.

## Working Tree Note

As of this status compaction, several verified changes are still uncommitted:

- Natural arm limits.
- Electron EPIPE hardening.
- Focused leg-limit fixes that led to the leg-model refactor decision.
- Documentation cleanup and archiving.
- Current unfinished leg-model refactor slice.

Do not assume uncommitted changes are disposable. Treat them as current work.

## Navigation

- Active roadmap: `PLAN.md`
- Codex/Claude working rules: `AGENTS.md`, `CLAUDE.md`
- Documentation indexes: `index.md` files in each documentation folder
- Historical status: `archive/STATUS-before-doc-cleanup-2026-05-06.md`
