# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версия продукта см. также [`STATUS.md`](STATUS.md).

## [Unreleased]

### Added - Joint anatomy markers (2026-05-02)

- Elbow and knee joints now have small visual-only caps that make elbow protrusions and kneecap positions easier to read.
- The markers follow the current limb bend direction and fall back to the mannequin body direction when a limb is nearly straight.
- Markers are non-interactive and do not affect BODY_25 export, selection, IK/FK, or undo/redo.

### Fixed — Gizmo coordinate-frame pass (2026-05-02)

- Shoulder, spine, head roll, elbow twist, knee twist and foot pitch/yaw gizmo controls now use body/limb/foot-local frames instead of raw world/screen axes where appropriate.
- Spine bend arrows and twist ring were reworked to follow the torso frame; the back-side bend arrow sign was corrected after manual validation.
- Shoulder arrows now follow the torso frame and project mouse drag along the visible local arrow direction.
- Head roll now follows the local head arc, matching the already accepted head pitch behavior.
- Elbow and knee twist arcs now use angular drag around the gizmo center, with sign based on the current limb axis.
- Foot pitch/yaw now project drag along the current local foot axes; pitch, yaw and roll were manually accepted for both feet.

### Fixed — Root gizmo at node 8 (2026-05-02)

- `PelvisController` now follows `rootRotation`: translation arrows and rotation rings stay aligned with the mannequin after whole-body rotations.
- Translation arrows move the root along the visible local skeleton axes.
- Root rotation rings now use circular/angular drag instead of raw screen `dx/dy`.
- Root rotation rings were enlarged from radius `0.30` to `0.60`.
- Added `RigService.applyPelvisRotateLocal(axis, angle)` for rotating the skeleton root around its current local axes.

### Added — Stage 7: FootController (2026-04-30)

- **FootController**: при выборе `BIG_TOE`, `SMALL_TOE` или `HEEL` появляются controls для pitch/yaw/roll стопы.
- Стопа вращается как жёсткая группа `{BIG_TOE, SMALL_TOE, HEEL}` вокруг `ANKLE`; `HIP`, `KNEE` и `ANKLE` не смещаются.
- `SkeletonRig`: добавлен отдельный слой `footAngles` / `footRotations`, чтобы вращение стопы не конфликтовало с IK голени.
- `footFK.ts`: чистая логика лимитов и применения delta; pitch `-50°..+30°`, yaw `-35°..+35°`, roll `-25°..+25°`.
- `RigService.applyFootRotation(side, axis, delta)` и unit-тесты Stage 7.

### Changed — FootController pitch gizmo (2026-04-30)

- Pitch "стопа на себя/от себя" перенесён с дуги у лодыжки на две вертикальные cyan-стрелки из центра отрезка между большим и малым пальцами.
- Pitch теперь вращает стопу в плоскости стрелок gizmo: ось вращения совпадает с линией между большим и малым пальцами.
- Foot rotation теперь строит плоскости относительно голени: yaw вращается вокруг оси голени, pitch — в плоскости `голень + середина пальцев`, чтобы движения не накапливали крен стопы.

### Changed — FootController yaw gizmo (2026-04-30)

- Yaw "вправо/влево" перенесён к пальцам: стрелка из большого пальца наружу, cyan-отрезок между пальцами и стрелка из малого пальца наружу.

### Changed — FootController roll gizmo (2026-04-30)

- Roll-контроллер заменён на cyan-окружность с центром в середине отрезка между пальцами.
- Плоскость roll-окружности перпендикулярна линии `HEEL -> midpoint(BIG_TOE, SMALL_TOE)`, чтобы гизмо крена визуально совпадало с продольной осью стопы.
- Pitch/yaw/roll foot-гизмо согласованы по направлениям mouse drag: pitch использует единый знак для обеих стоп, yaw и roll инвертируются со стороны носка и остаются прямыми со стороны пятки.
- Roll-кольцо теперь работает как "колёсико": drag считается по изменению угла мыши вокруг экранного центра кольца.
- Hit-зона roll-кольца уменьшена, чтобы оно не перехватывало yaw-стрелки у пальцев.

### Added — Stage 6: LegController ankle IK + knee twist (2026-04-29)

- **LegController**: IK-сфера у `RIGHT_ANKLE` / `LEFT_ANKLE` для camera-plane drag выбранной ноги.
- **Knee twist gizmo**: дуга со стрелками у колена для вращения колена вокруг оси `HIP -> ANKLE`; hip и ankle остаются на месте.
- `legIK.ts`: FABRIK для цепочки `HIP -> KNEE -> ANKLE`, запись local rotations в rotation-tree rig.
- `legIK.ts`: `twistKnee(hip, knee, ankle, delta)` для чистой геометрии Stage 6.2.
- Добавлены естественные лимиты сгиба колена: вперёд до 85°, назад 0°.
- Добавлены естественные лимиты направления бедра: вперёд до 120°, назад до 20°, наружу до 50°, внутрь до 30°.
- `RigService.applyLegIK(side, x, y, z)`: бедро фиксировано, колено и лодыжка решаются FABRIK, длины костей сохраняются.
- `RigService.applyKneeTwist(side, delta)`: вращение колена вокруг оси ноги с сохранением длин костей.
- `Canvas3D`: подключение `LegController` для `leg_r` / `leg_l`.
- Добавлены unit-тесты pure-логики и сервисного поведения Stage 6.

