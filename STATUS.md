# PoseFlow Editor — Status

## Текущая версия: v0.3.0-dev

**Дата:** 2026-04-30

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
- Две cyan-дуговые стрелки у `NECK` — изгиб вперёд/назад bendX, лимит ±45°
- Две cyan-дуговые стрелки у `NECK` — изгиб в сторону bendZ, лимит ±15°
- Гизмо ориентируется по torso: вверх от `MID_HIP` к `NECK`, горизонталь по линии плеч
- Боковой bendZ учитывает сторону камеры: со спины drag инвертируется, спереди остаётся прямым
- Радиус дуг bend-гизмо равен расстоянию `NECK↔MID_HIP`; фактическая длина дуг укорочена относительно первого варианта

**Визуализация дуги позвоночника:**
- Кость NECK→MID_HIP отрисовывается 4 сегментами по реальным позициям виртуальной цепочки
- `RigService.getVirtualPositions()` возвращает промежуточные позиции сегментов

### Контроллер шеи (Stage 2 — завершён)

**NeckController** (выделение: клик на NOSE):
- Фиолетовое горизонтальное кольцо — скручивание twistY, лимит ±45°
- Две cyan-дуговые стрелки (YZ) — изгиб вперёд/назад bendX, лимит ±45°
- Две cyan-дуговые стрелки (XY) — боковой изгиб bendZ, лимит ±30°
- Гизмо ориентируется по torso: вверх от верхнего сегмента позвоночника к `NECK`, горизонталь по линии плеч
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

### Контроллер плеча (Stage 4.2 — завершён)

**ShoulderController** (выделение: клик на RIGHT_SHOULDER / LEFT_SHOULDER):
- Отдельные элементы выделения `shoulder_r` / `shoulder_l`
- 4 стрелки FK у выбранного плеча: вверх/вниз и вперёд/назад; цвет стрелок — единый gizmo cyan `#00ccff`
- Двигаются кости `1-2` и `1-5` относительно узла `1` (`NECK`): точка плеча поднимается/опускается или уходит вперёд/назад, рука следует за плечом
- Длины `NECK→SHOULDER`, `SHOULDER→ELBOW`, `ELBOW→WRIST` сохраняются rotation-tree моделью
- Лимиты: raise/lower −75°/+120°, forward/back −60°/+90°
- `shoulderFK.ts`: pure-логика clamp и применения shoulder FK к сегментам `NECK→SHOULDER`
- `RigService`: `applyShoulderRaise`, `applyShoulderForward`
- Совместимость: после shoulder FK продолжает работать wrist IK и elbow twist
- **186 unit-тестов**

### Контроллер ног (Stage 6 — завершён)

**LegController** (выделение: клик на RIGHT_KNEE / RIGHT_ANKLE или LEFT_KNEE / LEFT_ANKLE):
- **Сфера на лодыжке** — camera-plane drag → FABRIK IK для цепочки `HIP→KNEE→ANKLE`
- **Дуга скручивания колена** — дуга ±45° с двумя cyan-стрелками; drag dx → вращение колена вокруг оси `HIP→ANKLE`
- Направление drag у knee twist учитывает front/back вид: спереди инвертируется, сзади остаётся прямым
- Повторный ankle IK сохраняет выставленную twist-плоскость колена и не сбрасывает колено в дефолтную позицию
- Rest-геометрия пятки выровнена по оси `ANKLE -> midpoint(BIG_TOE, SMALL_TOE)` в виде сверху
- Hip фиксирован при ankle IK; при knee twist hip и ankle остаются на месте
- Естественные лимиты: колено вперёд до 85° / назад 0°; бедро вперёд до 120°, назад до 20°, наружу до 50°, внутрь до 30°
- При drag лодыжки недопустимая цель не проецируется в новую позу: движение останавливается у последней допустимой позиции
- `legIK.ts`: `solveLegFABRIK`, `twistKnee`, ограничения колена и бедра
- `RigService`: `applyLegIK`, `applyKneeTwist`
- **209 unit-тестов**

### Контроллер стоп (Stage 7 — завершён первым срезом)

