# PoseFlow — Implementation Plan (Remaining Steps)

**Версия:** v0.3.0 | **Дата обновления:** 2026-04-20

Steps 1–7 complete. See `ai/tasks/archive/steps-1-7-completed.md` for details.

**Связь с рефакторингом DesignDoll (шаги PLAN ↔ фазы DD):** [`ai/docs/backlog-matrix.md`](ai/docs/backlog-matrix.md).

---

## 📊 Сводка прогресса

| Категория | Прогресс | Статус |
|-----------|----------|--------|
| Базовый редактор (скелет, presets, камера, экспорт) | 100% | ✅ ЗАВЕРШЕНО |
| DesignDoll контроллеры (Steps 1-7) | 100% | ✅ ЗАВЕРШЕНО |
| Phase 4 экспериментальные компоненты | 100% | ✅ ЗАВЕРШЕНО |
| Steps 8-11 интеграция | ~25% | 🔄 В ПРОЦЕССЕ |
| DI Container активация (Phase 0) | 100% | ✅ ЗАВЕРШЕНО |

---

## ✅ ЗАВЕРШЕНО: Phase 0 — Activation Infrastructure

**Полный план:** [`plans/phase0-implementation-plan.md`](plans/phase0-implementation-plan.md)  
**Status:** ✅ ЗАВЕРШЕНО | **Приоритет:** 🔴 КРИТИЧЕСКИЙ | **Дата завершения:** 2026-04-20  
**Фактическая реализация:** ~8 часов

Phase 0 создаёт инфраструктуру активации. DI Container и Feature Flags полностью реализованы и интегрированы в основной поток приложения.

### Task 0.1: Интеграция ServiceProvider в App.tsx ✅ ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/App.tsx` — `ServiceProvider` обёрнут вокруг `FeatureFlagProvider` и `AppContent`
- `src/main.tsx` — `setupContainer()` вызывается явно перед рендером
- `src/lib/di/setup.ts` — автоматический вызов `setupContainer()` удалён, вызов явный
- `src/context/ServiceContext.tsx` — `ServiceProvider` с `defaultContainer`, все сервисы зарегистрированы

### Task 0.2: Замена прямого импорта poseService в Canvas3D ✅ ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/components/Canvas3D.tsx` — использует `usePoseService()` из `ServiceContext`
- Все вызовы: `getPoseData()`, `updateJoint()`, `subscribe()`, `mirrorPose()`, `undo()`, `redo()` — через DI hook
- Прямой импорт `poseService` удалён

### Task 0.3: Активация Feature Flags в компонентах ✅ ЧАСТИЧНО ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/components/skeleton/Skeleton3D.tsx` — `USE_CENTER_OF_GRAVITY` и `USE_RING_GIZMOS` флаги подключены
- `src/components/Canvas3D.tsx` — `USE_MINI_VIEW` флаг подключён
- `src/hooks/useFeatureFlagIntegration.ts` — `useIsDesignDollControllersEnabled()` хук
- `src/services/PoseService.ts` — `USE_FIXED_LENGTHS` ещё не интегрирован (требует доработки логики solver)

### Task 0.4: Graceful Degradation — fallback ✅ ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/context/ServiceContext.tsx` — все `use*` hooks имеют fallback на `new Service()` при отсутствии ServiceProvider
- `src/context/FeatureFlagContext.tsx` — `useFeatureFlag` имеет fallback на `defaultValue` из registry

### Task 0.5: Настройка начальных значений Feature Flags ✅ ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/lib/feature-flags/FeatureFlagService.ts` — флаги сохраняются в `localStorage` (ключ `poseflow_feature_flags`)
- `src/lib/feature-flags/registry.ts` — все флаги имеют `defaultValue`
- `src/context/FeatureFlagContext.tsx` — синхронизация с localStorage при инициализации

### Task 0.6: Интеграция FeatureFlagPanel в UI ✅ ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/components/FeatureFlagPanel.tsx` — floating panel с поиском, фильтрацией, toggle
- `src/components/FeatureFlagPanel.css` — стили панели
- `src/App.tsx` — `FeatureFlagPanel` рендерится в `AppContent`

