# Stage 7 — FootController

## 1. Название и цель

**Название:** Stage 7 — FootController  
**Короткая цель:** управлять стопой как жёсткой группой `{ankle, big toe, small toe, heel}`.  
**Почему это важно:** после IK ноги нужна возможность выставлять направление стопы без ручного перетаскивания отдельных BODY_25 точек.

## 2. Контекст

### Current-state probe

- [x] `git status --short`
- [x] `STATUS.md`
- [x] `PLAN.md`
- [x] `AGENTS.md`
- [x] релевантные файлы: `SkeletonRig.ts`, `resolveSkeleton.ts`, `RestPose.ts`, `RigService.ts`, `LegController.tsx`, `Canvas3D.tsx`, `elements.ts`

**Что обнаружено:**

- Stage 6 завершён: ankle IK и knee twist работают через rotation-tree.
- `foot_r` / `foot_l` уже есть в selection model для toe/heel joints.
- В текущем дереве `ANKLE` используется как конец голени; поворот локального `ANKLE` двигает саму лодыжку, поэтому для стопы нужен отдельный foot rotation слой.
- Rest-геометрия пятки уже выровнена по оси `ANKLE -> midpoint(BIG_TOE, SMALL_TOE)`.

**Вывод:** первый срез Stage 7 должен хранить отдельные углы стопы в `SkeletonRig` и применять их в `resolveSkeleton()` только к дочерним точкам лодыжки.

## 3. Границы задачи

**Входит:**

- Pivot у `ANKLE`.
- Pitch/roll/yaw стопы как жёсткой группы toe/heel.
- Лимиты: pitch `-50°..+30°`, roll `-25°..+25°`, yaw `-35°..+35°`.
- `FootController` с cyan gizmo-стрелками.
- Unit-тесты pure-логики и `RigService`.

**Не входит:**

- Перетаскивание отдельных пальцев/пятки.
- Контакт стопы с полом.
- Автоматическая компенсация IK ноги при вращении стопы.
- Расширенный формат экспорта.

## 4. UX

1. Пользователь кликает по большому пальцу, малому пальцу или пятке.
2. Выделяется `foot_r` / `foot_l`.
3. Pitch-стрелки появляются в центре отрезка между пальцами; yaw-стрелки выходят наружу из большого и малого пальца; roll control — cyan-окружность в центре отрезка между пальцами, перпендикулярная линии `HEEL -> midpoint(BIG_TOE, SMALL_TOE)`.
4. Drag вращает toe/heel вокруг ankle, сама ankle и нога выше неё не смещаются.

## 5. Технический план

- `SkeletonRig`: добавить `footAngles` и `footRotations`.
- `resolveSkeleton`: для дочерних точек `ANKLE` применять дополнительный foot rotation поверх accumulated rotation голени.
- `footFK.ts`: чистая логика clamp/build/apply для стопы.
- `RigService`: `applyFootRotation(side, axis, delta)`.
- `FootController.tsx`: R3F controls у ankle.
- `Canvas3D.tsx`: рендер контроллера для `foot_r` / `foot_l`.

## 6. Тесты

- [x] `footFK`: clamp лимитов и сохранение ankle как pivot через resolve.
- [x] `RigService`: вращает toe/heel, не двигая ankle/knee.

## 7. Acceptance Criteria

- [x] Клик по toe/heel выбирает стопу.
- [x] Pitch/roll/yaw вращают `BIG_TOE`, `SMALL_TOE`, `HEEL` как группу вокруг `ANKLE`.
- [x] `ANKLE`, `KNEE`, `HIP` не двигаются от foot rotation.
- [x] Все стрелки gizmo cyan `#00ccff`; pitch-стрелки расположены в центре отрезка между пальцами, yaw-стрелки выходят наружу из пальцев, roll-окружность центрирована между пальцами и ориентирована перпендикулярно линии к пятке.
- [x] Undo/redo работает через `beginDrag()`.
- [x] `npm run verify` проходит.
- [x] `STATUS.md` / `CHANGELOG.md` обновлены.

## 8. Итог после выполнения

**Изменённые файлы:** `SkeletonRig.ts`, `resolveSkeleton.ts`, `footFK.ts`, `RigService.ts`, `FootController.tsx`, `Canvas3D.tsx`, тесты и документация.  
**Проверки:** `npx vitest run ...footFK...RigService.stage7...RestPose`, `npm run typecheck`, `npm run verify`.  
Дополнительно: регрессии проверяют, что yaw сохраняет компонент вдоль голени, а pitch после yaw остаётся в плоскости `голень + середина пальцев`.  
**Manual R3F:** визуальный browser smoke по полному чек-листу не запускался; ручная проверка foot pitch/yaw/roll выполнена по таблице сторон и видов.

## 9. Ручная сверка направлений

- [x] Pitch: правая и левая стопа согласованы после перехода на единый знак drag.
- [x] Yaw: со стороны пятки знак прямой, со стороны носка инвертируется; проверено для обеих стоп.
- [x] Roll: кольцо работает как "колёсико" через угловой drag вокруг экранного центра; со стороны пятки знак прямой, со стороны носка инвертируется.
- [x] UX попадания: hit-зона roll-кольца уменьшена, yaw-стрелки у пальцев берутся заметно легче, roll-кольцо остаётся доступным.
