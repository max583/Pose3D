# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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
npm run typecheck        # TypeScript check: app + Electron/Vite configs
npm run lint:unused      # Explicit unused locals/parameters check (not part of verify)
npm run build            # Typecheck + Vite/Electron build
npm run verify           # Typecheck + tests + Vite/Electron build
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
| `src/components/Canvas3D.tsx` | Main 3D viewport, service subscriptions, selection, active controllers, OrbitControls, export frame, key handlers (Ctrl+Z, M) |
| `src/components/ExportFrame.tsx` | Interactive crop frame (drag, 8-handle resize, aspect ratio, resolution) |
| `src/components/skeleton/Skeleton3D.tsx` | Renders BODY_25 joints/bones and segmented spine/neck arcs; delegates selection by joint click |
| `src/components/skeleton/Joint.tsx` | Joint sphere: hover/click selection highlight |
| `src/components/skeleton/Bone.tsx` | Cylinder between joints, auto-oriented via quaternion |
| `src/components/controllers/PelvisController.tsx` | Pelvis translate/rotate gizmo |
| `src/components/controllers/SpineController.tsx` | Spine bend/twist rings |
| `src/components/controllers/NeckController.tsx` | Neck bend/twist rings |
| `src/components/controllers/HeadController.tsx` | Head yaw/pitch/roll rings |
| `src/components/controllers/ArmController.tsx` | Wrist IK sphere + elbow twist arc |
| `src/components/controls/CameraControls.tsx` | 3×3 compass grid (9 views) + Reset |
| `src/components/Sidebar.tsx` | Presets, Reset, Mirror, Undo/Redo, FK/IK toggle, Settings |
| `src/services/ExportService.ts` | PNG export: `projectTo2D`, `clipLineToRect` (Liang-Barsky), `downloadPNGWithCrop` |
| `src/services/RigService.ts` | Primary pose source of truth: `SkeletonRig`, undo/redo, controller mutations, resolved pose cache |
| `src/services/PoseService.ts` | Compatibility wrapper over `RigService` for presets, export, mirror, reset, undo/redo |
| `src/services/SelectionService.ts` | Selected body element state and subscribers |
| `src/services/cameraService.ts` | 9 camera positions + smooth animation (500ms ease) |
| `src/lib/body25/body25-types.ts` | `Body25Index` enum, `JointPosition`, `PoseData`, `ManipulationMode` |
| `src/lib/rig/SkeletonRig.ts` | Rotation-tree rig state: root transform, local rotations, virtual chains, head state |
| `src/lib/rig/resolveSkeleton.ts` | Resolves `SkeletonRig` into BODY_25 `PoseData` + virtual spine/neck positions |
| `src/lib/rig/inverseFK.ts` | Builds a `SkeletonRig` from `PoseData` for presets/imported poses |
| `src/lib/rig/armIK.ts` | Arm FABRIK helpers, elbow twist, world-position-to-local-rotation conversion |
| `src/lib/body25/SkeletonGraph.ts` | Legacy graph utility retained for older tests/helpers; not the primary pose source |
| `src/lib/body25/IKChains.ts` | 4 IK chains + `IK_END_EFFECTORS` Set{4,7,11,14} |
| `src/lib/body25/body25-mirror.ts` | `MIRROR_PAIRS` — 11 symmetric [Right, Left] pairs |
| `src/lib/solvers/FABRIKSolver.ts` | FABRIK: forward+backward passes, convergence, out-of-reach handling |
| `src/lib/UndoStack.ts` | Generic undo/redo stack, max 50, `undo(current)→prev` swap pattern |
| `src/lib/presets/body25-presets.ts` | 10 pose presets |
| `src/context/AppSettingsContext.tsx` | Theme, canvas scheme, camera speeds, localStorage persistence |
| `src/hooks/useGizmoDrag.ts` | Screen-delta gizmo drag; disables OrbitControls during drag |
| `src/hooks/useCameraPlaneWorldDrag.ts` | Camera-plane raycast drag for world-position handles |
| `src/hooks/useIPC.ts` | Electron IPC with browser fallback |
| `src/lib/logger.ts` | Multi-module loggers, localStorage (1000 entries), recursion guard |

### Path alias

`@` → `poseflow/src/` in `vite.config.ts`.

### OpenPose BODY_25 export format

JSON: `{"version":1.3,"people":[{"pose_keypoints_2d":[x0,y0,c0,...]}]}`
PNG: black background, colored bones/joints per OpenPose color spec.

## Key implementation details

- **Camera ref**: `CameraRefSetter` component inside Canvas (not state) avoids re-render loops
- **Pose source of truth**: `RigService` owns `SkeletonRig`; `PoseData` is derived through `resolveSkeleton()`
- **Controller flow**: R3F controllers call `RigService.beginDrag()` once on pointer down, then mutate the rig on pointer move
- **OrbitControls**: disabled during controller drag via `useGizmoDrag` / `useCameraPlaneWorldDrag`
- **PNG export**: `projectTo2D(joint, camera, w, h)` must use same aspect ratio as Canvas to avoid NDC distortion
- **Export Frame**: stores dimensions in `pixelSizeRef`, converts to % on viewport resize; pointer events pass through backdrop
- **Virtual chains**: spine and neck are resolved as segmented arcs for rendering; intermediate points are not exported as BODY_25 joints
- **Arm IK**: wrist drag uses FABRIK for shoulder→elbow→wrist; elbow twist rotates around shoulder→wrist
- **vitest**: `npm test` in `poseflow/` uses `vitest.config.ts` (standalone from Electron plugins in root `vite.config.ts`).

