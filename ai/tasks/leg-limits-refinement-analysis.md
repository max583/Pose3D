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
