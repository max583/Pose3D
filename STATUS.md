# PoseFlow Editor — Status

## Current version: v0.2.0

## Completed
- Инженерные практики P1: ADR (`ai/decisions/`, записи 0001–0002), `CHANGELOG.md` в корне, граница логика/UI и ссылки в `CLAUDE.md`
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
- Step 8 (Mini-view — second Canvas, 90° rotated): **IN PROGRESS** (component created, integration pending)
- Step 9 (Multiple skeletons): **PENDING** (architecture ready, UI pending)
- Step 10 (Center of gravity): **IN PROGRESS** (component created, integration pending)
- Step 11 (Ring gizmos for rotation): **IN PROGRESS** (component created, integration pending)

## Phase 4 Experimental Components Implemented
- **Phase 0: DI Container** ✅ ЗАВЕРШЕНО — Container, ServiceProvider, ServiceContext, graceful degradation, setupContainer в main.tsx
- **Phase 0: Feature Flags** ✅ ЗАВЕРШЕНО — FeatureFlagService с localStorage, registry 15+ флагов, FeatureFlagPanel UI, hooks
- **Feature Flags System**: Fully operational with UI panel, registry, and service
- **DI Container**: Implemented with service interfaces, activated and integrated
- **FixedLengthSolver**: Prototype for bone length preservation
- **MainControllers**: DesignDoll-style 7‑controller system
- **DragAdapter**: Bridge between legacy drag and DesignDoll controllers
- **SkullGroup**: Rigid head group implementation
- **SpineChain**: Virtual spine segments for smooth bending
- **Integration Tests**: FeatureFlagIntegration, unit tests for experimental modules

## Known issues
- Bone length constraints during FK drag not yet activated (stretch allowed)
- USE_FIXED_LENGTHS в PoseService — флаг реализован, но логика solver не интегрирована в updateJoint()
- Mini-view camera synchronization needs refinement
- Multiple skeletons UI not yet implemented
- Center of gravity drag integration incomplete
- Ring gizmos rotation solver needs integration with FK/IK
- Experimental components require performance optimization

## Roadmap (управление как в DesignDoll)
- Спецификация: `ai/docs/design-doll-controls-poseflow-spec.md`
- План рефакторинга (фазы A–E, связь с PLAN Steps 8–11): `ai/docs/refactoring-plan-design-doll-controls.md`
- План улучшений инженерных практик: `ai/docs/engineering-practices-improvement-plan.md` — **P0 и P1 выполнены** (см. также `CHANGELOG.md`, `ai/decisions/`)
- Phase 4 план реализации: `plans/phase4-implementation-plan.md` (детальный план)
- Phase 4 консолидированный документ: `plans/phase4-consolidated.md` (текущий статус, roadmap, Phase 5 планирование)
