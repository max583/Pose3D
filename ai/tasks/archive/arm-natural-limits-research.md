# Arm natural limits research

## Goal

Prepare the future implementation of natural limits for arms, including shoulder-girdle limits, upper-arm direction limits, elbow flexion, elbow swivel, and axial twist limits for upper arm and forearm bones.

## Current Code Shape

- `ShoulderController` changes BODY_25 shoulder point `2` / `5` around `NECK` (`1`) through `RigService.applyShoulderRaise` / `applyShoulderForward`.
- `ArmController` changes the arm chain:
  - wrist IK through `RigService.applyArmIK`;
  - elbow swivel through `RigService.applyElbowTwist`.
- Pure logic currently lives in:
  - `poseflow/src/lib/rig/armIK.ts`;
  - `poseflow/src/lib/rig/shoulderFK.ts`;
  - `poseflow/src/lib/rig/legIK.ts` as the reference for stop-at-limit behavior.

## Important Distinctions

- Shoulder girdle movement is not the same as shoulder joint rotation.
- Upper-arm direction limit is not the same as upper-arm axial twist limit.
- Elbow flexion limit is not the same as forearm axial twist limit.
- User side naming is mannequin-relative: right arm is BODY_25 `2-3-4`, left arm is `5-6-7`.

## Proposed Method

Use a dedicated pure module, likely `poseflow/src/lib/rig/armLimits.ts`.

Core idea:

- Compute candidate arm pose from current controller action.
- Evaluate candidate in skeleton/mannequin-local frames.
- Accept the pose if all limits pass.
- If the pose violates limits, keep the last valid pose; do not snap to a corrected pose.

The module should eventually expose functions like:

- `solveArmIKWithinLimits(...) -> Vector3[] | null`
- `isArmPoseWithinLimits(...)`
- `constrainElbowFlexion(...)`
- `constrainUpperArmDirection(...)`
- `decomposeSwingTwist(...)`
- `measureUpperArmAxialTwist(...)`
- `measureForearmAxialTwist(...)`

## Limits To Cover

1. Elbow flexion/extension:
   - first-pass proposal: no backward hyperextension, flexion max around `145..150°`.

2. Upper-arm direction:
   - limit `SHOULDER -> ELBOW` in torso/shoulder-local space.
   - Keep enough range for arms overhead and arms crossing, but avoid impossible shoulder positions.

3. Upper-arm axial twist:
   - limit rotation of bones `2-3` and `5-6` around their own axes in the shoulder joint.
   - Requires swing-twist decomposition.

4. Forearm axial twist:
   - limit rotation of bones `3-4` and `6-7` around their own axes in the elbow/forearm.
   - This is partly future-facing for hand orientation, but should be part of the model.

5. Shoulder girdle:
   - existing `shoulderFK.ts` limits remain active, but should be reviewed separately from upper-arm limits.

## Implementation Order

1. Create `armLimits.ts` and tests for pure angle/twist measurements.
2. Add elbow flexion/extension limit to wrist IK with stop-at-limit behavior.
3. Add upper-arm direction limit.
4. Add upper-arm axial twist limit.
5. Add forearm axial twist limit.
6. Apply checks to `applyElbowTwist`.
7. Verify compatibility with `ShoulderController`.

## Checks

- Unit tests for every pure limit function.
- `RigService.stage4` tests for `applyArmIK` and `applyElbowTwist`.
- Manual checks:
  - both arms;
  - front/back/side views;
  - wrist IK;
  - elbow twist;
  - shoulder arrows;
  - undo/redo;
  - after whole-body root rotation.
