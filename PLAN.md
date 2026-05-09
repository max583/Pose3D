# PoseFlow - Active Plan

This file contains only unfinished or currently active work. Completed plans and long historical notes live in archive folders and are discoverable through `index.md` files.

## Current Priority

### P1 - Anatomical Leg Model Refactor

Status: current knee-node + ankle-IK implementation slice is manually accepted
as of 2026-05-10. No further code changes are planned until the next reference
photo discussion.

Problem:

- Manual checks showed ankle IK can rotate the kneecap backward.
- Natural knee flexion, where the lower leg folds backward/up toward the body, is confused with an invalid backward-knee state.
- Tibia axial twist is not modeled explicitly and must be tightly limited.

Plan:

Completed in current experimental slice:

1. Added pure leg anatomy helpers: `kneeAnterior`, true `kneeFlexion`, and `tibiaAxialTwist`.
2. Added focused regression tests for the helper layer, root rotation, knee swivel, and high-front targets.
3. Limited knee swivel and tibia axial twist in service validation.
4. Narrowed lateral side escape for high front hip positions.
5. Added `legHip.ts` / `legHip.test.ts` hip-only solver slice. H1-H12 pass.
6. Connected `legHip.ts` to `legIK.ts` for hip direction measurement/clamping. Focused leg regression passes with 63 tests.

Next focus: test likeness-based reference-pose trials, currently `Arabesque`
and `Наклон вперед`.

This is the preferred path. Do not keep tuning the current target-based high-front heuristic unless it is only to remove temporary code during the rewrite.

Architecture rule: design the new leg solver from scratch and validate it hierarchically.
Do not use the ankle target as the first proof that the hip model works.

Still open:

1. Validate the current reference-photo workflow trials: `Arabesque` based on `arabesque1.jpg` / `arabesque3.webp`, and the two forward-fold variants based on `наклон вперед.png`: original `Наклон вперед` for comparison and `Наклон от тазобедренных` for the hip-hinge version. In all cases "close enough" means a readable silhouette and the right movement source, not exact angle matching.
2. Implement the hip-first solver:
   - first model the hip joint in the mannequin/pelvis frame, including its ball-joint shape, movement features, and limits;
   - validate hip movement and limits without depending on knee or ankle behavior;
   - use hip-only scenario tests H1-H12 from `ai/tasks/leg-hierarchical-solver-design.md` (implemented);
   - hip layer is now connected to leg IK for femur direction;
   - next, model the knee joint, including hinge-like flexion, patella/anterior direction, and very limited tibia axial twist;
     - knee-layer design extension landed 2026-05-09: see `ai/tasks/leg-hierarchical-solver-design.md` § «Knee Joint Model», «Knee First-Pass Limits», K1–K14 scenarios, «Knee Code Shape», and the explicit slice 1 / slice 2 / slice 3 plan there;
     - **slice 1 done 2026-05-09**: `src/lib/rig/legKnee.ts` + `legKnee.test.ts` (K1–K14 + helpers + `solveKneePose`), 27 tests; runtime untouched;
     - **slice 2 partially done 2026-05-09**: raised `LEG_ANATOMY_LIMITS.kneeFlexion.max` 130° → 150° (matches `legKnee.ts` `DEFAULT_KNEE_LIMITS.flexionMax`); regression updated, 253 tests pass;
     - femur-axial-twist preservation **dropped from slice 2** as a no-op: `worldPosToLocalRot` uses shortest-arc (`setFromUnitVectors`) which structurally produces zero twist component about the rest direction, so `measureUpperLegAxialTwist` is identically zero after any `applyLegChainToRig`. Preserving "always zero" is meaningless. The real "knee swivel erased on ankle drag" experience is about geometric `kneePlaneTwist` around the `hip→ankle` axis, which is already partially handled by branch-continuity logic in `solveLegIKWithinLimits` (2026-05-08 fix). If branch-continuity proves insufficient in further manual checks, improve it there, not in `applyLegChainToRig`;
     - **slice ordering reversed 2026-05-09**: knee-node controller (was slice 3) now precedes the ankle-IK substitution (was slice 2). Reasoning: the substitution `constrainKneeFlexionWithFixedThigh → solveKneePose` is anatomically stricter (forbids patella-backward in high-front), which removes a UX path through "ankle at hip level in high-front" intermediate drag states. Knee-node controller replaces that workflow with a cleaner direct knee handle. Sequencing fix-the-replacement-first then drop-the-old-path avoids a felt regression. See `ai/tasks/leg-hierarchical-solver-design.md` § «Slice 2 Substitution — Semantic Analysis» and the reordered slice list.
     - manual reference-pose verification of the new 150° kneeFlexion ceiling — independent of slice 3/4 ordering, can be done now in the viewport;
   - validate knee behavior after the hip model is stable;
   - only then model ankle/reach behavior and choose ankle position within reachable bounds.
3. **Slice 3 knee-node controller is code-complete and manually accepted (2026-05-10).** Implemented the additional knee-node leg-position path: `solveLegFromKneeTarget`, `RigService.applyLegFromKneeTarget`, `KneeController`, Debug toggle, selected-knee hit-zone cleanup in `Skeleton3D`, unit/service coverage, and focused Playwright smoke.
4. Build a reference-pose set from user-supplied live-model photos. Images live in `ai/reference-poses/images/` and are used as orientation aids, not exact mandatory targets.
5. Translate `limits.png` into PoseFlow angle conventions before using values as constants. The table uses residual clinical joint angles, not the same signed angles used by `legIK.ts`.
6. Preserve the improved side-escape behavior: no sideways route should create a broken leg pose.
7. **Slice 4 ankle-IK anatomical substitution is code-complete and manually accepted (2026-05-10).** `constrainKneeFlexionWithFixedThigh` was replaced by a `solveKneePoseWithFixedThigh` wrapper over `legKnee.ts`; the high-front patella-back allowance was removed from diagnostics. Ankle IK is now conservative/anatomical for extreme tucked poses; use the knee-node handle for direct "knees to belly" posing.

References:

- `ai/tasks/leg-limits-refinement-analysis.md`
- `ai/tasks/leg-hierarchical-solver-design.md`

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
