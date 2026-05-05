# PoseFlow - Active Plan

This file contains only unfinished or currently active work. Completed plans and long historical notes live in archive folders and are discoverable through `index.md` files.

## Current Priority

### P1 - Anatomical Leg Model Refactor

Status: next implementation task after documentation cleanup.

Problem:

- Manual checks showed ankle IK can rotate the kneecap backward.
- Natural knee flexion, where the lower leg folds backward/up toward the body, is confused with an invalid backward-knee state.
- Tibia axial twist is not modeled explicitly and must be tightly limited.

Plan:

1. Add pure leg-frame helpers: local pelvis/leg axes, `kneeAnterior`, true `kneeFlexion`, and `tibiaAxialTwist`.
2. Rework ankle IK to choose or preserve the knee plane only while the patella stays anterior.
3. Raise knee flexion toward a natural first-pass range, likely 130 degrees.
4. Keep hyperextension near 0 degrees initially.
5. Limit tibia axial twist tightly, likely +/-10..15 degrees.
6. Rework knee twist gizmo as limited knee swivel rather than free `HIP -> ANKLE` rotation.
7. Add regression tests for ankle forward/up, ankle back/up, tibia axial twist, both sides, and root rotation.

Reference: `ai/tasks/leg-limits-refinement-analysis.md`.

## Backlog

### HandController

Full hand control remains postponed. Current state: `HandPrimitive` is visual-only and lays groundwork for future palm/finger orientation.

### Arm Limits Follow-Up

The first arm-limit slice is implemented. Remaining work:

- Tune more precise biomechanical shoulder/forearm ranges after practical testing.
- Use forearm axial twist checks actively when a real `HandController` exists.
- Consider visual feedback at movement limits.

### Toolbar And Panel UX

Future UX pass:

- Redesign buttons and panels.
- Separate persistent tools, selection-context tools, and export actions.
- Add viewport context menu on right click while preserving right-drag camera rotation.

### Scene Save/Load

Add project scene persistence after core model formats stabilize. This must be separate from OpenPose export.

### Release Technical Debt

Before packaging/release:

- Review `npm audit` warnings for `electron`, `vite`, `vitest`, `postcss`, `axios` / `follow-redirects`.
- Avoid drive-by `npm audit fix --force`; major upgrades need a focused compatibility pass.

### Future R&D

- Image -> 2D skeleton -> 3D skeleton pipeline with ComfyUI.
- Import/retarget rigged or animated character meshes from external formats.

## Active Sources Of Truth

- Current status: `STATUS.md`
- Working instructions: `CLAUDE.md` and `AGENTS.md`
- Documentation indexes: `index.md` files in documentation folders
- Historical context: `archive/`, `plans/archive/`, `ai/tasks/archive/`, `ai/docs/archive/`
