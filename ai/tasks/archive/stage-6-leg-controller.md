# Stage 6 — LegController

## 1. Название и цель

**Название:** Stage 6 — LegController  
**Короткая цель:** добавить управление ногой через IK лодыжки, а коленное twist-гизмо вынести во вторую очередь.  
**Почему это важно для пользователя:** ноги станут редактируемыми тем же способом, что руки: можно будет быстро ставить стопу/лодыжку в нужную позицию без ручного вращения бедра и голени.

---

## 2. Контекст

### Current-state probe

**Проверено 2026-04-29:**

- `git status --short`: рабочее дерево уже содержит незакоммиченные изменения Stage 4.2, Stage 5.0, sidebar collapse и фиксы gizmo.
- `PLAN.md`: Stage 6 был указан как следующий продуктовый шаг на момент старта задачи.
- `STATUS.md`: Stage 6 `LegController, FABRIK IK` был отмечен как следующий на момент старта задачи.
- `AGENTS.md`: next stage был синхронизирован как Stage 6 на момент старта задачи.
- `poseflow/src/lib/rig/elements.ts`: `RIGHT_KNEE`/`RIGHT_ANKLE` выбирают `leg_r`, `LEFT_KNEE`/`LEFT_ANKLE` выбирают `leg_l`; `foot_r`/`foot_l` уже зарезервированы для toe/heel, но Stage 7.
- `poseflow/src/lib/rig/armIK.ts`: есть готовый образец для FABRIK IK, записи local rotations и twist вокруг оси end-to-end.
- `poseflow/src/components/controllers/ArmController.tsx`: образец UI для endpoint sphere + twist arc.

**Вывод из probe:**

- Первый срез Stage 6 можно строить по паттерну `ArmController`/`armIK.ts`.
- Стопу как жесткую группу не трогаем: это Stage 7.
- Коленное twist-гизмо сделано второй очередью, чтобы не раздувать первый срез.

---

## 3. Очереди реализации

### Stage 6.1 — Ankle IK

**Цель:** перетаскивание лодыжки решает цепочку `HIP -> KNEE -> ANKLE`.

Входит:

- `LegController` для `leg_r` / `leg_l`.
- Сфера на `RIGHT_ANKLE` / `LEFT_ANKLE` по образцу wrist IK sphere.
- Camera-plane drag через `useCameraPlaneWorldDrag`.
- FABRIK для цепочки `hip -> knee -> ankle`.
- Бедро фиксировано, колено и лодыжка пересчитываются.
- Рука/плечи/позвоночник не затрагиваются.
- Unit-тесты для pure-логики `legIK.ts`.

Не входит:

- Коленное twist-гизмо.
- Управление стопой `{ankle, big toe, small toe, heel}`.
- Фиксация/ориентация стопы при IK.
- Новые BODY_25 точки.

### Stage 6.2 — Knee Twist Gizmo

**Цель:** добавить управление положением колена вокруг оси `HIP -> ANKLE`, как elbow twist у руки.

Входит:

- Дуга/стрелки twist у колена по образцу `ArmController`.
- Чистая функция `twistKnee(hip, knee, ankle, delta)`.
- Сервисный метод `RigService.applyKneeTwist(side, delta)`.
- Unit-тесты: happy path и сохранение hip/ankle.

Не входит:

- Стопа как жесткая группа.
- Биомеханически сложные ограничения колена.

---

## 4. Поведение и UX

**Пользовательский сценарий Stage 6.1:**

1. Пользователь кликает по колену или лодыжке.
2. Выбирается `leg_r` или `leg_l`.
3. У лодыжки появляется сфера IK.
4. Drag сферы двигает лодыжку в camera-plane.
5. Бедро остается на месте, колено решается FABRIK, длины бедро→колено и колено→лодыжка сохраняются.

**Пользовательский сценарий Stage 6.2:**

1. При выбранной ноге рядом с коленом появляется дуговое twist-гизмо.
2. Drag дуги вращает колено вокруг оси `HIP -> ANKLE`.
3. Бедро и лодыжка остаются на месте.

**Ручная проверка:**

- [ ] Правая нога: drag лодыжки, колено решается, бедро фиксировано.
- [ ] Левая нога: drag лодыжки, колено решается, бедро фиксировано.
- [ ] Undo/redo после drag лодыжки.
- [ ] Mirror после изменения ног.
- [ ] Существующие ArmController/ShoulderController продолжают работать.
- [ ] BODY_25 export остается 25 keypoints.
- [x] Для Stage 6.2 отдельно: twist колена не двигает hip/ankle.
- [ ] Пройти smoke-чеклист из `ai/docs/r3f-smoke-manual-checklist.md`.

---

## 5. Технический план

### Stage 6.1

**Чистая логика:**

