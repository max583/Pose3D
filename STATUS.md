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

### Leg Model Refactor

Next implementation task after documentation cleanup.

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

## Latest Technical Checks

Before documentation cleanup:

- `npm run typecheck` passed.
- `npm test` passed with 263 tests.
- Focused leg tests passed with 33 tests.

## Working Tree Note

As of this status compaction, several verified changes are still uncommitted:

- Natural arm limits.
- Electron EPIPE hardening.
- Focused leg-limit fixes that led to the leg-model refactor decision.
- Documentation cleanup and archiving.

Do not assume uncommitted changes are disposable. Treat them as current work.

## Navigation

- Active roadmap: `PLAN.md`
- Codex/Claude working rules: `AGENTS.md`, `CLAUDE.md`
- Documentation indexes: `index.md` files in each documentation folder
- Historical status: `archive/STATUS-before-doc-cleanup-2026-05-06.md`
