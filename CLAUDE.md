# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PoseFlow Editor** — offline desktop 3D pose editor for ControlNet / Stable Diffusion. Creates, edits, and exports human poses in OpenPose BODY_25 format (25 keypoints, 24 bones). Target: DesignDoll-style manipulation (IK/FK, camera-plane drag).

Primary language: Russian (UI text, docs, commit messages, and user communication are in Russian).

## Build & Run Commands

All commands run from `poseflow/` directory:

```bash
npm install
npm run dev              # Vite dev server at http://127.0.0.1:5173
npm run electron:dev     # With Electron
npm run backend          # Python FastAPI at http://127.0.0.1:8000
npm run build
npx tsc --noEmit         # TypeScript check (filter: grep -v "TS6305\|electron\|The file is")
npm test                 # All tests (vitest --config vitest.config.ts)
npx vitest run --config vitest.config.ts src/lib/solvers   # Solver tests only
```

## Architecture

### Three-layer stack

```
React (Vite)  <--IPC-->  Electron  <--HTTP-->  Python FastAPI
```

- **React frontend** (`src/`) — 3D viewport, sidebar, export UI. Uses `@react-three/fiber` + `@react-three/drei`.
- **Electron** (`electron/`) — desktop shell, IPC bridge. `main.ts` spawns Python backend. `preload.ts` exposes `window.electronAPI`.
- **Python FastAPI** (`backend/`) — export services. Endpoints: `GET /health`, `POST /pose/export`.

### Key source modules

| Path | Purpose |
|------|---------|
| `src/components/Canvas3D.tsx` | Main 3D viewport, OrbitControls, overlays, key handlers (Ctrl+Z, M) |
| `src/components/ExportFrame.tsx` | Interactive crop frame (drag, 8-handle resize, aspect ratio, resolution) |
| `src/components/skeleton/Skeleton3D.tsx` | Renders 25 joints + 24 bones, global drag state, FK/IK mode, unlinked joints |
| `src/components/skeleton/Joint.tsx` | Sphere: hover/drag/right-click (unlink), IK end-effector highlight |
| `src/components/skeleton/Bone.tsx` | Cylinder between joints, auto-oriented via quaternion |
| `src/components/controls/CameraControls.tsx` | 3×3 compass grid (9 views) + Reset |
| `src/components/Sidebar.tsx` | Presets, Reset, Mirror, Undo/Redo, FK/IK toggle, Settings |
| `src/services/ExportService.ts` | PNG export: `projectTo2D`, `clipLineToRect` (Liang-Barsky), `downloadPNGWithCrop` |
| `src/services/PoseService.ts` | Singleton. `skeletons[]`, `UndoStack`, `SkeletonGraph`, FK/IK dispatch |
| `src/services/cameraService.ts` | 9 camera positions + smooth animation (500ms ease) |
| `src/lib/body25/body25-types.ts` | `Body25Index` enum, `JointPosition`, `PoseData`, `ManipulationMode` |
| `src/lib/body25/SkeletonGraph.ts` | DAG (root=MID_HIP), FK delta propagation, bone lengths, link/unlink |
| `src/lib/body25/IKChains.ts` | 4 IK chains + `IK_END_EFFECTORS` Set{4,7,11,14} |
| `src/lib/body25/body25-mirror.ts` | `MIRROR_PAIRS` — 11 symmetric [Right, Left] pairs |
| `src/lib/solvers/FABRIKSolver.ts` | FABRIK: forward+backward passes, convergence, out-of-reach handling |
| `src/lib/UndoStack.ts` | Generic undo/redo stack, max 50, `undo(current)→prev` swap pattern |
| `src/lib/presets/body25-presets.ts` | 10 pose presets |
| `src/context/AppSettingsContext.tsx` | Theme, canvas scheme, camera speeds, localStorage persistence |
| `src/hooks/useTransformDrag.ts` | Camera-plane raycasting drag |
| `src/hooks/useIPC.ts` | Electron IPC with browser fallback |
| `src/lib/logger.ts` | Multi-module loggers, localStorage (1000 entries), recursion guard |