### Task 0.7: Тестирование и валидация ✅ ЧАСТИЧНО ЗАВЕРШЕНО
**Фактическая реализация:**
- `src/lib/di/__tests__/Container.test.ts` — unit тесты DI Container
- `src/lib/feature-flags/__tests__/FeatureFlagService.test.ts` — unit тесты FeatureFlagService
- `src/lib/feature-flags/__tests__/registry.test.ts` — unit тесты registry
- `src/lib/feature-flags/__tests__/FeatureFlagIntegration.test.ts` — integration тесты
- `src/lib/experimental/controllers/__tests__/DragAdapter.test.ts` — unit тесты
- `src/lib/experimental/controllers/__tests__/MainControllers.test.ts` — unit тесты
- `src/lib/experimental/rigid/__tests__/SkullGroup.test.ts` — unit тесты
- `src/lib/experimental/spine/__tests__/SpineChain.test.ts` — unit тесты
- `src/lib/experimental/fixed-length/__tests__/FixedLengthSolver.test.ts` — unit тесты
- `src/lib/stores/__tests__/poseStore.test.ts` — unit тесты
- `src/services/__tests__/PoseService.test.ts` — unit тесты
- `src/__tests__/baseline-regression.spec.ts` — baseline regression тесты
- Vite build проходит успешно (681 modules transformed)

---

## ✅ ЗАВЕРШЕНО: Feature Flags Activation (часть Phase 0)

**Status:** ✅ ЗАВЕРШЕНО — см. [`plans/phase0-implementation-plan.md`](plans/phase0-implementation-plan.md)

**Реализовано:**
- `src/lib/feature-flags/FeatureFlagService.ts` — сервис управления флагами с localStorage
- `src/lib/feature-flags/registry.ts` — registry 15+ флагов с зависимостями
- `src/lib/feature-flags/types.ts` — типы
- `src/lib/feature-flags/utils.ts` — утилиты (группировка, проверка зависимостей)
- `src/context/FeatureFlagContext.tsx` — React контекст, хуки `useFeatureFlag`, `useFeatureFlagService`
- `src/hooks/useFeatureFlagIntegration.ts` — хуки для интеграции с DesignDoll контроллерами
- `src/components/FeatureFlagPanel.tsx` — UI панель управления
- `src/components/FeatureFlagPanel.css` — стили панели
- Ключевые флаги: `USE_DI_CONTAINER`, `USE_FIXED_LENGTHS`, `USE_DESIGNDOLL_CONTROLLERS`, `USE_CENTER_OF_GRAVITY`, `USE_RING_GIZMOS`, `USE_MINI_VIEW`, `USE_MULTIPLE_SKELETONS`

---

## ✅ ЗАВЕРШЕНО: Step 8 — Mini-view (second viewport)

**Status:** ✅ ЗАВЕРШЕНО — компонент `MiniView.tsx` создан и интегрирован.

**Goal:** Small 200×200 Canvas in bottom-right corner showing 90°-rotated view for depth judgment.

**Реализовано:**
- `src/components/MiniView.tsx` — компонент второго viewport
- `src/components/Canvas3D.css` — стили `.mini-view`

**Реализовано:**
- `<MiniView>` интегрирован в `src/components/Canvas3D.tsx`
- Синхронизация камеры через `mainCameraRef`
- `poseData`, `manipulationMode`, `unlinkedJoints` переданы
- Управляется флагом `USE_MINI_VIEW`

**Test:** Rotate main camera to any angle → mini-view always shows perpendicular angle.

---

## ⏳ Step 9 — Multiple skeletons [PENDING]

**Status:** ⏳ Архитектура готова в PoseService. UI компоненты не реализованы.

**Goal:** Multiple figures on scene; select active one via sidebar.

**Реализовано:**
- `src/services/PoseService.ts` — `skeletons[]` array, `addSkeleton()`, `removeSkeleton()`, `setActiveSkeleton()`, `getSkeletonCount()`, `getSkeletonPoseData()`, `getAllSkeletons()`
- Undo сохраняет snapshot ВСЕХ скелетов (через `snapshot()`)

**Осталось:**
- `src/components/skeleton/Skeleton3D.tsx` — принять `skeletons: PoseData[]`, `activeSkeletonId: number`; inactive at 50% opacity
- `src/components/Canvas3D.tsx` — подписаться на `poseService.getAllSkeletons()`
- `src/components/Sidebar.tsx` — секция списка скелетов: нумерованные записи, кнопка "Add Skeleton", "Delete" per entry

---

## 🔄 Step 10 — Center of gravity [IN PROGRESS]

**Status:** 🔄 Компонент `CenterOfGravity.tsx` создан. Интеграция с drag system в процессе.

**Goal:** Drag virtual CoG sphere to shift upper/lower body as a group.

**Реализовано:**
- `src/components/skeleton/CenterOfGravity.tsx` — компонент CoG
- `src/lib/body25/SkeletonGraph.ts` — `computeCenterOfMass()`