## Definition of Done (DoD)

Before every task, do a current-state probe: check `git status --short`, read the relevant current docs (`STATUS.md`, `PLAN.md`, `AGENTS.md`) and inspect the actual code files that the task depends on. Treat code and `STATUS.md` as higher priority than stale plan entries.

For every non-Lite feature task, first create or fill a short task brief using [`ai/docs/feature-task-template.md`](ai/docs/feature-task-template.md). Keep it small: current-state probe, goal, boundaries, touched files, acceptance criteria, tests, and manual check.

For R3F/UI/drag/export viewport changes, run the smoke checklist in [`ai/docs/r3f-smoke-manual-checklist.md`](ai/docs/r3f-smoke-manual-checklist.md). Use the full regression checklist before closing larger controller or viewport changes.

Before merging a feature branch (scale checklist to task size):

1. Code matches the task; no unrelated drive-by refactors.
2. New logic under `poseflow/src/lib/` or `poseflow/src/services/` ships with **unit tests** (happy path + one likely edge case), unless covered by the Lite mode / test exceptions below.
3. **Manual check** of the scenario described in the task (or in `PLAN.md` for a numbered step).
4. If user-visible behavior changes — update **`CHANGELOG.md`** (repo root) and **`STATUS.md`** as needed.
5. If the task introduces a new architectural choice — add or update an **ADR** under `ai/decisions/` (see `ai/decisions/README.md` for template).

**Lite mode** (see below): DoD reduces to items **1** and **3**; skip 4–5 when there is no user-visible change.

## Git commit messages

Use prefixes (Russian or English body is fine; primary project language is Russian):

| Prefix | Use |
|--------|-----|
| `feat:` | New user-visible feature or capability |
| `fix:` | Bug fix |
| `test:` | Tests only |
| `docs:` | Documentation, comments in `AGENTS.md` / `PLAN.md` / `ai/docs/` |
| `chore:` | Tooling, deps, formatting, CI |

Optional trailer in the body for traceability: `PLAN: step 8`, `DD: фаза A1`, or a link to the task.

Example: `feat: мини-вид для глубины (PLAN step 8)`

## Logic vs. UI (React / R3F)

Keep **non-trivial algorithms** out of components: anything that looks like reusable math, graph walks, IK steps, clipping, or pose transforms belongs in `poseflow/src/lib/` or `poseflow/src/services/` and should be covered by unit tests. React components should orchestrate Three.js and user input (`Canvas3D`, `Joint`, hooks). If a `.tsx` file grows conditional logic that could run without a scene, extract a pure function and test it.

## Architecture documentation

- **ADR** (why we chose an approach): [`ai/decisions/README.md`](ai/decisions/README.md) — index and template; numbered files `0001-…`, `0002-…`.
- **Changelog** (what shipped for users): [`CHANGELOG.md`](CHANGELOG.md) at repository root.

## Current status

Rotation-tree архитектура (Stage 0), pelvis/spine (Stage 1), neck (Stage 2), head (Stage 3), and arm IK/twist (Stage 4.1): **DONE**. 174 tests. См. `STATUS.md`.
**Next: Stage 4.2 — ShoulderController**. Перед началом зафиксировать параметры плеча: оси, лимиты и поведение кисти при вращении плеча.

## Unit tests (required)

Every new piece of logic **must** ship with unit tests in the same commit. No exceptions.

**What to test:** pure functions, algorithms, data transformations — anything in `src/lib/` or `src/services/` that doesn't require a browser/canvas/Three.js scene context.

**What not to test:** React components, Three.js rendering, hooks that depend on `useThree()`. Visual behaviour is verified manually.

**Where:** co-locate tests in `__tests__/` next to the module being tested. Mirror the directory structure.

**Coverage bar:** at minimum cover the happy path + the edge case most likely to regress (empty input, out-of-range, no-op).

**Lite mode exception:** CSS tweaks, config constants, and single-line wrappers that delegate entirely to already-tested code may skip tests.

Run before committing: `npm run verify` (from `poseflow/`, runs typecheck, tests, and Vite/Electron build)

Optional cleanup check: `npm run lint:unused` (from `poseflow/`) before larger refactors or when touching broad TypeScript surfaces.

## Lite mode (skip formal workflow)

For changes matching ALL of: < 3 files, < 15 min, no architectural decisions — commit directly without updating PLAN.md. Examples: CSS tweaks, adding a button that calls an existing service method, fixing a typo.

## Модель и экономия
- По умолчанию используем модель уровня **Sonnet 4.6** (баланс качества и стоимости).
- **Opus** используем только для:
  - сложных архитектурных задач;
  - крупных рефакторингов;
  - анализа больших участков кода.
Всегда работай маленькими итерациями:
- Не пытайся “переписать” большие части проекта за один сеанс.
- Лучше несколько маленьких завершённых шагов, чем один огромный и сыро реализованный.
