# PoseFlow Editor — Status

## Текущая версия: v0.3.0-dev

**Дата:** 2026-04-27

---

## Завершено

### Базовый редактор (v0.2.0)
- Скелет BODY_25: 25 суставов, 24 кости, OpenPose-цвета
- 10 пресетов поз (T, A, Standing, Sitting, Walking, Running, Jumping, Dancing, Waving, Arms Crossed)
- Компас камеры: 9 видов + сброс
- Рамка экспорта: crop, 8 ручек, соотношения сторон, разрешение 1K/2K/4K
- Экспорт PNG / JSON (OpenPose формат, Liang-Barsky клиппинг)
- Electron + Python FastAPI backend, IPC
- Настройки: тема, цвета канваса, скорости камеры (localStorage)
- Мини-вид (второй Canvas, вид сбоку)

### Архитектура rotation-tree (Stage 0 — завершён)
- **`src/lib/rig/`**: `SkeletonRig`, `RestPose`, `VirtualChain`, `resolveSkeleton`, `inverseFK`, `elements`
- **`RigService`** — первичный источник истины позы; `PoseService` — тонкая обёртка над ним
- **`SelectionService`** — выделение элемента кликом по суставу/кости
- FK-обход от корня (MID_HIP), виртуальные цепочки для позвоночника (4 сег.) и шеи (2 сег.)
- InverseFK: восстановление `localRotations` из PoseData (для пресетов)
- Пропорции скелета: shoulder = 1.2 × hip, плечо:предплечье ≈ 1.20:1, бедро:голень ≈ 1.22:1
- **144 unit-теста**, TS чистый

### Контроллеры (Stage 1 — завершён)

**PelvisController** (выделение: клик на MID_HIP / RIGHT_HIP / LEFT_HIP):
- 3 стрелки трансляции (X/Y/Z) — camera-plane raycasting, проекция на ось
- 3 кольца вращения (X/Y/Z) — 0.006 tube radius

**SpineController** (выделение: клик на NECK / SHOULDER):
- Фиолетовое горизонтальное кольцо (XZ) — скручивание twistY, лимит ±45°
- Оранжевое вертикальное кольцо (YZ) — изгиб вперёд/назад bendX, лимит ±45°
- Жёлтое вертикальное кольцо (XY) — изгиб в сторону bendZ, лимит ±15°

**Визуализация дуги позвоночника:**
- Кость NECK→MID_HIP отрисовывается 4 сегментами по реальным позициям виртуальной цепочки
- `RigService.getVirtualPositions()` возвращает промежуточные позиции сегментов

---

## В работе (следующие этапы)

По плану `C:\Users\Max\.claude\plans\zippy-zooming-crescent.md`:

| Stage | Элемент | Статус |
|-------|---------|--------|
| Stage 2 | Шея (NeckController) | ⬜ Ожидает интервью |
| Stage 3 | Голова (HeadController) | ⬜ Ожидает |
| Stage 4 | Руки (ArmController, FABRIK IK) | ⬜ Ожидает |
| Stage 5 | Кисти (HandController) | ⬜ Ожидает |
| Stage 6 | Ноги (LegController, FABRIK IK) | ⬜ Ожидает |
| Stage 7 | Стопы (FootController) | ⬜ Ожидает |

---

## Известные ограничения
- Шея, голова, руки, кисти, ноги, стопы ещё не имеют контроллеров — только выделение кликом
- Виртуальная дуга шеи (NECK→NOSE) рисуется одной костью (аналогично spine до Stage 1)
- Нет управления несколькими скелетами
- Нет центра тяжести