- Создать `poseflow/src/lib/rig/legIK.ts`.
- Ввести `LEG_JOINTS`:
  - `r`: `RIGHT_HIP`, `RIGHT_KNEE`, `RIGHT_ANKLE`
  - `l`: `LEFT_HIP`, `LEFT_KNEE`, `LEFT_ANKLE`
- Реализовать:
  - `getLegBoneLengths(rig, side)`
  - `solveLegFABRIK(hipPos, kneePos, anklePos, target, boneLengths)`
  - `getHipAccRot(rig, side)`
  - `applyLegChainToRig(rig, side, hipPos, newKneePos, newAnklePos)`
- Использовать существующие `solveFABRIK` и `worldPosToLocalRot`-подход из `armIK.ts`.
- Если дублирование с `armIK.ts` станет заметным, обобщить после рабочего первого среза, не до него.

**Сервисы:**

- `RigService.applyLegIK(side, x, y, z)`:
  - берет текущий resolved pose;
  - решает FABRIK;
  - пишет rotations в `SkeletonRig`;
  - сбрасывает cache и notify.
- Undo/redo: `LegController` вызывает `beginDrag()` на pointer down.

**UI/R3F:**

- Создать `poseflow/src/components/controllers/LegController.tsx`.
- Сфера у ankle, аналогично wrist IK sphere.
- Подключить в `Canvas3D.tsx` для `selectedElement === 'leg_r' / 'leg_l'`.
- Цвет можно взять нейтральный из текущего skeleton/arm IK sphere; стрелочный cyan не обязателен, потому что сфера не arrow gizmo.

### Stage 6.2

**Чистая логика:**

- В `legIK.ts` добавить `twistKnee(hip, knee, ankle, delta)`.
- Добавить `RigService.applyKneeTwist(side, delta)`.

**UI/R3F:**

- Добавить в `LegController` knee twist arc по образцу elbow twist.
- Все стрелки дуги использовать cyan `#00ccff`.

---

## 6. Тесты

### Stage 6.1

- [x] `getLegBoneLengths`: возвращает длины из rest pose, fallback безопасен.
- [x] `solveLegFABRIK`: сохраняет hip как первый joint, target достигается в пределах досягаемости.
- [x] `applyLegChainToRig`: меняет knee/ankle local rotations, не меняет hip/root.
- [x] `RigService.applyLegIK`: меняет позицию ankle и сохраняет длины костей.

### Stage 6.2

- [x] `twistKnee`: hip/ankle не двигаются, knee вращается вокруг оси `HIP -> ANKLE`.
- [x] `RigService.applyKneeTwist`: меняет knee position и сохраняет длины костей.

---

## 7. Acceptance Criteria

### Stage 6.1

- [x] При выборе `leg_r`/`leg_l` появляется IK-сфера у лодыжки.
- [x] Drag лодыжки двигает ногу через FABRIK.
- [x] Бедро фиксировано.
- [x] Длины `HIP -> KNEE` и `KNEE -> ANKLE` сохраняются.
- [x] Undo/redo работает одним снимком на drag.
- [x] Unit-тесты добавлены.
- [x] `npm run verify` проходит.
- [x] Документация обновлена.

### Stage 6.2

- [x] У колена появляется twist-гизмо по образцу локтя.
- [x] Drag twist-гизмо вращает колено вокруг `HIP -> ANKLE`.
- [x] Hip и ankle остаются на месте.
- [x] Unit-тесты добавлены.
- [x] `npm run verify` проходит.

---

## 8. Итог после выполнения

**Измененные файлы:**

- `poseflow/src/lib/rig/legIK.ts`
- `poseflow/src/lib/rig/__tests__/legIK.test.ts`
- `poseflow/src/services/RigService.ts`
- `poseflow/src/services/__tests__/RigService.stage6.test.ts`
- `poseflow/src/components/controllers/LegController.tsx`
- `poseflow/src/components/Canvas3D.tsx`
- `PLAN.md`
- `STATUS.md`
- `CHANGELOG.md`
- `AGENTS.md`

**Проверки:**

- `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/legIK.test.ts src/services/__tests__/RigService.stage6.test.ts` — OK, 17 tests
- Ограничения колена покрыты тестами: вперед до 85°, назад 0°
- Ограничения бедра покрыты тестами: вперед до 120°, назад до 20°, наружу до 50°, внутрь до 30°
- Knee twist покрыт тестами: `twistKnee`, `RigService.applyKneeTwist`, сохранение hip/ankle и длин костей
- Leg IK limit stop покрыт тестами: недопустимый target за лимитом бедра не меняет knee/ankle, возврат target внутрь лимитов снова двигает лодыжку
- Повторный ankle IK после knee twist покрыт регрессией: twist-плоскость колена сохраняется
- `npm run typecheck` — OK
- `npm run verify` — OK, 209 tests + Vite/Electron build
- Manual R3F smoke — не запускался

**Остаточные риски / follow-up:**

- Stage 7 FootController нужен отдельно, чтобы стопа не выглядела “оторванной” от ориентации лодыжки при сложных позах.
