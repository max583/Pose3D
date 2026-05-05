# Joint anatomy markers

## 1. Goal

Add small visual-only caps to elbows and knees so the user can see where elbow protrusions and kneecaps are on the existing BODY_25 joints.

## 2. Current-state probe

- `git status --short`: workspace already contains many ongoing Stage 4-7 / coordinate-frame changes; do not revert unrelated work.
- `STATUS.md`: coordinate-frame/root-gizmo pass is accepted; `npm run verify` and `npm run lint:unused` passed after final cleanup.
- `PLAN.md`: next candidates include arm limits, leg limits, HandController, and unified gizmo sensitivity.
- Relevant code:
  - `poseflow/src/components/skeleton/Skeleton3D.tsx` renders bones, joints, and visual hand primitives.
  - `poseflow/src/components/skeleton/Joint.tsx` owns interactive joint hit zones.
  - `poseflow/src/lib/rig/coordinateFrames.ts` contains pure geometry helpers.

## 3. Scope

In:
- Visual-only markers for left/right elbows and knees.
- Markers do not change pose, selection, export, IK, FK, or undo/redo.
- Use pure helper logic for marker direction and cover it with unit tests.

Out:
- Natural arm/leg limits.
- New interactive gizmos.
- Full anatomical meshes.

## 4. Mechanic

- Pivot: the BODY_25 joint position itself.
- Direction: outside the current bend, computed as `joint - closestPointOnAxis(parent -> child)`.
- Fallback: if the limb is nearly straight, use a caller-provided body-local fallback direction.
- Mouse behavior: none; markers are not interactive and must not capture pointer events.

## 5. Acceptance

- Elbow and knee joints show small non-interactive caps.
- Existing joint selection still happens through the original joint spheres.
- `npm run typecheck` passes.
- Targeted unit tests for marker direction pass.

## 6. Result

- Implemented `JointAnatomyMarker` for both elbows and both knees.
- Added `getJointOutsideBendDirection` and unit tests.
- Follow-up bug fixed: straight limbs with unequal adjacent bone lengths now use fallback direction instead of pushing the marker onto a neighboring bone.
- Checks passed: `jointMarkers` unit tests, `npm run typecheck`, `npm run lint:unused`, and full `npm run verify` after initial implementation.