### Fixed — Leg IK limit stop (2026-04-29)

- `RigService.applyLegIK`: при drag лодыжки цель, нарушающая лимиты бедра/колена, теперь не применяется; лодыжка останавливается у последней допустимой позиции вместо скачка в скорректированную позу.
- `legIK.ts`: добавлена reject-on-limit проверка `solveLegIKWithinLimits`.
- Добавлены unit-тесты на остановку у лимита бедра и продолжение движения после возврата цели в допустимую область.

### Changed — Knee bend limits (2026-04-29)

- Обратный сгиб колена отключён: IK ноги теперь строит колено только в сторону естественного сгиба вперёд.
- Старый допуск переразгиба назад `10°` заменён на `0°`, чтобы колено не выбирало обратную сторону при drag лодыжки.

### Fixed — Knee twist view direction (2026-04-30)

- Knee twist gizmo теперь инвертирует mouse drag при виде спереди и сохраняет прежнее направление при виде сзади.
- Front/back определяется относительно направления тела, вычисленного по hips и `MID_HIP -> NECK`.
- Базовый знак drag для knee twist инвертирован после ручной проверки направления с обеих сторон.

### Fixed — Leg IK preserves knee twist (2026-04-30)

- Ankle IK теперь сохраняет текущую twist-плоскость колена после работы knee gizmo и не возвращает колено скачком в дефолтную плоскость.
- `constrainKneeBendPreserveTwist` использует текущую радиальную сторону колена вокруг оси `HIP -> ANKLE`; `bodyForward` остаётся fallback для почти прямой ноги.
- Добавлены регрессионные тесты на сценарий: согнуть ногу лодыжкой, повернуть колено гизмо, снова взять лодыжку.

### Fixed — Foot rest geometry (2026-04-30)

- Пятка в rest-позе выровнена по оси `ANKLE -> midpoint(BIG_TOE, SMALL_TOE)` в виде сверху, чтобы heel bone не смотрела в сторону.
- Добавлен unit-тест геометрии стопы для обеих сторон.

### Added — Sidebar collapse (2026-04-29)

- Левую панель инструментов теперь можно скрыть кнопкой `←`; в свернутом состоянии остается узкая ручка `→` для возврата панели.

### Fixed — NeckController lateral bend gizmo (2026-04-29)

- Боковые стрелки наклона шеи теперь не меняют направление в зависимости от выбранной стрелки; инверсия drag определяется только положением камеры относительно перед/зад тела.

### Added — Stage 5.0: Hand Visual Foundation (2026-04-29)

- **HandPrimitive**: визуальные примитивы ладоней у `RIGHT_WRIST` / `LEFT_WRIST`, ориентированные по направлению предплечья `ELBOW -> WRIST`
- Примитивы следуют за arm IK, elbow twist, shoulder FK, mirror и пресетами, потому что строятся из текущих BODY_25 позиций
- BODY_25 export не меняется: новые helper-точки не добавляются в `PoseData`, JSON/PNG остаются совместимыми с 25 keypoints
- Полноценный `HandController` с пальцами и ориентацией кисти оставлен на будущий Stage 5.x

### Changed — SpineController gizmo (2026-04-29)

- **SpineController**: оранжевое кольцо forward/back bend заменено на две дуговые стрелки у `NECK`
- Жёлтое кольцо lateral bend заменено на дуговые стрелки вправо/влево у `NECK`
- Гизмо позвоночника теперь ориентируется по положению тела: ось вверх берётся от `MID_HIP` к `NECK`, горизонталь — по линии плеч
- Боковые стрелки изгиба позвоночника инвертируют drag только когда камера смотрит со стороны спины тела
- Радиус дуг spine bend-гизмо равен расстоянию `NECK↔MID_HIP`, при этом фактическая длина дуги укорочена
- **NeckController**: оранжевое и жёлтое кольца наклона заменены на похожие cyan-дуговые стрелки; радиусы дуг сохранены, наконечники сделаны компактнее
- Шейное гизмо теперь ориентируется по положению тела: ось вверх берётся от верхнего сегмента позвоночника к `NECK`, горизонталь — по линии плеч

### Added — Stage 4.2: ShoulderController (2026-04-28)

- **ShoulderController**: отдельные стрелки для правого и левого плеча, активируются кликом по `RIGHT_SHOULDER` / `LEFT_SHOULDER`
- Поворот плечевого пояса вокруг `NECK`: кости `1-2` и `1-5` двигают точки плеч вверх/вниз и вперёд/назад, рука следует за плечом
- `shoulderFK.ts`: чистая логика лимитов и применения shoulder FK к сегментам `NECK -> SHOULDER`
- `RigService`: `applyShoulderRaise`, `applyShoulderForward`
- Selection model: добавлены `shoulder_r` / `shoulder_l`
- **186 unit-тестов** (было 174)

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
# Unreleased

- Changed head bend pivot to the neck segment junction and made neck bend hinge at BODY_25 point 1.
- Fixed `NeckController` lateral bend: the left arrow from the mannequin point of view now uses the same intuitive mouse direction as the right arrow.
