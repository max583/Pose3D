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

### Контроллер шеи (Stage 2 — завершён)

**NeckController** (выделение: клик на NOSE):
- Фиолетовое горизонтальное кольцо — скручивание twistY, лимит ±45°
- Оранжевое вертикальное кольцо (YZ) — изгиб вперёд/назад bendX, лимит ±45°
- Жёлтое вертикальное кольцо (XY) — боковой изгиб bendZ, лимит ±30°
- Кость NECK→NOSE отрисовывается 2 сегментами шейной дуги
- `RigService`: `applyNeckBend`, `applyNeckTwist`
- **152 unit-теста**

### Контроллер головы (Stage 3 — завершён)

**HeadController** (выделение: клик на RIGHT_EYE / LEFT_EYE / RIGHT_EAR / LEFT_EAR):
- Голова = жёсткий блок {NOSE, глаза, уши}, pivot = NECK
- Фиолетовое горизонтальное кольцо — поворот yaw, лимит ±80°
- Оранжевое вертикальное кольцо (YZ) — кивок pitch, лимит −30°/+45° (асимметричный)
- Жёлтое вертикальное кольцо (XY) — боковой наклон roll, лимит ±30°
- Гизмо позиционируется у NOSE; вращение вокруг NECK
- `SkeletonRig`: `headAngles` + `headRotation: Quaternion` (YXZ Euler)
- `RigService`: `applyHeadPitch`, `applyHeadYaw`, `applyHeadRoll`
- **162 unit-теста**

### Контроллер рук (Stage 4.1 — завершён)

**ArmController** (выделение: клик на RIGHT_ELBOW / RIGHT_WRIST или LEFT_ELBOW / LEFT_WRIST):
- **Сфера на запястье** — camera-plane drag → FABRIK IK. Плечо фиксировано, цепочка плечо→локоть→запястье решается за 10 итераций
- **Дуга скручивания локтя** — дуга ±45° с двумя стрелками; radius = расстояние от локтя до оси плечо→запястье; drag dx → вращение вокруг этой оси
- `useCameraPlaneWorldDrag` — новый хук: плоскость ⊥ камере, raycast на каждый pointermove
- `armIK.ts`: `solveArmFABRIK`, `twistElbow`, `worldPosToLocalRot`, `applyArmChainToRig`
- `RigService`: `applyArmIK(side, x, y, z)`, `applyElbowTwist(side, delta)`
- **174 unit-теста**

---

## В работе (следующие этапы)

| Stage | Элемент | Статус |
|-------|---------|--------|
| Stage 4.2 | Плечо (ShoulderController) | ⬜ Следующий |
| Stage 5 | Кисти (HandController) | ⬜ Ожидает |
| Stage 6 | Ноги (LegController, FABRIK IK) | ⬜ Ожидает |
| Stage 7 | Стопы (FootController) | ⬜ Ожидает |

---

## Известные ограничения
- Плечо пока управляется только через spine (нет отдельного ShoulderController — Stage 4.2)
- Нет кистей, ног, стоп
- Нет управления несколькими скелетами
- Нет центра тяжести
