# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версия продукта см. также [`STATUS.md`](STATUS.md).

## [Unreleased]

### Added — Stage 4.1: IK рук (2026-04-27)

- **ArmController**: сфера на запястье для camera-plane FABRIK drag + дуга скручивания локтя ±45° (quarter-torus со стрелками, drag = вращение вокруг оси плечо→запястье)
- `useCameraPlaneWorldDrag` — хук camera-plane drag: плоскость ⊥ камере, raycast → абсолютная мировая позиция
- `armIK.ts`: `solveArmFABRIK`, `twistElbow`, `worldPosToLocalRot`, `applyArmChainToRig` — чистые функции
- `RigService`: `applyArmIK(side, x, y, z)`, `applyElbowTwist(side, delta)`
- Активация: клик на локоть/запястье → selectedElement='arm_r'/'arm_l'
- **174 unit-теста** (было 162)

### Added — Stage 3: Head controller (2026-04-27)

- **HeadController**: 3 кольца у NOSE — yaw (±80°), pitch (−30°/+45°), roll (±30°)
- Голова как жёсткий блок: NOSE + глаза + уши вращаются вокруг NECK как единое целое
- `SkeletonRig`: `headAngles { pitch, yaw, roll }` + `headRotation: Quaternion` (YXZ Euler)
- `resolveSkeleton`: `headRotation` применяется к вектору NECK→NOSE, шейная дуга обновляется
- `RigService`: `applyHeadPitch`, `applyHeadYaw`, `applyHeadRoll`
- Активация: клик на глаза/уши → selectedElement='head'
- **162 unit-теста** (было 152)

### Added — Stage 2: Neck controller (2026-04-27)

- **NeckController**: 3 кольца у NECK — twist (±45°), forward bend (±45°), lateral bend (±30°)
- Дуга шеи: кость NECK→NOSE заменена 2 сегментами VirtualChain
- `RigService`: `applyNeckBend(deltaX, deltaZ)`, `applyNeckTwist(delta)`
- `SkeletonRig`: `neckAngles { bendX, bendZ, twistY }` синхронизированы с neck VirtualChain
- Активация: клик на NOSE → selectedElement='neck'
- **152 unit-теста** (было 144)

### Added — Stage 1: Pelvis + Spine controllers (2026-04-27)

- **PelvisController**: 3 стрелки трансляции (X/Y/Z, camera-plane drag) + 3 кольца вращения
- **SpineController**: кольцо скручивания ±45° (горизонт. XZ), кольцо изгиба вперёд/назад ±45° (верт. YZ), кольцо бокового изгиба ±15° (верт. XY)
- **Дуга позвоночника**: кость NECK→MID_HIP заменена 4 сегментами по реальным позициям VirtualChain; `RigService.getVirtualPositions()`
- `useGizmoDrag` хук: отключает OrbitControls на время drag, screen-delta callbacks
- `RigService`: `beginDrag()`, `applyPelvisTranslate/Rotate`, `applySpineBend`, `applySpineTwist`
- `SkeletonRig`: поля `spineAngles` / `neckAngles` — синхронизированы с VirtualChain, клонируются в undo/redo
- Клик по суставу/кости → выделение элемента, гизмо видны только у выделенного
- **144 unit-теста** (было 131 после Stage 0)

### Added — Stage 0: Rotation-tree архитектура (2026-04-27)

- `src/lib/rig/`: `SkeletonRig`, `RestPose`, `VirtualChain`, `resolveSkeleton`, `inverseFK`, `elements`
- `RigService` — первичный источник истины; `PoseService` — обёртка для совместимости
- `SelectionService` — выделение элементов тела кликом
- Удалён весь экспериментальный код предыдущих попыток (`MainControllers`, `DragAdapter`, `SpineChain`, `SkullGroup`, `FixedLengthSolver`, `FeatureFlagIntegration`)
- Пропорции: shoulder = 1.2 × hip, плечо:предплечье ≈ 1.20:1, бедро:голень ≈ 1.22:1
- **131 unit-тест**

### Added

- Инженерные практики: ADR (`ai/decisions/`), `CHANGELOG.md`, граница логика/UI в `CLAUDE.md` (P1).

### Changed

- Архивация устаревших документов планов: `priority-improvement-plan.md`, `architecture-improvement-recommendations.md`, `drag-system-analysis-design-doll-plan.md`, `phase0-implementation-plan.md` перемещены в `plans/archive/` с меткой `[ARCHIVED]` (2026-04-18).

## [0.2.0] — 2026-04-15

### Added

- Редактор позы PoseFlow: скелет OpenPose **BODY_25** (25 точек, 24 кости), пресеты поз, компас камеры (9 видов + сброс).
- **Экспорт**: PNG и JSON в формате OpenPose; рамка экспорта с crop, соотношения сторон и разрешения 1K/2K/4K; выравнивание проекции к viewport.
- **Electron** и Python **FastAPI** backend (health, экспорт), IPC.
- Настройки приложения: тема, цвета канваса, скорости камеры, умолчания экспорта (localStorage).
- **DesignDoll-style шаги 1–7**: camera-plane drag, Undo/Redo, `SkeletonGraph` + FK, FABRIK IK, переключатель FK/IK, зеркалирование, link/unlink суставов.
- Тесты **Vitest** (`poseflow/vitest.config.ts`), unit-тесты для ключевой логики.

### Documentation

- `ai/docs/design-doll-controls-poseflow-spec.md`, `ai/docs/refactoring-plan-design-doll-controls.md`, `ai/docs/engineering-practices-improvement-plan.md`, `ai/docs/backlog-matrix.md`.

### Known limitations

- Нет ограничения длины кости при FK drag (возможен stretch).
- Нет мини-вида, нескольких скелетов, сфер центра тяжести и кольцевых гизмо (см. `PLAN.md`).
