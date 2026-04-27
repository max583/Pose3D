# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версия продукта см. также [`STATUS.md`](STATUS.md).

## [Unreleased]

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
