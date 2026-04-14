# PoseFlow Editor — Status

## Current version: v0.2.0

## Completed
- Vitest: отдельный `poseflow/vitest.config.ts` (без Electron-плагинов), расширены unit-тесты (`ExportService`, `PoseService`, `IKChains`, пресеты, `appSettings`); исправление `package-lock.json` (версия `date-fns` под `concurrently`) для успешного `npm install`
- Спецификация управления по образцу DesignDoll под BODY_25 и семь контроллеров: `ai/docs/design-doll-controls-poseflow-spec.md`
- BODY_25 skeleton: 25 joints + 24 bones, OpenPose colors, drag-and-drop
- 10 pose presets (T-Pose, A-Pose, Standing, Sitting, Walking, Running, Jumping, Dancing, Waving, Arms Crossed)
- Camera compass: 9 views (Front, Back, Side L/R, 3/4 x4, Top) + Reset
- Export Frame: interactive crop with drag, 8-handle resize, aspect ratio (10 options), resolution (1K/2K/4K)
- PNG/JSON export aligned to viewport (Liang-Barsky clipping)
- Electron + Python FastAPI backend with IPC bridge
- App settings: theme, canvas colors, camera speeds, export defaults (localStorage)

## DesignDoll-style controls (Steps 1-11)
- Step 1 (camera-plane drag): DONE
- Step 2 (Undo/Redo + PoseService): DONE
- Step 3 (SkeletonGraph + FK): DONE
- Step 4 (FABRIK IK solver): DONE — 5/5 tests pass
- Step 5 (FK/IK mode toggle UI + end-effector visual feedback): DONE
- Step 6 (Pose mirroring L↔R, M key + button): DONE
- Step 7 (Link/Unlink joints via right-click): DONE
- Next: Step 8 (Mini-view — second Canvas, 90° rotated)

## Known issues
- No bone length constraints during FK drag (stretch allowed)
- No mini side-view canvas
- No multiple skeletons
- No center-of-gravity sphere
- No ring gizmos for rotation

## Roadmap (управление как в DesignDoll)
- Спецификация: `ai/docs/design-doll-controls-poseflow-spec.md`
- План рефакторинга (фазы A–E, связь с PLAN Steps 8–11): `ai/docs/refactoring-plan-design-doll-controls.md`
