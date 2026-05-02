# Stage 4.2 — ShoulderController task brief

## 1. Название и цель

**Название:** Stage 4.2 — ShoulderController  
**Короткая цель:** добавить отдельный контроллер плечевого пояса для правой и левой стороны, не ломая текущий ArmController, FABRIK wrist IK и spine-chain.  
**Почему это важно для пользователя:** плечи должны пожиматься и уходить вперёд/назад как отдельные точки BODY_25 (`2` и `5`) относительно `NECK` (`1`), а не только менять положение локтя/кисти.

---

## 2. Контекст

### Current-state probe

**Команды/проверки:**

- [x] `git status --short` — рабочее дерево чистое перед подготовкой.
- [x] `STATUS.md` — текущий статус v0.3.0-dev, Stage 4.1 завершён, следующий шаг Stage 4.2.
- [x] `PLAN.md` — Stage 4.2 описан как следующий продуктовый шаг.
- [x] `AGENTS.md` — требует current-state probe, brief для non-Lite feature task, unit-тесты для новой логики, R3F smoke checklist для UI/drag.
- [x] Релевантные файлы кода: `Canvas3D.tsx`, `elements.ts`, `Skeleton3D.tsx`, `RigService.ts`, `SkeletonRig.ts`, `resolveSkeleton.ts`, `RestPose.ts`, `ArmController.tsx`, `armIK.ts`, `useGizmoDrag.ts`, `useCameraPlaneWorldDrag.ts`.
- [x] `poseflow/package.json` — `npm run verify` = typecheck + tests + Vite build.

**Что обнаружено:**

- Рабочее дерево: чистое.
- Актуальный следующий шаг: Stage 4.2 — ShoulderController.
- Реальные файлы/сервисы, которые уже существуют:
  - `RigService` владеет `SkeletonRig`, undo/redo и мутациями контроллеров.
  - `resolveSkeleton()` строит BODY_25 позиции через rotation-tree.
  - `ArmController` уже даёт wrist IK и elbow twist.
  - `armIK.ts` содержит переиспользуемые helper-функции: `ARM_JOINTS`, `getShoulderAccRot`, `worldPosToLocalRot`, `applyArmChainToRig`, `solveArmFABRIK`.
  - `JOINT_TO_ELEMENT` сейчас мапит `RIGHT_SHOULDER` / `LEFT_SHOULDER` в `spine`, отдельных `shoulder_r` / `shoulder_l` пока нет.
- Устаревшие или противоречивые записи: не найдены; `PLAN.md` и `STATUS.md` согласованы.
- Риски:
  - В текущей модели `localRotations[RIGHT_SHOULDER]` / `localRotations[LEFT_SHOULDER]` влияет на сегмент `NECK -> SHOULDER`, то есть может двигать плечевую точку относительно корпуса.
  - Нужная механика Stage 4.2 — движение сегментов `NECK -> RIGHT_SHOULDER` и `NECK -> LEFT_SHOULDER`; значит rotation записывается на shoulder joint, а не на elbow.
  - ShoulderController должен сосуществовать с `applyArmIK` и `applyElbowTwist`, которые уже меняют elbow/wrist rotations.

---

## 3. Зафиксированные параметры первого среза

### Оси

Первый срез использует 2 локальные оси плечевого пояса с визуальным стрелочным гизмо:

- **Raise/lower** — вертикальный подъём/опускание плечевой точки, вращение сегмента `NECK -> SHOULDER` вокруг локальной оси Z.
- **Forward/back** — движение плечевой точки вперёд/назад, вращение сегмента `NECK -> SHOULDER` вокруг локальной оси Y.
Оси считаются в локальной системе родителя плеча (`NECK`). Это сохраняет ожидаемое поведение после поворота таза и изгиба/скручивания spine.

### Лимиты

Стартовые лимиты консервативные, чтобы первый срез был управляемым:

- Raise/lower: `-75°..+120°`.
- Forward/back: `-60°..+90°`.

Лимиты надо хранить рядом с pure-логикой плеча, чтобы тестировать clamp без R3F.

### Поведение кисти

Для первого среза рука **следует за плечом**:

- `NECK` остаётся опорной точкой;
- точка плеча `RIGHT_SHOULDER` / `LEFT_SHOULDER` двигается по дуге вокруг `NECK`;
- плечо тянет за собой дочернюю цепочку `elbow -> wrist`;
- длины `NECK -> SHOULDER`, `SHOULDER -> ELBOW` и `ELBOW -> WRIST` сохраняются rotation-tree моделью;
- мировая позиция запястья не сохраняется специально.

