# Leg limits refinement analysis

## Goal

Review the current leg limit behavior and decide whether a second implementation pass is needed before moving to larger features.

## Current-State Probe

- `git status --short`: arm limits, Electron EPIPE fix, docs updates are currently uncommitted.
- Relevant docs:
  - `PLAN.md`: `Future — Leg limits refinement`.
  - `STATUS.md`: Stage 6 is done; knee/hip limits are documented.
- Relevant code:
  - `poseflow/src/lib/rig/legIK.ts`
  - `poseflow/src/lib/rig/__tests__/legIK.test.ts`
  - `poseflow/src/services/__tests__/RigService.stage6.test.ts`

## Current Behavior

- Knee bend:
  - forward flexion max: 85 degrees;
  - backward bend: 0 degrees.
- Hip direction:
  - forward: 120 degrees;
  - backward: 20 degrees;
  - outward: 50 degrees;
  - inward: 30 degrees.
- Ankle IK uses stop-at-limit behavior when the hip direction would leave limits.
- Repeated ankle IK after knee twist preserves the selected knee radial/twist plane.
- Existing tests cover:
  - bone length preservation;
  - no backward knee bend;
  - hip forward/back/outward/inward limits;
  - stop-at-limit for impossible ankle targets;
  - recovery when returning to a valid target;
  - preserving knee twist plane after knee gizmo.

## Risk Areas

- User-perceived "sticking" can be correct stop-at-limit or a bad solver rejection; this needs manual diagnosis.
- Knee twist can put the knee near a hip limit; a later ankle drag may then reject more targets than expected.
- Current hard limits have no visual feedback, so a correct block can feel like a broken drag.
- There is no separate soft-limit zone.

## Recommended Next Step

Do a short manual diagnostic table before changing code. If no issue is found, leave leg limits as-is for now and move to the next roadmap item.

## Manual Diagnostic

1. Select the right leg from the mannequin point of view.
2. Drag the ankle forward/up until the knee approaches max bend.
   - Expected: movement stops smoothly near the limit; knee does not bend backward.
3. Drag the ankle far backward.
   - Expected: movement stops when hip back limit is reached; no jump.
4. Use knee twist, then drag the ankle again in a nearby valid area.
   - Expected: the knee keeps the selected twist plane instead of snapping back.
5. Repeat the same three checks for the left leg.
6. Rotate the whole mannequin with the root gizmo and repeat one ankle drag on either leg.
   - Expected: limits still behave relative to the mannequin, not world axes.

## Decision Gate

- If all checks are acceptable: mark leg limits refinement as "checked / no immediate code change".
- If a problem appears: record side, view direction, controller used, target direction, and whether the failure is a jump, unexpected stop, wrong bend side, or lost knee twist plane.

## 2026-05-05 Implementation Slice

User report: in a visually natural leg pose the ankle could get stuck until the knee was rotated downward. Analysis found two related causes:

- `applyKneeTwist` could move the knee so that the thigh direction violated existing hip direction limits.
- `solveLegIKWithinLimits` rejected some reachable ankle targets when preserving the previous knee twist plane conflicted with hip limits.

Applied fixes:

- `RigService.applyKneeTwist` now rejects candidate knee positions outside leg IK limits.
- `solveLegIKWithinLimits` now makes one re-limiting pass through `solveLegFABRIK`; it accepts the pass only when the ankle remains within `0.025` scene units of the requested target and the final chain is within limits.

Follow-up user report: knee gizmo could still make full rotations in some poses. The local quaternion axial-twist check alone does not represent this visual motion, because the gizmo rotates the knee plane around `HIP -> ANKLE`.

Additional fix:

- Added `legLimits.ts` with upper-leg axial helpers and a drag-start knee-plane twist delta check.
- `RigService.beginDrag` stores a drag-start rig snapshot.
- `RigService.applyKneeTwist` now blocks candidate knee-plane rotation beyond `±90°` from the drag-start plane, preventing full turns while preserving the already-set pose at the start of the drag.

Second follow-up user report: some poses could still put the knee visually backward. The signed knee-flexion convention is: natural forward flexion is negative, backward flexion is positive.

Additional fix:

- `isLegIKCandidateWithinLimits` now rejects positive/backward knee flexion directly, regardless of whether the ankle is behind the hip.
- `solveLegIKWithinLimits` now validates the final preserved-twist candidate too; if it is invalid, it tries the safe re-limit path before returning `null`.

Technical checks:

- `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/legLimits.test.ts src/lib/rig/__tests__/legIK.test.ts src/services/__tests__/RigService.stage6.test.ts` passed: 33 tests.
- `npm run typecheck` passed.
- `npm test` passed: 263 tests.

