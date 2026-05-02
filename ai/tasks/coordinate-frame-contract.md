# Coordinate Frame Contract

## 1. Название и цель

**Название:** Coordinate Frame Contract
**Короткая цель:** зафиксировать правило, что поза хранится в системе координат манекена, а рабочее пространство задается только root-трансформом.
**Почему это важно для пользователя:** это должно убрать хаос с инверсиями гизмо после поворота или переворота манекена.

---

## 2. Контекст

### Current-state probe

**Команды/проверки:**

- [x] `git status --short`
- [x] `STATUS.md`
- [x] `PLAN.md`
- [x] `AGENTS.md`
- [x] `SkeletonRig.ts`, `resolveSkeleton.ts`, `RigService.ts`, `PelvisController.tsx`

**Что обнаружено:**

- Рабочее дерево уже содержит много текущих незакоммиченных изменений по предыдущим этапам; их не трогаем.
- `SkeletonRig` уже хранит `rootPosition`, `rootRotation`, `localRotations`, virtual chains и локальные параметры головы/шеи/стоп.
- `resolveSkeleton()` уже является основным преобразованием rig state -> world `PoseData`.
- `RigService.applyPelvisRotate()` сейчас меняет `rootRotation`, то есть узел 8 уже является root-трансформом манекена.
- Риск находится не в модели хранения, а в controller/input слое: часть гизмо переводит screen/world drag напрямую в локальные углы через ручные знаки.

**Вывод из current-state probe:**

Модель данных уже близка к нужной архитектуре. Пункт 1 должен зафиксировать координатный контракт и запретить дальнейшие исправления через ручные таблицы знаков без frame-пересчета.

---

## 3. Границы задачи

**Входит в задачу:**

- Зафиксировать контракт координат в ADR.
- Обновить активный план как источник правил для следующих шагов.
- Не менять runtime-поведение.

**Не входит в задачу:**

- Реализация helper-функций.
- Переписывание Head/Neck/Spine/Pelvis controllers.
- Изменение `SkeletonRig` или `resolveSkeleton()`.

---

## 4. Поведение и UX

**Ожидаемое поведение:**

- В пункте 1 поведение приложения не меняется.
- Следующие пункты будут менять input mapping через явные frame-преобразования.

**Ручная проверка:**

- [x] Для пункта 1 достаточно проверить, что runtime-файлы не изменены.

---

## 5. Технический план

**Чистая логика:**

- Пункт 1: без новой чистой логики.
- Пункт 2: добавлен `poseflow/src/lib/rig/coordinateFrames.ts`.
- Функции пункта 2: `skeletonPointToWorld`, `worldPointToSkeleton`, `skeletonDirToWorld`, `worldDirToSkeleton`, `skeletonQuatToWorld`, `worldQuatToSkeleton`.
- Пункт 3: добавлены screen-projection helpers: `projectWorldPointToScreen`, `projectWorldDirectionToScreen`, `screenDragAlongWorldDirection`, `screenDragAlongSkeletonDirection`.
- Пункт 4: `HeadController` использует `screenDragAlongWorldDirection` для pitch-дуг; drag измеряется вдоль экранной проекции фактического направления стрелки.
- Пункт 4 manual check: поведение `head pitch` не принято, голову откладываем до отдельного пересчёта.
- Пункт 5: `NeckController` использует `screenDragAlongWorldDirection` для forward/back bend-дуг.
- Пункт 5 manual check: `neck forward/back bend` подтверждён пользователем.
- Пункт 6: `NeckController` использует `screenDragAlongWorldDirection` для lateral bend-дуг.

**UI/R3F интеграция:** нет в пункте 1.

Пункт 4:

- Компонент: `poseflow/src/components/controllers/HeadController.tsx`.
- Затронуто только управление `head pitch`.
- `yaw` и `roll` не переводились на новый helper в этом шаге.
- Статус: технические проверки прошли, но ручная проверка показала, что голову надо чинить позже.

Пункт 5:

- Компонент: `poseflow/src/components/controllers/NeckController.tsx`.
- Затронуто только управление `neck bendX` вперёд/назад.
- `neck twist` и боковой `bendZ` не менялись в этом шаге.
- Статус: ручная проверка пройдена.

Пункт 6:

- Компонент: `poseflow/src/components/controllers/NeckController.tsx`.
- Затронуто только управление боковым `neck bendZ`.
- `neck twist` не менялся в этом шаге.

**Сервисы:** нет в пункте 1.