**FootController** (выделение: клик на `BIG_TOE`, `SMALL_TOE` или `HEEL` выбранной стороны):
- Pivot у `ANKLE`; `HIP`, `KNEE` и `ANKLE` не смещаются при вращении стопы
- Pitch/yaw/roll вращают `{BIG_TOE, SMALL_TOE, HEEL}` как жёсткую группу
- Лимиты: pitch `-50°..+30°`, yaw `-35°..+35°`, roll `-25°..+25°`
- Pitch "на себя/от себя" управляется двумя cyan-стрелками вверх/вниз из центра отрезка между пальцами
- Yaw "вправо/влево" управляется cyan-блоком у пальцев: стрелка из большого пальца наружу, отрезок между пальцами, стрелка из малого пальца наружу
- Roll управляется cyan-окружностью с центром в середине отрезка между пальцами; плоскость окружности перпендикулярна линии `HEEL -> midpoint(BIG_TOE, SMALL_TOE)`
- Направления mouse drag согласованы ручной проверкой: pitch работает одинаковым знаком для обеих стоп; yaw и roll используют локальную сторону стопы, со стороны носка знак инвертируется, со стороны пятки остаётся прямым
- Roll-кольцо управляется как "колёсико" через угловой drag вокруг экранного центра; hit-зона кольца уменьшена, чтобы не перехватывать yaw-стрелки
- Плоскости вращения привязаны к голени: yaw идёт в плоскости, перпендикулярной кости голени; pitch — в плоскости, проходящей через кость голени и середину пальцев
- `SkeletonRig`: отдельный слой `footAngles` / `footRotations`; `resolveSkeleton()` применяет его только к дочерним точкам стопы
- `RigService`: `applyFootRotation`
- **216 unit-тестов**

### Инженерный workflow для vibe coding — обновлён
- `PLAN.md` актуализирован как текущий roadmap; Stage 7 FootController выполнен первым срезом
- `AGENTS.md` синхронизирован с rotation-tree архитектурой, командами качества и текущим статусом
- Добавлен обязательный шаблон фичи: `ai/docs/feature-task-template.md`
- Перед каждой non-Lite задачей требуется **current-state probe**: `git status --short`, `STATUS.md`, `PLAN.md`, `AGENTS.md`, релевантный код
- Для controller/gizmo правок сначала фиксируется расчёт механики: pivot, оси, плоскости, расположение, стороны манекена и таблица направлений mouse drag по видам камеры
- Добавлен R3F smoke/manual checklist: `ai/docs/r3f-smoke-manual-checklist.md`
- Устаревшие планы перенесены/помечены как archive/reference; активная навигация: `plans/README.md`, `ai/docs/README.md`
- Команда качества: `npm run verify` = typecheck app/node + 216 tests + Vite/Electron build
- Отдельный cleanup-слой: `npm run lint:unused` = строгая проверка unused locals/parameters
- Старые ignored-отчёты тестирования удалены из `poseflow/`

---

## В работе (следующие этапы)

| Stage | Элемент | Статус |
|-------|---------|--------|
| Stage 5.0 | Визуальный фундамент кистей (HandPrimitive) | ✅ Готово |
| Stage 5.x | Кисти (HandController) | ⬜ Отложено |
| Stage 6.1 | Ноги (Ankle IK) | ✅ Готово |
| Stage 6.2 | Колено (Knee twist gizmo) | ✅ Готово |
| Stage 7 | Стопы (FootController) | ✅ Готово |

---

## Известные ограничения
- Нет полноценных кистей: есть только визуальный примитив ладони без пальцев и управления ориентацией
- Нет продвинутого управления стопами: пальцы/пятка пока вращаются только как жёсткая группа вокруг лодыжки
- Нет управления несколькими скелетами
- Нет центра тяжести

---

## Последняя проверка

2026-04-30: `npm run typecheck` прошёл после согласования mouse drag для foot pitch/yaw/roll. Последний полный `npm run verify` проходил после привязки плоскостей FootController к голени: 216 unit-тестов и Vite/Electron build OK. Ручная проверка подтвердила pitch, yaw, roll и попадание в yaw/roll-гизмо; визуальный browser smoke по полному чек-листу не запускался.
# Session note 2026-05-01 / Head pivot and neck bend pivot

