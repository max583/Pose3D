# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PoseFlow Editor** — offline desktop 3D pose editor for ControlNet / Stable Diffusion. Creates, edits, and exports human poses in OpenPose BODY_25 format (25 keypoints, 24 bones). Analog of posemy.art, but runs locally. Target: DesignDoll-style manipulation (IK/FK, camera-plane drag).

Primary language: Russian (UI text, docs, commit messages, and user communication are in Russian).

## Build & Run Commands

All commands run from `poseflow/` directory:

```bash
# Install dependencies
npm install
cd backend && pip install -r requirements.txt

# Development (Vite dev server at http://127.0.0.1:5173)
npm run dev

# Development with Electron
npm run electron:dev

# Python backend standalone (http://127.0.0.1:8000)
npm run backend
# or: cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Production build
npm run build

# TypeScript check
npx tsc --noEmit

# Tests (vitest — configured at Step 0)
npx vitest run                          # all tests
npx vitest run src/lib/solvers          # solver tests only
npx vitest --watch                      # watch mode
```

## Architecture

### Three-layer stack

```
React (Vite)  <--IPC-->  Electron  <--HTTP-->  Python FastAPI
```

- **React frontend** (`poseflow/src/`) — 3D viewport, sidebar, export UI. Uses `@react-three/fiber` + `@react-three/drei` for Three.js rendering.
- **Electron** (`poseflow/electron/`) — desktop shell, IPC bridge between React and Python. `main.ts` spawns the Python backend and sets up IPC handlers. `preload.ts` exposes `window.electronAPI`.
- **Python FastAPI** (`poseflow/backend/`) — pose export services. Endpoints: `GET /health`, `POST /pose/export`.

### Key source modules

| Path | Purpose |
|------|---------|
| `src/components/Canvas3D.tsx` | Main 3D viewport, OrbitControls, CameraRefSetter, overlay indicators |
| `src/components/ExportFrame.tsx` | Interactive crop frame (drag, 8-handle resize, aspect ratio, resolution 1K/2K/4K) |
| `src/components/skeleton/Skeleton3D.tsx` | Renders all 25 joints + 24 bones, tracks global drag state |
| `src/components/skeleton/Joint.tsx` | Interactive sphere with hover/drag feedback, uses `useTransformDrag` |
| `src/components/skeleton/Bone.tsx` | Cylinder between two joints, auto-oriented via quaternion |
| `src/components/controls/CameraControls.tsx` | 3x3 compass grid (9 views) + Reset button |
| `src/components/Sidebar.tsx` | Presets dropdown, Reset Pose, Settings button |
| `src/components/SettingsModal.tsx` | Theme, canvas colors, camera speeds, export defaults |
| `src/services/ExportService.ts` | OpenPose JSON/PNG export: `projectTo2D`, `clipLineToRect` (Liang-Barsky), `downloadPNGWithCrop` |
| `src/services/PoseService.ts` | Singleton. Flat `PoseData` storage, observer pattern, `updateJoint`, `setPoseData`, `scale`, `translate` |
| `src/services/cameraService.ts` | 9 camera positions + smooth animation (500ms ease) |
| `src/lib/body25/body25-types.ts` | `Body25Index` enum, `JointPosition`, `PoseData`, `BoneConnection`, `BoneGroup`, `OpenPoseJSON` |
| `src/lib/body25/body25-keypoints.ts` | 25 keypoints with OpenPose names, Russian displayNames, hex colors |
| `src/lib/body25/body25-connections.ts` | 24 bone connections with individual rainbow gradient colors |
| `src/lib/presets/body25-presets.ts` | 10 presets: T-Pose, A-Pose, Standing, Sitting, Walking, Running, Jumping, Dancing, Waving, Arms Crossed |
| `src/context/AppSettingsContext.tsx` | Settings context: theme, canvas scheme, camera speeds, export defaults. localStorage persistence |
| `src/hooks/useTransformDrag.ts` | Current drag: pointer events, XY-only, `dx*0.01` scaling. **To be rewritten** at Step 1 with camera-plane raycasting |
| `src/hooks/useIPC.ts` | Electron IPC with browser fallback (direct HTTP to backend) |
| `src/lib/logger.ts` | Multi-module loggers, localStorage (1000 entries), recursion guard |
| `backend/services/export_service.py` | Python OpenPose export (JSON + PIL PNG) |
| `backend/services/pose_service.py` | Keypoint list, validation, default T-pose |

