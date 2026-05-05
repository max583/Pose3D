# Source Modules Reference

Key source modules for PoseFlow. This is reference material; check current code before relying on details.

## Frontend And Viewport

| Path | Purpose |
| --- | --- |
| `poseflow/src/components/Canvas3D.tsx` | Main 3D viewport, service subscriptions, selection, active controllers, OrbitControls, export frame, keyboard handlers. |
| `poseflow/src/components/ExportFrame.tsx` | Interactive crop frame with drag, resize handles, aspect ratio, and resolution controls. |
| `poseflow/src/components/Sidebar.tsx` | Presets, reset, mirror, undo/redo, FK/IK toggle, settings, export frame entry point. |
| `poseflow/src/components/controls/CameraControls.tsx` | 3x3 view compass and camera reset. |
| `poseflow/src/context/AppSettingsContext.tsx` | Theme, canvas scheme, camera speeds, gizmo sensitivity, and localStorage persistence. |

## Skeleton Rendering

| Path | Purpose |
| --- | --- |
| `poseflow/src/components/skeleton/Skeleton3D.tsx` | Renders BODY_25 joints/bones and virtual spine/neck arcs; delegates joint selection. |
| `poseflow/src/components/skeleton/Joint.tsx` | Joint sphere hover/click selection highlight. |
| `poseflow/src/components/skeleton/Bone.tsx` | Cylinder between joints, oriented by quaternion. |

## Controllers

| Path | Purpose |
| --- | --- |
| `poseflow/src/components/controllers/PelvisController.tsx` | Root/pelvis translation and rotation gizmo at BODY_25 node 8. |
| `poseflow/src/components/controllers/SpineController.tsx` | Spine bend/twist controls. |
| `poseflow/src/components/controllers/NeckController.tsx` | Neck bend/twist controls. |
| `poseflow/src/components/controllers/HeadController.tsx` | Head yaw/pitch/roll controls. |
| `poseflow/src/components/controllers/ArmController.tsx` | Wrist IK sphere and elbow twist arc. |
| `poseflow/src/components/controllers/ShoulderController.tsx` | Shoulder girdle FK arrows around node 1. |
| `poseflow/src/components/controllers/LegController.tsx` | Ankle IK handle and knee twist/swivel gizmo. |
| `poseflow/src/components/controllers/FootController.tsx` | Foot pitch/yaw/roll controls. |

## Services

| Path | Purpose |
| --- | --- |
| `poseflow/src/services/RigService.ts` | Primary pose source of truth: `SkeletonRig`, undo/redo, controller mutations, resolved pose cache. |
| `poseflow/src/services/PoseService.ts` | Compatibility wrapper over `RigService` for presets/export/mirror/reset/undo/redo. |
| `poseflow/src/services/SelectionService.ts` | Selected body element state and subscribers. |
| `poseflow/src/services/ExportService.ts` | PNG/JSON export helpers, projection, clipping, crop download. |
| `poseflow/src/services/cameraService.ts` | 9 camera positions and smooth animation. |

## Rig And Solvers

| Path | Purpose |
| --- | --- |
| `poseflow/src/lib/rig/SkeletonRig.ts` | Rotation-tree rig state, root transform, local rotations, virtual chains, head/foot layers. |
| `poseflow/src/lib/rig/RestPose.ts` | BODY_25 parent map, default T-pose, local offsets, bone lengths. |
| `poseflow/src/lib/rig/resolveSkeleton.ts` | Resolves `SkeletonRig` into BODY_25 `PoseData` plus virtual chain positions. |
| `poseflow/src/lib/rig/inverseFK.ts` | Builds `SkeletonRig` from `PoseData` for presets/imported poses. |
| `poseflow/src/lib/rig/VirtualChain.ts` | Segmented spine/neck chain helpers. |
| `poseflow/src/lib/rig/armIK.ts` | Arm FABRIK helpers, elbow twist, world-position-to-local-rotation conversion. |
| `poseflow/src/lib/rig/armLimits.ts` | Arm natural-limit helpers and swing-twist decomposition. |
| `poseflow/src/lib/rig/legIK.ts` | Leg IK, knee twist, hip/knee limit logic; scheduled for anatomical refactor. |
| `poseflow/src/lib/rig/legLimits.ts` | Current leg limit helpers; scheduled for anatomical refactor. |
| `poseflow/src/lib/rig/footFK.ts` | Foot pitch/yaw/roll layer and limits. |
| `poseflow/src/lib/rig/shoulderFK.ts` | Shoulder girdle FK deltas and limits. |
| `poseflow/src/lib/solvers/FABRIKSolver.ts` | FABRIK forward/backward passes, convergence, out-of-reach handling. |

## BODY_25 And Utilities

| Path | Purpose |
| --- | --- |
| `poseflow/src/lib/body25/body25-types.ts` | BODY_25 indexes and pose types. |
| `poseflow/src/lib/body25/SkeletonGraph.ts` | Legacy graph utility retained for older tests/helpers. |
| `poseflow/src/lib/body25/IKChains.ts` | IK chain definitions and end-effectors. |
| `poseflow/src/lib/body25/body25-mirror.ts` | Mirrored BODY_25 pairs. |
| `poseflow/src/lib/UndoStack.ts` | Generic undo/redo stack. |
| `poseflow/src/lib/presets/body25-presets.ts` | Built-in pose presets. |
| `poseflow/src/lib/logger.ts` | Frontend logging helpers and localStorage log buffer. |

## Electron And Backend

| Path | Purpose |
| --- | --- |
| `poseflow/electron/main.ts` | Electron shell, Python backend spawning, app lifecycle. |
| `poseflow/electron/preload.ts` | IPC bridge exposed to renderer. |
| `poseflow/electron/logger.ts` | Electron-side safe logging. |
| `poseflow/backend/` | FastAPI export backend. |