Head pitch/roll manual checks found a pivot mismatch: head bend should rotate around the neck segment junction, not around BODY_25 point 1. Runtime now rotates the rigid head block around `virtualPositions.neck[0]`. Neck bend now uses a hinge at point 1 via `setBendAtStart`; twist distribution was left unchanged. Technical checks passed: `npm run typecheck`; `VirtualChain` and `resolveSkeleton` unit tests.

# Session note 2026-05-01 / Neck lateral bend

`NeckController` lateral bend was checked by manual table. Forward/back bend and twist were accepted; lateral bend had a stable issue where the left arrow from the mannequin point of view was inverted while the right arrow was correct. Applied a one-line fix so the left lateral arrow uses the opposite `bendZ` sign. Technical checks passed: `npm run typecheck`; `coordinateFrames` unit tests. Manual re-check of the corrected left arrow is still needed.

Superseded 2026-05-02: neck controls were rechecked during the coordinate-frame pass and accepted by the user.

# Session note 2026-05-01

Coordinate Frame Contract is in progress. The helper layer and unit tests were added, and Stage 7 foot controls remain accepted. Head pitch migration is postponed because the pilot behavior was not accepted. Neck controls are not closed: after the projected-drag migration the user reported remaining problems, so the next session should begin with a calculated/manual table for neck forward/back, right/left, and twist before any code edits. Do not continue migrating spine/pelvis circular gizmos until the neck is stable.

Latest technical checks before stopping: `coordinateFrames` unit tests passed; `npm run typecheck` passed. Manual neck validation is incomplete.

Superseded 2026-05-02: the coordinate-frame/root-gizmo pass was completed, and neck/head/spine/pelvis/root controls were manually accepted.

# Session note 2026-05-02 / Gizmo coordinate-frame pass

Completed the ordered audit/fix pass for gizmo coordinate binding. Manually accepted by the user:

- ShoulderController arrows follow the torso frame and drag along local visible arrows.
- SpineController bend arrows and twist ring follow the torso frame; the back bend arrow sign was corrected.
- HeadController roll follows the local head arc; pitch and yaw remained accepted.
- ArmController elbow twist uses angular drag around the current shoulder-wrist axis.
- LegController knee twist uses angular drag around the current hip-ankle axis.
- FootController pitch/yaw use current local foot axes; roll remains accepted as the wheel-style angular ring.
- PelvisController/root gizmo at node 8 follows `rootRotation`; its rings use angular drag, translation uses visible local axes, and ring radius is doubled.

Notes for future work: natural arm limits and leg limit refinement are documented in `PLAN.md`; do not mix them into coordinate-frame cleanup. Right/left in user feedback means the mannequin/skeleton side, not the camera-view side.

Latest technical checks in this pass: repeated `npm run typecheck`; targeted vitest runs for shoulder, coordinate/resolve, arm, leg, foot, and Stage 1 root logic all passed. Final cleanup passed `npm run lint:unused` and full `npm run verify` (227 unit tests + Vite/Electron build). Manual validation accepted all listed gizmos including node 8.

# Session note 2026-05-02 / Joint anatomy markers

Added visual-only caps for elbows and knees in `Skeleton3D`. The markers show elbow protrusion / kneecap placement without changing BODY_25 export, selection, IK/FK, or undo/redo. Direction is computed from the current limb bend (`joint - closestPointOnAxis(parent -> child)`) and falls back to mannequin body direction for nearly straight limbs.

Technical checks: `jointMarkers` unit tests passed; `npm run typecheck` passed; `npm run lint:unused` passed; full `npm run verify` passed (229 unit tests + Vite/Electron build). Manual visual check is still needed for marker size and readability in the running viewport.

2026-05-02 follow-up fix: marker direction now uses the closest point on the `parent -> child` limb axis instead of `midpoint(parent, child)`. This keeps markers on the joint when a straight limb has unequal adjacent bone lengths. Regression test added for that case; `jointMarkers` tests and `npm run typecheck` passed.