Manual check still needed on the reported viewport scenario.

## 2026-05-05 Research Conclusion

User follow-up: when dragging the ankle forward/up, the kneecap rotates backward; at the same time the editor cannot produce the natural leg bend where the lower leg folds backward/up toward the body. This means the current problem is not only "missing limits".

Biomechanics notes from the research pass:

- Human knee flexion is primarily a hinge motion: the lower leg folds back toward the thigh/heel-to-buttock direction.
- The patella remains on the anterior side of the knee and glides in the femoral groove during flexion; it should not rotate to the posterior side.
- Some tibial rotation exists, but it is limited and depends on knee flexion; free axial rotation of the lower leg relative to the knee is not appropriate.
- Normative references used in the analysis:
  - Hip ROM: flexion 110-135°, extension 15-30°, abduction 40-50°, adduction 20-30°, internal rotation 35-45°, external rotation 45-60°.
  - Knee ROM: flexion 130-150°, extension 0° with small hyperextension up to 10-15° in some people.
  - Ankle ROM: dorsiflexion 10-20°, plantarflexion 40-50°, inversion 30-35°, eversion 15-20°.

Conclusion:

- Do not continue flipping signs in `legIK.ts`.
- The next implementation should refactor the leg model around explicit anatomy:
  - `kneeAnterior`: where the kneecap should face.
  - `kneeFlexion`: true flexion/extension angle.
  - `tibiaAxialTwist`: lower-leg rotation around its own axis relative to the knee, strongly limited.
  - IK plane selection: choose the knee solution that keeps the patella anterior.

Accepted refactor plan:

1. Add pure geometry helpers for local leg frame, patella/anterior direction, knee flexion, and tibia axial twist.
2. Update ankle IK to choose or preserve a knee plane only if it keeps the patella anterior.
3. Increase knee flexion toward a natural first-pass range, likely 130°.
4. Keep hyperextension near 0° for now.
5. Limit tibia axial twist tightly, likely ±10..15° for the first pass.
6. Rework knee twist gizmo as limited knee swivel, not free rotation around `HIP -> ANKLE`.
7. Add regression tests for ankle forward/up, ankle back/up, tibia axial twist, both sides, and root rotation.

## 2026-05-06 Experimental Refactor Checkpoint

Implemented in the current working tree:

- Added `legAnatomy.ts`:
  - `kneeAnterior` / patella-side helpers;
  - true `kneeFlexion`;
  - `tibiaAxialTwist`;
  - `kneeSwivel` limit.
- Updated `legIK.ts` to use anatomy helpers and high-front hip handling.
- Updated `legLimits.ts` and `RigService.ts` to limit tibia axial twist and knee swivel.
- Added/updated focused tests:
  - `legAnatomy.test.ts`;
  - `legIK.test.ts`;
  - `legLimits.test.ts`;
  - `RigService.stage6.test.ts`.

Technical checks passed:

- `npm run typecheck`.
- Focused leg regression: 49 tests passed.

Manual result:

- Not accepted yet.
- The sideways escape that created an obviously broken leg is improved.
- Deep front hip flexion is still insufficient in the viewport: user still cannot get a strong "knees to belly" pose.
- The current high-front heuristic is probably still the wrong abstraction.

User supplied `limits.png`:

- The table gives clinical movement ranges in residual angle notation.
- Do not paste these values directly into current signed-angle constants.
- Before using the table, translate each movement into PoseFlow conventions:
  - hip flexion/extension as thigh direction relative to pelvis frame;
  - hip abduction/adduction as lateral direction relative to pelvis frame;
  - knee flexion as lower leg folding relative to the thigh;
  - ankle pitch/yaw/roll separately from leg IK.

Recommended next step:

Primary direction: switch to a hip-first solver. This is now the accepted path for the next session.

1. Stop iterating on the current target-angle heuristic.
2. Design the new scheme from scratch and proceed hierarchically:
   - hip joint first: describe its ball-joint shape, movement features, pelvis-frame axes, and limits;
   - verify hip movement independently, without using ankle behavior as the proof;
   - knee joint second: describe hinge-like flexion, patella/anterior direction, and tightly limited tibia axial twist;
   - verify knee behavior after the hip model is stable;
   - ankle/reach third: only then solve the reachable ankle position.
3. Build a cleaner hip-first solver:
   - convert target into mannequin/pelvis leg frame;
   - choose desired thigh direction within hip flexion/abduction limits;
   - clamp lateral range as a function of front flexion;
   - solve knee flexion and ankle reach after the thigh direction is fixed.