### Path alias

`@` → `poseflow/src/` in `vite.config.ts`.

### OpenPose BODY_25 export format

JSON: `{"version":1.3,"people":[{"pose_keypoints_2d":[x0,y0,c0,...]}]}`
PNG: black background, colored bones/joints per OpenPose color spec.

## Key implementation details

- **Camera ref**: `CameraRefSetter` component inside Canvas (not state) avoids re-render loops
- **OrbitControls**: disabled during joint drag via `isAnyJointDragging` in `Skeleton3D`
- **PNG export**: `projectTo2D(joint, camera, w, h)` must use same aspect ratio as Canvas to avoid NDC distortion
- **Export Frame**: stores dimensions in `pixelSizeRef`, converts to % on viewport resize; pointer events pass through backdrop
- **IK non-chain joints**: fall back to FK behavior
- **unlinkedJoints**: stored in `SkeletonGraph.unlinked` (Set), exposed via `PoseService.getUnlinkedJoints()`; triggers re-render via `notifyListeners()`
- **vitest**: `npm test` in `poseflow/` uses `vitest.config.ts` (standalone from Electron plugins in root `vite.config.ts`).

## Definition of Done (DoD)

Before merging a feature branch (scale checklist to task size):

1. Code matches the task; no unrelated drive-by refactors.
2. New logic under `poseflow/src/lib/` or `poseflow/src/services/` ships with **unit tests** (happy path + one likely edge case), unless covered by the Lite mode / test exceptions below.
3. **Manual check** of the scenario described in the task (or in `PLAN.md` for a numbered step).
4. If user-visible behavior changes — update **`CHANGELOG.md`** (when it exists, see P1) and **`STATUS.md`** as needed.
5. If the task introduces a new architectural choice — add or update an **ADR** (see `ai/docs/engineering-practices-improvement-plan.md`, P1).

**Lite mode** (see below): DoD reduces to items **1** and **3**; skip 4–5 when there is no user-visible change.

## Git commit messages

Use prefixes (Russian or English body is fine; primary project language is Russian):

| Prefix | Use |
|--------|-----|
| `feat:` | New user-visible feature or capability |
| `fix:` | Bug fix |
| `test:` | Tests only |
| `docs:` | Documentation, comments in `CLAUDE.md` / `PLAN.md` / `ai/docs/` |
| `chore:` | Tooling, deps, formatting, CI |

Optional trailer in the body for traceability: `PLAN: step 8`, `DD: фаза A1`, or a link to the task.

Example: `feat: мини-вид для глубины (PLAN step 8)`

## Current status

Steps 1–7 of DesignDoll controls: **DONE**. See `ai/tasks/archive/steps-1-7-completed.md`.
**Next: Step 8 (Mini-view)**. See `PLAN.md` for remaining steps 8–11.

## Unit tests (required)

Every new piece of logic **must** ship with unit tests in the same commit. No exceptions.

**What to test:** pure functions, algorithms, data transformations — anything in `src/lib/` or `src/services/` that doesn't require a browser/canvas/Three.js scene context.

**What not to test:** React components, Three.js rendering, hooks that depend on `useThree()`. Visual behaviour is verified manually.

**Where:** co-locate tests in `__tests__/` next to the module being tested. Mirror the directory structure.

**Coverage bar:** at minimum cover the happy path + the edge case most likely to regress (empty input, out-of-range, no-op).

**Lite mode exception:** CSS tweaks, config constants, and single-line wrappers that delegate entirely to already-tested code may skip tests.

Run before committing: `npm test` (from `poseflow/`, runs `vitest run --config vitest.config.ts`)

## Lite mode (skip formal workflow)

For changes matching ALL of: < 3 files, < 15 min, no architectural decisions — commit directly without updating PLAN.md. Examples: CSS tweaks, adding a button that calls an existing service method, fixing a typo.

## Модель и экономия
- По умолчанию используй только Sonnet 4.6
- Opus только если я явно скажу «используй Opus»
- Делай изменения маленькими итерациями