Причина: это соответствует FK-манипуляции плечом, проще и предсказуемее для первого среза. Режим "держать кисть в мире" можно добавить позже как отдельный IK-lock, потому что он потребует пересчёта elbow/wrist через FABRIK после каждого shoulder rotation.

---

## 4. Границы задачи

**Входит в задачу:**

- Добавить `shoulder_r` / `shoulder_l` в selection model.
- Перемапить `RIGHT_SHOULDER` / `LEFT_SHOULDER` с `spine` на соответствующее плечо.
- Добавить pure-логику плеча в `src/lib/rig/`, например `shoulderFK.ts`.
- Добавить методы `RigService` для shoulder FK: отдельные delta-операции или один метод с axis/mode.
- Добавить `ShoulderController.tsx` с компактными стрелками вверх/вниз и вперёд/назад у выбранного плеча.
- Подключить контроллер в `Canvas3D`.
- Покрыть pure-логику и сервисные методы unit-тестами.

**Не входит в задачу:**

- IK-lock кисти при вращении плеча.
- HandController, LegController, FootController.
- Переписывание `ArmController`.
- Изменение export формата BODY_25.
- Архитектура нескольких скелетов.

**Файлы/модули, которые можно менять:**

- `poseflow/src/lib/rig/elements.ts`
- `poseflow/src/lib/rig/__tests__/elements.test.ts`
- `poseflow/src/lib/rig/shoulderFK.ts` (новый)
- `poseflow/src/lib/rig/__tests__/shoulderFK.test.ts` (новый)
- `poseflow/src/services/RigService.ts`
- `poseflow/src/services/__tests__/RigService.stage4.test.ts` или новый `RigService.stage4-2.test.ts`
- `poseflow/src/components/controllers/ShoulderController.tsx` (новый)
- `poseflow/src/components/Canvas3D.tsx`
- `STATUS.md`, `CHANGELOG.md`, `PLAN.md` после завершения пользовательски заметного этапа

**Не трогаем без отдельной причины:**

- backend/export service;
- Electron shell;
- presets;
- старые archived plans;
- DI container, если новый сервис не добавляется.

---

## 5. Поведение и UX

**Пользовательский сценарий:**

1. Пользователь кликает по `RIGHT_SHOULDER` или `LEFT_SHOULDER`.
2. Выделяется `shoulder_r` или `shoulder_l`; у соответствующего плеча появляются компактные стрелки вверх/вниз и вперёд/назад.
3. Drag стрелки двигает точку плеча вокруг `NECK`; локоть и кисть следуют за плечом, длины костей сохраняются.
4. `Ctrl+Z` отменяет один drag как один undo-шаг; `Ctrl+Y` / `Ctrl+Shift+Z` возвращает.
5. После shoulder FK пользователь всё ещё может выбрать локоть/запястье и пользоваться `ArmController`.

**Ожидаемое поведение:**

- Плечевая точка не отрывается от корпуса при FK-вращении плеча.
- Правая и левая сторона работают симметрично.
- `applyArmIK` после shoulder FK использует новую позу как стартовую и не ломает длины.
- `applyElbowTwist` после shoulder FK вращает локоть вокруг актуальной оси `shoulder -> wrist`.

**Ручная проверка:**

- [ ] Клик по правому плечу выбирает `shoulder_r`, по левому — `shoulder_l`.
- [ ] Drag каждой стрелки меняет только выбранную руку, без смещения torso/spine.
- [ ] Кисть следует за рукой при shoulder FK.
- [ ] После shoulder FK работает wrist IK.
- [ ] После shoulder FK работает elbow twist.
- [ ] Undo/redo после одного drag работает одним шагом.
- [ ] Mirror после изменения плеча не ломает управляемость рук.
- [ ] Пройти smoke-чеклист из `ai/docs/r3f-smoke-manual-checklist.md`.

---

## 6. Технический план

### Чистая логика

- Где лежит: `poseflow/src/lib/rig/shoulderFK.ts`.
- Предлагаемые функции:
  - `clampShoulderAngles(angles): ShoulderAngles`
  - `applyShoulderDelta(rig, side, delta): void`
  - `getShoulderBasis(rig, side)` или аналогичный helper для локальных осей.
- Edge cases:
  - delta `0` не меняет позу;
  - превышение лимита clamp-ится;
  - левая и правая сторона не влияют друг на друга.

### UI/R3F интеграция

