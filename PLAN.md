# PoseFlow — Implementation Plan (Remaining Steps)

Steps 1–7 complete. See `ai/tasks/archive/steps-1-7-completed.md` for details.
Next: Step 8.

**Связь с рефакторингом DesignDoll (шаги PLAN ↔ фазы DD):** [`ai/docs/backlog-matrix.md`](ai/docs/backlog-matrix.md).

---

## Step 8 — Mini-view (second viewport)

**Goal:** Small 200×200 Canvas in bottom-right corner showing 90°-rotated view for depth judgment.

**New file:** `src/components/MiniView.tsx`
- Second `<Canvas>` at 200×200px, absolute-positioned bottom-right
- Camera perpendicular to main camera: if main looks along -Z, mini looks along +X
- Renders same `<Skeleton3D>` with same `poseData` (read-only, no interaction)
- Updates whenever main camera changes (reads `currentCameraRef`)
- Camera position: take main camera, rotate 90° around Y axis, same target

**Modified:** `src/components/Canvas3D.tsx`
- Import and render `<MiniView>` below the main Canvas (inside `.canvas3d-container`)
- Pass `poseData`, `manipulationMode`, `unlinkedJoints`

**Modified:** `src/components/Canvas3D.css`
- `.mini-view` styles: position absolute, bottom-right corner, border, semi-transparent bg

**Test:** Rotate main camera to any angle → mini-view always shows perpendicular angle.

---

## Step 9 — Multiple skeletons

**Goal:** Multiple figures on scene; select active one via sidebar.

**Modified:** `src/services/PoseService.ts`
- `skeletons[]` array already supports multiple entries (Step 2 prep)
- `addSkeleton()`: push new T-Pose, set as active, notify
- `removeSkeleton(id)`: splice, adjust activeId, notify
- `setActiveSkeleton(id)`: change activeId, notify
- Expose: `getSkeletonCount()`, `getSkeletonPoseData(id)`, `getAllSkeletons(): PoseData[]`
- Undo saves snapshot of ALL skeletons (already does via `snapshot()`)

**Modified:** `src/components/skeleton/Skeleton3D.tsx`
- Accept `skeletons: PoseData[]`, `activeSkeletonId: number`
- Render all skeletons; inactive ones at 50% opacity (`<group opacity={...}>`)
- Click on inactive skeleton joint → `onSelectSkeleton(id)`

**Modified:** `src/components/Canvas3D.tsx`
- Subscribe callback: also read `poseService.getAllSkeletons()` and pass to Skeleton3D

**Modified:** `src/components/Sidebar.tsx`
- Skeleton list section: numbered entries, "Add Skeleton" button, "Delete" per entry
- Click entry → setActiveSkeleton

---

## Step 10 — Center of gravity

**Goal:** Drag virtual CoG sphere to shift upper/lower body as a group.

**New file:** `src/components/skeleton/CenterOfGravity.tsx`
- Two spheres: upper CoG (joints above MID_HIP: 0-7, 15-18), lower CoG (8-14, 19-24)
- CoG position = average of group joint positions
- Drag → compute delta → FK translate entire group (no hierarchy, just offset all joints)
- Visual: semi-transparent sphere, distinct color (upper=blue, lower=green)

**Modified:** `src/lib/body25/SkeletonGraph.ts`
- `computeCenterOfMass(jointIndices: Body25Index[], poseData: PoseData): Vector3`

**Modified:** `src/components/skeleton/Skeleton3D.tsx` and `Canvas3D.tsx`
- Render CenterOfGravity component, wire drag to poseService

---

## Step 11 — Ring gizmos (rotation controllers)

**Goal:** Torus rings around selected joint for rotating child joints.

**New files:**
- `src/components/skeleton/JointGizmo.tsx` — Three `<Torus>` rings (XYZ axes). Drag on ring → rotate child joints around that axis. Show on double-click, hide on click-elsewhere.
- `src/lib/solvers/RotationSolver.ts` — `rotateAround(point: Vector3, axis: Vector3, center: Vector3, angle: number): Vector3`

**Modified:** `src/components/skeleton/Joint.tsx`
- `onDoubleClick` → toggle `showGizmo` state
- Render `<JointGizmo>` when selected

---

## Step dependency graph

```
Step 8 (MiniView) ── independent, do first
Step 9 (Multi-skeleton) ── uses skeletons[] from Step 2
Step 10 (CoG) ── depends on Step 3 (SkeletonGraph)
Step 11 (Ring gizmos) ── most complex, lowest priority
```

Recommended order: 8 → 9 → 10 → 11