**Осталось:**
- Интегрировать в `Skeleton3D.tsx` и `Canvas3D.tsx`
- Подключить drag к poseService (compute delta → FK translate entire group)
- Визуал: semi-transparent sphere, upper=blue, lower=green

---

## 🔄 Step 11 — Ring gizmos (rotation controllers) [IN PROGRESS]

**Status:** 🔄 Компонент `JointGizmo.tsx` создан. Интеграция с FK/IK в процессе.

**Goal:** Torus rings around selected joint for rotating child joints.

**Реализовано:**
- `src/components/skeleton/JointGizmo.tsx` — компонент ring gizmo
- `src/lib/solvers/RotationSolver.ts` — `rotateAround()`
- `src/lib/experimental/rigid/SkullGroup.ts` — rigid head group
- `src/lib/experimental/spine/SpineChain.ts` — virtual spine segments

**Осталось:**
- `src/components/skeleton/Joint.tsx` — `onDoubleClick` → toggle `showGizmo` state
- Интегрировать в `Skeleton3D.tsx` и `Canvas3D.tsx`
- Подключить drag на ring → rotate child joints around axis

---

## ✅ ЗАВЕРШЕНО: 🧪 Экспериментальные модули (Phase 4)

**Status:** ✅ Все модули реализованы и протестированы

| Модуль | Файл | Тесты |
|--------|------|-------|
| FABRIK IK Solver | `src/lib/solvers/FABRIKSolver.ts` | ✅ 5/5 |
| Rotation Solver | `src/lib/solvers/RotationSolver.ts` | ✅ |
| FixedLengthSolver | `src/lib/experimental/fixed-length/FixedLengthSolver.ts` | ✅ |
| SkullGroup (rigid) | `src/lib/experimental/rigid/SkullGroup.ts` | ✅ |
| SpineChain | `src/lib/experimental/spine/SpineChain.ts` | ✅ |
| MainControllers | `src/lib/experimental/controllers/MainControllers.ts` | ✅ |
| DragAdapter | `src/lib/experimental/controllers/DragAdapter.ts` | ✅ |
| FeatureFlagIntegration | `src/lib/experimental/integration/FeatureFlagIntegration.ts` | ✅ |

---

## 📋 Step dependency graph (обновлённый)

```
Phase 0: Activate DI Container ── ✅ ЗАВЕРШЕНО
Phase 0: Activate Feature Flags ── ✅ ЗАВЕРШЕНО

Step 8 (MiniView) ── ✅ ЗАВЕРШЕНО
Step 9 (Multi-skeleton) ── uses skeletons[] from Step 2 [PENDING]
Step 10 (CoG) ── depends on Step 3 (SkeletonGraph) [IN PROGRESS]
Step 11 (Ring gizmos) ── most complex, lowest priority [IN PROGRESS]

Phase 4: Integrate DesignDoll Controllers ── ✅ DI + Feature Flags готовы
Phase 4: Activate FixedLengthSolver ── ✅ DI + Feature Flags готовы
```

**Рекомендованный порядок:**
1. ~~Phase 0~~ ✅ ЗАВЕРШЕНО
2. ~~Step 8~~ ✅ ЗАВЕРШЕНО
3. **Step 10:** Завершить интеграцию CoG (компонент готов)
4. **Step 11:** Завершить интеграцию Ring Gizmos (компонент готов)
5. **Step 9:** Реализовать UI Multi-skeleton (архитектура готова)
6. **Phase 4:** Интегрировать DesignDoll Controllers + FixedLengthSolver

---

## ⚠️ Известные проблемы

### Критические
- **Bone length constraints during FK drag not activated** — при перетаскивании в FK режиме кости растягиваются (FixedLengthSolver готов, но не подключён)
- **USE_FIXED_LENGTHS в PoseService** — флаг реализован, но логика solver не интегрирована в updateJoint()

### Средние
- **Multiple skeletons UI** — архитектура готова, но UI для добавления/удаления скелетов не реализован
- **Center of gravity drag integration** — компонент создан, но drag не связан с poseService
- **Ring gizmos rotation solver** — компонент создан, но не интегрирован с FK/IK

### Средние
- **Mini-view camera synchronization** — компонент создан, но синхронизация камеры требует доработки
- **Multiple skeletons UI** — архитектура готова, но UI для добавления/удаления скелетов не реализован
- **Center of gravity drag integration** — компонент создан, но drag не связан с poseService
- **Ring gizmos rotation solver** — компонент создан, но не интегрирован с FK/IK

### Низкие
- **Performance optimization** — экспериментальные компоненты требуют оптимизации
- **Integration tests** — нужны regression tests для новых компонентов