### Path alias

`@` is aliased to `poseflow/src/` in `vite.config.ts`.

### OpenPose BODY_25 format

Export JSON: `{"version":1.3,"people":[{"pose_keypoints_2d":[x0,y0,c0,...]}]}`
Export PNG: black background, colored bones/joints per OpenPose color spec (49 specific colors for 25 nodes + 24 bones).

### Export pipeline

`ExportFrame.tsx` captures viewport crop region -> `ExportService.ts` renders high-res offscreen canvas with same camera projection -> Liang-Barsky clipping at edges -> crops to frame bounds -> downloads PNG.

## Current status

### Completed (Stages 1-3.5)

- BODY_25 skeleton: 25 joints + 24 bones with OpenPose colors, drag-and-drop editing
- 10 pose presets, camera compass (9 views), Export Frame with crop/aspect/resolution
- PNG export aligned to viewport (projectTo2D + Liang-Barsky clipping)
- Electron + Python backend integration with IPC bridge
- App settings (theme, canvas, camera speeds) with localStorage

### Current limitations

- **Drag is XY-only** (`useTransformDrag.ts` line 69: `dx * 0.01`). Broken from side/top camera views
- **No joint hierarchy** — `PoseData` is flat `Record<Body25Index, JointPosition>`, moving shoulder does NOT move elbow/wrist
- **No bone length constraints** — bones stretch arbitrarily during drag
- **No undo/redo**
- **No IK** — no FABRIK or any constraint solver
- **ComfyUIConnector** — mentioned in spec but not implemented
- **No Electron save dialog** — export uses browser download (data URL)

---

## Development Process Improvements

Actions to take before starting feature work. Each has a rationale and concrete steps.

### 1. Initialize git

**Why:** Currently no version control at all. Any mistake is irreversible, no history, no branches for experiments. `work-state.md` (420 lines, manually maintained) is a fragile substitute for what git does automatically.

**Actions:**
1. Create `.gitignore` in project root with: `node_modules/`, `dist/`, `dist-electron/`, `__pycache__/`, `*.log`, `.env`, `poseflow/logs/`, `*.png` (screenshots), `poseflow/vite-output.log`
2. `git init` in `D:\ai\QwenCoder`
3. `git add` relevant files (exclude `node_modules`, `dist`, build artifacts)
4. Initial commit: "Initial commit: PoseFlow Editor v0.2.0 (Stages 1-3.5)"
5. Going forward: one commit per completed step from the implementation plan. Feature branches for experimental steps (IK solver).

### 2. Replace work-state.md with STATUS.md

**Why:** `work-state.md` is 420 lines with heavy duplication — same facts repeated in "completed stages", "implemented features", and "notes" sections. It mixes architecture docs (now in CLAUDE.md), implementation details (should be in code/comments), and status tracking. Maintaining it manually costs time and produces drift (e.g., it mentions ComfyUIConnector in Stage 1 structure as if it exists).

**Actions:**
1. Create `STATUS.md` (~15-20 lines): current version, what's done (bullet list), what's in progress, known issues
2. Delete `work-state.md` (it will remain in git history after Step 1 above)
3. Going forward: update STATUS.md when completing a step. Keep it under 30 lines — details live in git log and CLAUDE.md.

### 3. Clean up artifact files

**Why:** `poseflow/` contains 7 markdown files that are snapshots from past work sessions. They are not maintained, not referenced by code, and some contain outdated information. They add noise when exploring the project.