- Компонент: `poseflow/src/components/controllers/ShoulderController.tsx`.
- Визуально: компактные стрелки вверх/вниз и вперёд/назад у выбранного плеча; не перекрывать wrist sphere и elbow twist arc.
- Pointer/drag: `useGizmoDrag`; `beginDrag()` вызывается один раз на pointer down.
- Undo/redo: через существующий паттерн `RigService.beginDrag()`.

### Сервисы

- `RigService`:
  - добавить метод(ы) для shoulder FK;
  - инвалидировать resolved cache;
  - notify listeners;
  - не добавлять undo push внутри apply-методов, если они вызываются во время drag.
- `PoseService`: не менять, если public API не требуется.
- `SelectionService`: вероятно, не менять; достаточно обновить `elements.ts`.

---

## 7. Тесты

**Unit-тесты:**

- [ ] `elements.test.ts`: `RIGHT_SHOULDER -> shoulder_r`, `LEFT_SHOULDER -> shoulder_l`, суммарно 25 joints.
- [ ] `shoulderFK.test.ts`: happy path — shoulder FK двигает shoulder/elbow/wrist вокруг `NECK` и сохраняет длины костей.
- [ ] `shoulderFK.test.ts`: edge case — clamp лимитов.
- [ ] `RigService.stage4-2.test.ts`: `beginDrag + applyShoulder... + undo` возвращает исходную позу.
- [ ] `RigService.stage4-2.test.ts`: правая сторона не двигает левую.

**Что не тестируем unit-тестами и почему:**

- R3F rendering, pointer hit areas, OrbitControls during drag — проверяется вручную по R3F smoke checklist.

---

## 8. Acceptance Criteria

- [ ] Клик по `RIGHT_SHOULDER` / `LEFT_SHOULDER` выбирает `shoulder_r` / `shoulder_l`.
- [ ] ShoulderController виден у выбранного плеча.
- [ ] Drag контроллера двигает точку `RIGHT_SHOULDER` / `LEFT_SHOULDER` вокруг `NECK`.
- [ ] Кисть следует за рукой; IK-lock кисти не реализуется в первом срезе.
- [ ] Длины `NECK -> SHOULDER`, `SHOULDER -> ELBOW` и `ELBOW -> WRIST` сохраняются.
- [ ] `ArmController` продолжает работать после shoulder FK.
- [ ] Один drag даёт один undo-снимок.
- [ ] Новая чистая логика покрыта unit-тестами.
- [ ] `npm run verify` проходит.
- [ ] R3F smoke checklist выполнен или явно отмечен как не запущенный с причиной.
- [ ] `CHANGELOG.md`, `STATUS.md`, `PLAN.md` обновлены после завершения реализации.

---

## 9. Итог подготовки

**Изменённые файлы подготовки:**

- `ai/tasks/stage-4.2-shoulder-controller.md`
- `PLAN.md`

**Изменённые файлы реализации:**

- `poseflow/src/lib/rig/shoulderFK.ts`
- `poseflow/src/lib/rig/SkeletonRig.ts`
- `poseflow/src/services/RigService.ts`
- `poseflow/src/lib/rig/elements.ts`
- `poseflow/src/components/controllers/ShoulderController.tsx`
- `poseflow/src/components/Canvas3D.tsx`
- `poseflow/src/lib/rig/__tests__/shoulderFK.test.ts`
- `poseflow/src/lib/rig/__tests__/elements.test.ts`
- `poseflow/src/services/__tests__/RigService.stage4-2.test.ts`
- `CHANGELOG.md`
- `STATUS.md`
- `PLAN.md`

**Проверки подготовки:**

- `git status --short`
- `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/shoulderFK.test.ts src/lib/rig/__tests__/elements.test.ts src/services/__tests__/RigService.stage4-2.test.ts`: 21 passed.
- `npm run typecheck`: passed.
- `npm run verify`: typecheck + 186 tests + Vite/Electron build passed.
- `npm run lint:unused`: passed.
- Manual R3F smoke: not run; in-app browser could not start because node_repl requires Node >=22.22.0, while the available Node is 22.14.0. Dev server was started, responded 200 on `127.0.0.1:5173`, then stopped.

**Остаточные риски / follow-up:**

- Перед реализацией стоит ещё раз проверить, не удобнее ли хранить shoulder FK angles явно в `SkeletonRig`. Первый срез можно сделать через существующие quaternions, но если понадобится отображать текущие углы/лимиты стабильно после IK, отдельное состояние углов может быть чище.