---

## 6. Тесты

**Unit-тесты:**

- [x] Пункт 2 happy path: identity root transform оставляет point/dir/quaternion без изменений.
- [x] Пункт 2 edge cases: round-trip при translate+rotate, upside-down root rotation, directions не получают root translation.
- [x] Пункт 3 happy path: world X/Y directions получают ожидаемый screen sign.
- [x] Пункт 3 edge cases: skeleton direction учитывает upside-down root transform; невидимая screen projection возвращает 0.
- [x] Пункт 4: unit-тесты helper-а не изменились и проходят; UI-поведение требует ручной проверки.
- [ ] Пункт 4 manual check: `head pitch` не принят, отложен.
- [x] Пункт 5: unit-тесты helper-а проходят; UI-поведение требует ручной проверки.
- [x] Пункт 5 manual check: `neck forward/back bend` принят.
- [x] Пункт 6: unit-тесты helper-а проходят; UI-поведение требует ручной проверки.

---

## 7. Acceptance Criteria

- [x] Зафиксировано, что `SkeletonRig` хранит позу в координатах манекена.
- [x] Зафиксировано, что `rootPosition/rootRotation` являются единственным transform из skeleton space в workspace.
- [x] Зафиксировано, что controller input должен переводиться в локальный frame перед применением rig delta.
- [x] Нет изменений runtime-кода в этом пункте.

---

## 8. Итог после выполнения

**Изменённые файлы:**

- `ai/tasks/coordinate-frame-contract.md`
- `ai/decisions/0004-skeleton-local-coordinate-contract.md`
- `ai/decisions/README.md`
- `PLAN.md`
- `poseflow/src/lib/rig/coordinateFrames.ts`
- `poseflow/src/lib/rig/__tests__/coordinateFrames.test.ts`
- `poseflow/src/components/controllers/HeadController.tsx`
- `poseflow/src/components/controllers/NeckController.tsx`

**Проверки:**

- Документальная проверка пункта 1.
- `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/coordinateFrames.test.ts`
- `npm run typecheck`

**Остаточные риски / follow-up:**

- Пункт 4 требует ручной проверки: обычное положение, вид со стороны лица/затылка, манекен вверх ногами.
- Пункт 4 `head pitch` не принят ручной проверкой; голову не докручиваем в текущем проходе.
- Пункт 6 требует ручной проверки: боковой `neck bendZ` в обычном положении и после переворота манекена.
# Session note 2026-05-01 / Head and neck pivot correction

Manual check during head roll found two pivot issues:
- Head bend radius/rotation must use the neck segment junction, not BODY_25 point 1.
- Neck bend should rotate at BODY_25 point 1 only; it should not distribute bend across point 1 and the neck segment junction.

Patch applied:
- `resolveSkeleton` rotates the rigid head block around `virtualPositions.neck[0]`.
- `RigService.applyNeckBend` uses `setBendAtStart`, so bend is applied at the first neck segment only.
- Neck twist was not changed.

Checks:
- `npm run typecheck` passed.
- `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/VirtualChain.test.ts src/lib/rig/__tests__/resolveSkeleton.test.ts` passed.

# Session note 2026-05-01 / Neck lateral bend

Manual table for `NeckController`:
- Forward/back bend: accepted in normal pose front/back/head-side views and accepted after upside-down root rotation.
- Twist: accepted in normal pose front/back/head-side views.
- Lateral bend: right arrow from mannequin point of view was accepted; left arrow from mannequin point of view was inverted in normal and upside-down pose.

Patch applied: left lateral bend arrow now applies the opposite `bendZ` sign, matching the right arrow behavior instead of depending on the grabbed arrow.

Checks:
- `npm run typecheck` passed.
- `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/coordinateFrames.test.ts` passed.

# Session note 2026-05-01

Stop point: traffic limit reached; do not continue code changes in this session.

Current state:
- `coordinateFrames` helper layer and tests were added.
- Foot controls are manually accepted.
- Head pitch projected-drag pilot is not accepted; head work is postponed.
- Neck projected-drag migration is not closed. After forward/back and lateral bend changes the user reported remaining neck problems.

Next session:
- Start with an isolated neck behavior table before editing code.
- Check forward/back, right/left, and twist separately.
- Check normal mannequin orientation and upside-down orientation.
- Check camera views from face/back/head/feet sides.
- Apply one small patch at a time and validate it before moving on.
- Do not migrate spine/pelvis circular gizmos further until neck behavior is stable.