**Files to delete:**
- `poseflow/DRAG_AND_DROP_FIX.md` — fix description, already applied
- `poseflow/VERIFICATION_REPORT.md` — one-time report
- `poseflow/TEST_PLAN.md` — manual test plan, never executed systematically
- `poseflow/ERROR_LOGGING_GUIDE.md` — logging docs, not maintained
- `poseflow/LOGGING.md` — duplicate logging docs
- `poseflow/STAGE1_COMPLETE.md` — stage completion report
- `poseflow/STAGE2_COMPLETE.md` — stage completion report

**Actions:** Delete after git initial commit (so they're preserved in history).

### 4. Remove dead code

**Why:** Dead code confuses future sessions — it looks like it should work but doesn't. Two files are candidates:

- `src/hooks/useDragJoint.ts` — never imported anywhere. Contains correct raycasting idea but broken implementation (`require('three')` instead of import, `Vector2` not imported). The raycasting pattern is documented in Step 1 of the implementation plan; the file itself is dead weight.
- `src/diagnostic.ts` — temporary debug utility, not imported.

**Actions:** Delete both after git initial commit.

### 5. Set up vitest

**Why:** FABRIK solver (Step 4) is pure math — testing it through UI (launch app, drag joint, check visually) is slow and error-prone. A few unit tests will catch regressions instantly and make development much faster.

**Actions:**
1. `cd poseflow && npm install -D vitest`
2. Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest --watch"`
3. vitest works with vite config out of the box — no additional setup needed
4. First tests written at Step 4 (FABRIK solver): `src/lib/solvers/__tests__/fabrik.test.ts`

Not adding tests for UI components — visual testing through the app is sufficient there.

### 6. Commit discipline going forward

**Recommended pattern:**
- One commit per completed step: `"Step 1: camera-plane drag — replace XY-only with raycasting"`
- Feature branches for risky steps: `feature/fabrik-solver` for Step 4 (merge to main after tests pass)
- Never commit `node_modules`, `dist`, build artifacts, `.env`
- Commit messages in English (code is in English, commit messages should match)

### Status: COMPLETED

All six actions executed. Git history:
```
fd0b19c Cleanup: remove artifacts, dead code; add vitest, STATUS.md
96e4d19 Initial commit: PoseFlow Editor v0.2.0 (Stages 1-3.5)
```

Note: vitest is available via `npx vitest` (direct `npm install -D vitest` blocked by npm 11.7.0 arborist bug with concurrently/date-fns). Test scripts in package.json use `npx vitest`.

---

## Implementation Plan: DesignDoll-style Controls

Goal: transition from simple XY drag to full FK/IK manipulation like DesignDoll (https://terawell.net/en/). DesignDoll uses positional (translation-based) approach with implicit IK, not rotation gizmos.

### Architectural decisions (apply from the start)

1. **PoseService gets `skeletons[]` array** from Step 1, even with 1 element. Avoids full refactor at Step 3.4 (multiple skeletons).
2. **All pose mutations go through undo-aware channel** — `updateJoint`, `setPoseData`, `mirrorPose` etc. all push snapshot before mutating.
3. **SkeletonGraph is per-skeleton instance** — one graph object per skeleton, reusable across all solvers.

### Step 1 — Camera-plane drag

**Goal:** Drag works correctly from any camera angle (side, top, 3/4), including depth. This is the most impactful UX fix and makes all subsequent steps easier to test.

**Modified files:**
- `src/hooks/useTransformDrag.ts` — **Rewrite** using raycasting approach (previously in deleted `useDragJoint.ts`):
  - On `pointerDown`: create `THREE.Plane` perpendicular to `camera.getWorldDirection()`, passing through current joint position. Store intersection offset.
  - On `pointerMove`: convert mouse to NDC, `raycaster.setFromCamera(ndc, camera)`, `ray.intersectPlane(plane)` -> new world position minus offset.
  - On `pointerUp`: cleanup.
  - Need access to `camera` and `gl.domElement` via `useThree()` — already available since hook is called inside `<Canvas>` tree via `Joint.tsx`.

**Key implementation details:**
- `Plane` normal = `camera.getWorldDirection(new Vector3())` (not fixed XY)
- Plane passes through joint's world position: `plane.setFromNormalAndCoplanarPoint(normal, jointWorldPos)`
- Offset at pointerDown: `offset = intersectionPoint - jointWorldPos` (prevents jump)
- Each pointerMove: `newPos = intersectionPoint - offset`

**Test (manual):** Rotate camera to side view -> drag a joint -> it moves along the plane facing the camera, not along global XY.

### Step 2 — Undo/Redo + PoseService refactor

**Goal:** All pose mutations produce undo snapshots. Ctrl+Z / Ctrl+Shift+Z support.

**New files:**
- `src/lib/UndoStack.ts` — Generic undo/redo stack. Interface: `push(state: T)`, `undo(): T | null`, `redo(): T | null`, `canUndo: boolean`, `canRedo: boolean`. Max depth 50.

**Modified files:**
- `src/services/PoseService.ts`:
  - Add `UndoStack<PoseData[]>` (array for future multi-skeleton)
  - Wrap `skeletons: PoseData[]` + `activeSkeletonId: number` (initially always `[tPose]` and `0`)
  - `updateJoint()` and `setPoseData()` call `undoStack.push()` before mutation
  - New methods: `undo()`, `redo()`, `getActiveSkeletonPoseData()`, `setActiveSkeletonPoseData()`
  - Keep backward-compatible `getPoseData()` delegating to active skeleton
- `src/components/Canvas3D.tsx` — Add `keydown` listener: Ctrl+Z -> `poseService.undo()`, Ctrl+Shift+Z / Ctrl+Y -> `poseService.redo()`
- `src/components/Sidebar.tsx` — Add Undo/Redo buttons (disabled when stack empty)

**Test (manual):** Load preset -> drag a joint -> Ctrl+Z -> joint returns to preset position.

### Step 3 — Skeleton hierarchy (DAG) + FK propagation

**Goal:** Moving shoulder also moves elbow+wrist. Bones preserve length.

**New files:**
- `src/lib/body25/SkeletonGraph.ts` — Build directed acyclic graph from `BODY25_CONNECTIONS`:
  - Root: `MID_HIP` (index 8)
  - Tree structure: MID_HIP -> NECK -> shoulders/head, MID_HIP -> hips -> legs
  - `SkeletonNode { index: Body25Index, parent: Body25Index | null, children: Body25Index[] }`
  - Store `boneLengths: Map<string, number>` computed from current PoseData (key: `"from-to"`)
  - Methods: `getChildren(joint)`, `getDescendants(joint)`, `getChain(from, to): Body25Index[]`, `computeBoneLengths(poseData)`
  - FK algorithm in `applyFK(poseData, movedJoint, newPosition)`:
    ```
    delta = newPosition - poseData[movedJoint]
    for each descendant of movedJoint:
      poseData[descendant] += delta
    poseData[movedJoint] = newPosition
    ```

**Modified files:**
- `src/lib/body25/body25-types.ts` — Add: `ManipulationMode = 'fk' | 'ik'`, `SkeletonNode` interface
- `src/services/PoseService.ts`:
  - Hold `SkeletonGraph` instance, recompute `boneLengths` on `setPoseData`
  - `manipulationMode: ManipulationMode` state (default `'fk'`)
  - `updateJoint()`: if mode=FK, call `skeletonGraph.applyFK()` then notify

**BODY_25 tree (rooted at MID_HIP=8):**
```
MID_HIP(8)
├── NECK(1)
│   ├── NOSE(0)
│   │   ├── RIGHT_EYE(15) -> RIGHT_EAR(17)
│   │   └── LEFT_EYE(16) -> LEFT_EAR(18)
│   ├── RIGHT_SHOULDER(2) -> RIGHT_ELBOW(3) -> RIGHT_WRIST(4)
│   └── LEFT_SHOULDER(5) -> LEFT_ELBOW(6) -> LEFT_WRIST(7)
├── RIGHT_HIP(9) -> RIGHT_KNEE(10) -> RIGHT_ANKLE(11)
│   ├── RIGHT_BIG_TOE(22)
│   ├── RIGHT_SMALL_TOE(23)
│   └── RIGHT_HEEL(24)
└── LEFT_HIP(12) -> LEFT_KNEE(13) -> LEFT_ANKLE(14)
    ├── LEFT_BIG_TOE(19)
    ├── LEFT_SMALL_TOE(20)
    └── LEFT_HEEL(21)
```

**Test (manual):** FK mode -> drag Neck -> entire upper body (shoulders, arms, head) moves together. Drag Wrist -> only wrist moves (it's a leaf).

### Step 4 — IK solver (FABRIK)

**Goal:** Dragging wrist solves entire arm chain (shoulder stays fixed, elbow adjusts). Bones preserve length.

**New files:**
- `src/lib/solvers/FABRIKSolver.ts` — FABRIK (Forward And Backward Reaching Inverse Kinematics):
  ```typescript
  interface FABRIKInput {
    chain: Vector3[];       // joint positions from root to end-effector
    target: Vector3;        // desired end-effector position
    boneLengths: number[];  // length of each bone (chain.length - 1)
    iterations?: number;    // default 10
    tolerance?: number;     // default 0.001
  }
  function solveFABRIK(input: FABRIKInput): Vector3[]
  ```
  Algorithm:
  ```
  repeat iterations:
    // Forward pass (end -> root)
    chain[last] = target
    for i = last-1 downto 0:
      dir = normalize(chain[i] - chain[i+1])
      chain[i] = chain[i+1] + dir * boneLengths[i]
    // Backward pass (root -> end)
    chain[0] = fixedRoot  // restore root position
    for i = 1 to last:
      dir = normalize(chain[i] - chain[i-1])
      chain[i] = chain[i-1] + dir * boneLengths[i-1]
    // Check convergence
    if distance(chain[last], target) < tolerance: break
  ```

- `src/lib/body25/IKChains.ts` — IK chain definitions for BODY_25:
  ```typescript
  interface IKChainDef {
    name: string;
    joints: Body25Index[];     // ordered root -> end-effector
    endEffector: Body25Index;  // last joint (drag target)
    root: Body25Index;         // fixed joint
  }
  const IK_CHAINS: IKChainDef[] = [
    { name: 'rightArm', joints: [2, 3, 4], endEffector: 4, root: 2 },  // RShoulder->RElbow->RWrist
    { name: 'leftArm',  joints: [5, 6, 7], endEffector: 7, root: 5 },  // LShoulder->LElbow->LWrist
    { name: 'rightLeg', joints: [9, 10, 11], endEffector: 11, root: 9 },  // RHip->RKnee->RAnkle
    { name: 'leftLeg',  joints: [12, 13, 14], endEffector: 14, root: 12 }, // LHip->LKnee->LAnkle
  ]
  function getIKChainForJoint(joint: Body25Index): IKChainDef | null
  // Returns chain if joint is an end-effector or mid-chain member
  ```

- `src/lib/solvers/__tests__/fabrik.test.ts` — Vitest tests for FABRIK solver:
  - 3-joint chain + target -> bone lengths preserved
  - Target out of reach -> chain extends to straight line toward target
  - Target = current end-effector position -> no change
  - 2-joint chain (minimal case)

**Modified files:**
- `src/services/PoseService.ts`:
  - `updateJoint()`: if mode=IK and joint is in an IK chain -> extract chain positions + bone lengths from SkeletonGraph -> call `solveFABRIK` -> update all chain joints
  - If joint is not in any IK chain (e.g., Nose, Ear) -> fall back to FK behavior
  - IK respects undo: push snapshot before solving

**Test (vitest):** Run `npx vitest run src/lib/solvers`. **Test (manual):** IK mode -> drag RWrist -> RElbow adjusts, RShoulder stays fixed, bone lengths preserved.

### Step 5 — Mode toggle UI + visual feedback

**Goal:** User sees current mode, can switch FK/IK, end-effectors are visually distinct.

**Modified files:**
- `src/components/Sidebar.tsx` — New section "Mode" with FK/IK toggle (two buttons or radio). Show description: FK = "moves joint with all children", IK = "solves limb chain".
- `src/components/skeleton/Joint.tsx`:
  - End-effector joints (Wrist, Ankle — indices 4, 7, 11, 14) get larger radius (0.06 vs 0.04) or ring outline in IK mode
  - When IK mode active and hovering end-effector, highlight entire chain
- `src/components/Canvas3D.tsx` — Mode indicator in overlay: "FK Mode" / "IK Mode"

**Test (manual):** Toggle to IK -> wrist/ankle joints visually change -> drag wrist -> chain solves. Toggle to FK -> joints look normal -> drag shoulder -> whole arm follows.

**Milestone: Level 2 complete.** Full FK/IK manipulation with camera-plane drag and undo/redo.

---

### Step 6 — Pose mirroring

**Goal:** Hotkey M mirrors pose L<->R.

**New files:**
- `src/lib/body25/body25-mirror.ts`:
  - `L_R_PAIRS: [Body25Index, Body25Index][]` — all left-right pairs (LShoulder<->RShoulder, etc.)
  - `mirrorPose(poseData: PoseData): PoseData` — swap paired joints + negate X coordinate

**Modified files:**
- `src/services/PoseService.ts` — `mirrorPose()` method (through undo channel)
- `src/components/Canvas3D.tsx` — Hotkey M -> `poseService.mirrorPose()`
- `src/components/Sidebar.tsx` — Button "Mirror L<->R"

### Step 7 — Link/Unlink joints

**Goal:** Decouple FK chains at specific joints (like DesignDoll's shoulder link checkbox).

**Modified files:**
- `src/lib/body25/body25-types.ts` — `JointState { linked: boolean }` type
- `src/lib/body25/SkeletonGraph.ts` — `setLinked(joint, linked)`: when unlinked, `getDescendants()` stops at that joint (breaks the chain)
- `src/components/skeleton/Joint.tsx` — Right-click -> toggle link. Unlinked joint: dashed outline or different opacity

### Step 8 — Mini-view (second viewport)

**Goal:** Small window (bottom-right corner) showing 90-degree rotated view for depth judgment.

**New files:**
- `src/components/MiniView.tsx` — Second `<Canvas>` (200x200px), camera perpendicular to main camera. Read-only (no interaction). Renders same `Skeleton3D` with same `poseData`.

**Modified files:**
- `src/components/Canvas3D.tsx` — Pass main camera ref to MiniView for sync
- `src/components/Canvas3D.css` — Overlay styles for mini-view

### Step 9 — Multiple skeletons

**Goal:** Multiple figures on scene, select active one.

**Modified files:**
- `src/services/PoseService.ts` — `skeletons[]` array (prepared in Step 2) now actually supports multiple entries. `addSkeleton()`, `removeSkeleton(id)`, `setActiveSkeleton(id)`. Undo saves snapshot of all skeletons.
- `src/components/skeleton/Skeleton3D.tsx` — Render array of skeletons. Inactive ones: 50% opacity. Click on inactive skeleton -> select it.
- `src/components/Sidebar.tsx` — Skeleton list: add, delete, select active
- `src/lib/body25/SkeletonGraph.ts` — No changes (already per-skeleton instance)
- `src/lib/solvers/FABRIKSolver.ts` — No changes (operates on chain, skeleton-agnostic)

### Step 10 — Center of gravity

**Goal:** Drag virtual center-of-mass point to shift upper/lower body.

**New files:**
- `src/components/skeleton/CenterOfGravity.tsx` — Two virtual transparent spheres (upper CoG, lower CoG). Drag -> translate corresponding joint group via FK.

**Modified files:**
- `src/lib/body25/SkeletonGraph.ts` — `computeCenterOfMass(jointIndices[]): Vector3`. Two sets: upper (above MID_HIP), lower (MID_HIP and below).

### Step 11 — Ring gizmos (rotation controllers)

**Goal:** Torus rings around selected joint for fine-tuning rotation of children.

**New files:**
- `src/components/skeleton/JointGizmo.tsx` — `<Torus>` around selected joint. Drag on ring -> rotate child joints around ring axis. Three rings (XYZ), show one at a time.
- `src/lib/solvers/RotationSolver.ts` — `rotateAround(point, axis, center, angle): Vector3`

**Modified files:**
- `src/components/skeleton/Joint.tsx` — Double-click -> show/hide gizmo

---

### Step dependency graph and recommended order

**Prerequisites:** Complete all items from "Development Process Improvements" section first.

```
Step 1 (Camera-plane drag) ── most impactful UX fix, do first
     │
Step 2 (Undo/Redo) ── can parallel with Step 1
     │
     Step 3 (Hierarchy + FK)
     │
     Step 4 (IK FABRIK) ── with vitest tests
     │
     Step 5 (UI modes) ── Level 2 complete
     │
     ┌────────┼────────┐
     │        │        │
  Step 6   Step 7   Step 8    ── all independent, any order
 (Mirror) (Link)  (MiniView)
     │
  Step 9 (Multi-skeleton) ── uses skeletons[] from Step 2
     │
  Step 10 (Center of gravity)
     │
  Step 11 (Ring gizmos) ── lowest priority, most complex visual component
```

**Recommended execution order:** 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

Steps 1 and 2 can be done in parallel. Steps 6, 7, 8 are independent — any order after Step 5.

### Estimated scope

| Step | Description | LOC | Depends on |
|------|-------------|-----|------------|
| 1 | Camera-plane drag | ~150 | — |
| 2 | Undo/Redo + PoseService refactor | ~200 | — |
| 3 | SkeletonGraph + FK | ~300 | 2 |
| 4 | FABRIK IK solver + tests | ~300 | 3 |
| 5 | Mode toggle UI | ~100 | 4 |
| 6 | Pose mirroring | ~80 | 2 |
| 7 | Link/Unlink | ~100 | 3 |
| 8 | Mini-view | ~120 | — |
| 9 | Multiple skeletons | ~200 | 2 |
| 10 | Center of gravity | ~150 | 3 |
| 11 | Ring gizmos | ~300 | 3 |

## Key implementation details

- Camera ref uses `CameraRefSetter` component (not state) to avoid re-render loops
- `OrbitControls` are disabled during joint drag operations via `isAnyJointDragging` state in `Skeleton3D.tsx`
- Logger has recursion protection via `isInErrorHandling` flag
- PNG export uses `projectTo2D(joint, camera, canvasWidth, canvasHeight)` with matching aspect ratio to avoid NDC distortion
- Export Frame stores dimensions in `pixelSizeRef` (pixels), converts to percentages on viewport resize
- Export Frame pointer events pass through backdrop — skeleton drag works outside frame
- `useTransformDrag.ts` currently uses XY-only `dx*0.01` approach — to be replaced with camera-plane raycasting at Step 1. The correct raycasting pattern (Plane perpendicular to camera direction, ray intersection, offset preservation) is documented in Step 1 of this plan

## Модель и экономия
- По умолчанию используй только Sonnet 4.6
- Opus только если я явно скажу «используй Opus»
- Делай изменения маленькими итерациями, чтобы не жрать контекст