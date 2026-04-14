# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версия продукта см. также [`STATUS.md`](STATUS.md).

## [Unreleased]

### Added

- Инженерные практики: ADR (`ai/decisions/`), `CHANGELOG.md`, граница логика/UI в `CLAUDE.md` (P1).

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
