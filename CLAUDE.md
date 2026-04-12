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
npx vitest run           # All tests
npx vitest run src/lib/solvers   # Solver tests only
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
- **vitest**: run via `npx vitest` (npm install -D blocked by npm 11.7.0 arborist bug with concurrently/date-fns)

## Current status

Steps 1–7 of DesignDoll controls: **DONE**. See `ai/tasks/archive/steps-1-7-completed.md`.
**Next: Step 8 (Mini-view)**. See `PLAN.md` for remaining steps 8–11.

## Lite mode (skip formal workflow)

For changes matching ALL of: < 3 files, < 15 min, no architectural decisions — commit directly without updating PLAN.md. Examples: CSS tweaks, adding a button that calls an existing service method, fixing a typo.

## Модель и экономия
- По умолчанию используй только Sonnet 4.6
- Opus только если я явно скажу «используй Opus»
- Делай изменения маленькими итерациями