4. Add a second leg-positioning control path through the knee node:
   - keep the current ankle-driven control because it is generally natural;
   - add knee-node control as an additional, more direct posing option;
   - design it as part of the hierarchical solver, not as a separate sign-tuned shortcut.
5. Use user-supplied live-model reference photos as orientation aids for a test pose set:
   - store images under `ai/reference-poses/images/`;
   - derive manual checks and possible service regressions from the images;
   - do not treat a single photo as an exact 3D target.
6. Keep current tests, but add a viewport-like service regression for "knees to belly" before editing behavior again.
7. Preserve the side-escape improvement.

Do not start the next session by flipping signs or moving the high-front threshold again. Start by designing the hip-first solver contract:

- inputs: hip/knee/ankle world points, target world point, body forward/up, side, bone lengths;
- frame: mannequin pelvis/leg frame;
- output: valid hip/knee/ankle chain, or no-op when the target moves away from all allowed motion;
- acceptance: "knees to belly" works, sideways escape stays blocked, backward knee remains blocked.

Architecture draft: `ai/tasks/leg-hierarchical-solver-design.md`.

Scenario-design update, 2026-05-06:

- Added hip-only scenario set H1-H12 to `ai/tasks/leg-hierarchical-solver-design.md`.
- The first helper/test slice should target hip behavior only:
  - no ankle target;
  - no knee flexion solving;
  - verify pelvis-frame measurement, clamping, right/left mirroring, and root rotation.
- Reference-driven checks currently emphasized:
  - `happy_baby_*` for deep front flexion plus abduction;
  - `arabesque*` / `attitude*` for hip extension;
  - side-escape block as a negative regression from the failed viewport case.

Implementation update, 2026-05-06:

- Added isolated `legHip.ts` and `legHip.test.ts`.
- H1-H12 are covered as pure hip-only tests; no ankle point is used.
- Connected `legHip.ts` to `legIK.ts` for hip/femur direction measurement and clamping.
- Updated hip-related `legIK` tests to match the new first-pass hip model.
- Technical checks passed:
  - `npm run typecheck`;
  - focused leg regression passed with 63 tests.
- Still open: knee and ankle/reach layers are not fully refactored yet; manual viewport validation is still needed after the next behavior slice.

Debug update, 2026-05-06:

- Added temporary `LegIKTrace` logging for ankle IK and knee twist.
- Added a left-sidebar Debug section, hidden by default.
- Enable the section in Settings with "Показывать отладку".
- Toggle `LegIKTrace` from the Debug section, or use `localStorage.setItem('poseflow-debug-leg-ik', 'true')`.
- Disable with the Debug section toggle, or `localStorage.removeItem('poseflow-debug-leg-ik')`.
- The Debug section can export the current PoseFlow log buffer with "Export Logs".
- Follow-up fix: the Debug toggle now persists through `globalThis.localStorage`, so Electron/Vite
  contexts do not silently keep only the yellow React button state without enabling `RigService` trace.
- Trace records include operation, side, target/result points, target distance, hip/knee diagnostics, and rejection reason when available.
- The first captured jerk log shows repeated `solver-null` rejections while hip flexion is already
  clamped at 150 degrees and the pose is in the high-front branch.
- First hip-first fallback slice:
  - added a regression from the captured `LegIKTrace` coordinates;
  - when the old post-limit path would return `solver-null`, the fallback tries stable thigh first;
  - then it builds a reachable ankle along `hip -> target`;
  - the knee is chosen from a hip-limited preferred thigh direction instead of forcing the old
    high-front `up` radial;
  - reachable distance is chosen by scanning from the target outward until a valid two-bone knee
    configuration is found.
- Knee-layer follow-up:
  - added `measureTrueKneeFlexion` as the unsigned thigh-to-tibia hinge angle;
  - knee limits now use true hinge flexion, not the signed `bodyForward`-based value;
  - signed knee flexion remains available in diagnostics as `signedFlexionDeg`;
  - removed the temporary target-high-front exception from hip-first reach acceptance.
- Technical checks after trace:
  - `npm run typecheck`;
  - focused settings + leg regression passed with 69 tests.
- Technical checks after Debug toggle persistence fix:
  - `npm run typecheck`;
  - focused debug/settings/leg regression passed with 43 tests.
- Technical checks after Export Logs button:
  - `npm run typecheck`;
  - focused debug/settings tests passed with 8 tests.
- Technical checks after first hip-first fallback slice:
  - `npm run typecheck`;
  - focused leg regression passed with 65 tests.
- Technical checks after `trueKneeFlexion` knee-layer slice:
  - `npm run typecheck`;
  - `npm run lint:unused`;
  - focused leg regression passed with 66 tests.
