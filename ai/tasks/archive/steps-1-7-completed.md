# Steps 1–7: Completed — PoseFlow DesignDoll Controls

Archived 2026-04-12. All steps committed to `master`.

## Step 1 — Camera-plane drag (`useTransformDrag.ts`)
- Rewrote drag from XY-only to camera-plane raycasting
- `THREE.Plane` perpendicular to `camera.getWorldDirection()`, passes through joint world pos
- Offset at pointerDown prevents jump; each move: `newPos = intersection - offset`

## Step 2 — Undo/Redo + PoseService refactor
- `UndoStack<T>` (max 50): `push`, `undo(current)→prev`, `redo(current)→next`
- PoseService: `skeletons: PoseData[]`, `activeSkeletonId`, `undoStack`
- All mutations (updateJoint, setPoseData, reset, scale, translate, mirrorPose) push snapshot first
- Canvas3D: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y key handlers
- Sidebar: Undo/Redo buttons with disabled state

## Step 3 — SkeletonGraph + FK propagation (`SkeletonGraph.ts`)
- DAG rooted at MID_HIP(8); 25 nodes; children computed from TREE const
- `applyFK(poseData, joint, newPos)`: applies delta to all descendants
- `getDescendants(joint)`: BFS, stops at `unlinked` joints
- `computeBoneLengths(poseData)`: populates `boneLengths` Map, min 0.01
- `setLinked/isLinked`: toggles FK chain break at any joint

## Step 4 — FABRIK IK solver
- `FABRIKSolver.ts`: forward pass (end→root) + backward pass (root→end), 10 iterations
- Out-of-reach: extends chain toward target as straight line
- 4 IK chains in `IKChains.ts`: rightArm [2,3,4], leftArm [5,6,7], rightLeg [9,10,11], leftLeg [12,13,14]
- `IK_END_EFFECTORS = Set{4, 7, 11, 14}`
- 5 vitest tests pass: bone lengths preserved, root fixed, out-of-reach, no-op, 2-joint

## Step 5 — FK/IK mode toggle UI
- Sidebar: FK/IK toggle buttons, `.btn-mode`, `.btn-mode-active`, `.mode-hint` CSS
- Skeleton3D: `isEndEffector = mode==='ik' && IK_END_EFFECTORS.has(index)`
- Joint: end-effectors render 1.5× larger + white emissive glow (0.25)
- Canvas3D: overlay shows "FK Mode" / "IK Mode"

## Step 6 — Pose mirroring
- `body25-mirror.ts`: `MIRROR_PAIRS` — 11 [Right, Left] pairs
- `PoseService.mirrorPose()`: swaps pairs mirrored around `MID_HIP.x`, undoable
- Canvas3D: `M` key → mirrorPose
- Sidebar: "⇄ Mirror L↔R" button

## Step 7 — Link/Unlink joints (right-click)
- `PoseService`: `toggleJointLink`, `isJointLinked`, `getUnlinkedJoints()`
- Canvas3D: `unlinkedJoints: Set<Body25Index>` state, updated via subscribe
- Joint: `onContextMenu` → `onToggleLink(index)`; unlinked joints render grey + opacity 0.45
- Skeleton3D: threads `onToggleJointLink` + `unlinkedJoints` to Joint
