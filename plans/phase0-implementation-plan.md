# Phase 0: Activation Infrastructure — Implementation Plan

**Версия:** v0.2.0 | **Дата создания:** 2026-04-19  
**Приоритет:** 🔴 КРИТИЧЕСКИЙ | **Блокирует:** Все Steps 8-11 и Phase 4

---

## 📋 Резюме

Phase 0 создаёт инфраструктуру активации для всех последующих шагов. DI Container и Feature Flags уже реализованы как отдельные модули, но не интегрированы в основной поток приложения. Phase 0 обеспечивает graceful degradation — существующий код продолжает работать, а новый функционал подключается через feature flags.

**Ключевая проблема:** Приложение использует прямой импорт `PoseService` (синглтон) вместо DI Container. Все экспериментальные компоненты реализованы, но не могут быть активированы без базовой инфраструктуры.

---

## 🎯 Цели Phase 0

| Цель | Критерий успеха |
|------|-----------------|
| DI Container активирован | `usePoseService()` возвращает сервис из DI, а не прямой импорт |
| Feature Flags активированы | Флаги из `registry.ts` управляют поведением компонентов |
| Graceful degradation | При отключении DI — приложение работает на старом PoseService |
| Zero breaking changes | Существующий функционал не ломается |

---

## 📊 Текущее состояние компонентов

### DI Container — ✅ Реализован, ⏳ Не активирован

| Файл | Статус | Описание |
|------|--------|----------|
| `src/lib/di/Container.ts` | ✅ | Container с singleton/transient, иерархия, clearInstances |
| `src/lib/di/types.ts` | ✅ | ServiceKeys, реэкспорт интерфейсов |
| `src/lib/di/setup.ts` | ✅ | Регистрация 5 сервисов, автоматический вызов при импорте |
| `src/lib/di/index.ts` | ✅ | Экпорты |
| `src/lib/di/__tests__/Container.test.ts` | ✅ | Unit тесты |
| `src/context/ServiceContext.tsx` | ✅ | React контекст, hooks (usePoseService, useCameraService и т.д.) |
| `src/lib/services/interfaces/` | ✅ | ICameraService, IPoseService, IExportService, IFeatureFlagService |

**Проблема:** `setup.ts` вызывает `setupContainer()` при импорте, но `App.tsx` не использует `ServiceProvider`. Компоненты импортируют `poseService` напрямую.

### Feature Flags — ✅ Реализованы, ⏳ Не активированы

| Файл | Статус | Описание |
|------|--------|----------|
| `src/lib/feature-flags/FeatureFlagService.ts` | ✅ | Полный сервис с localStorage, подписками |
| `src/lib/feature-flags/registry.ts` | ✅ | 15+ флагов с зависимостями |
| `src/lib/feature-flags/types.ts` | ✅ | Типы |
| `src/lib/feature-flags/utils.ts` | ✅ | Утилиты |
| `src/lib/feature-flags/index.ts` | ✅ | Экспорты |
| `src/context/FeatureFlagContext.tsx` | ✅ | React контекст, хук useFeatureFlag |
| `src/hooks/useFeatureFlagIntegration.ts` | ✅ | Интеграция с DesignDoll контроллерами |
| `src/components/FeatureFlagPanel.tsx` | ✅ | UI панель |
| `src/components/FeatureFlagPanel.css` | ✅ | Стили |

**Проблема:** `FeatureFlagProvider` обёрнут в `App.tsx`, но флаги не влияют на поведение компонентов — нет проверок `isEnabled()` в ключевых местах.

---

## 📋 План реализации

### Task 0.1: Интеграция ServiceProvider в App.tsx

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 1-2 часа

**Текущее состояние:**
```tsx
// App.tsx — ServiceProvider обёрнут, но setup.ts уже вызвал setupContainer()
// при импорте. Компоненты внутри используют usePoseService() из ServiceContext.
// НО Canvas3D импортирует poseService напрямую!
```

**Задачи:**
1. Проверить, что `ServiceProvider` в `App.tsx` корректно предоставляет сервисы
2. Убедиться, что `setupContainer()` вызывается один раз (не дублируется)
3. Добавить логирование в `ServiceProvider` для отладки

**Файлы для изменения:**
- `src/App.tsx` — проверить структуру обёрток
- `src/lib/di/setup.ts` — убрать автоматический вызов `setupContainer()`, вызывать явно в `main.tsx`

**Критерий успеха:** Все компоненты получают сервисы через `usePoseService()`, `useCameraService()` и т.д.

---

### Task 0.2: Замена прямого импорта poseService в Canvas3D

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 2-3 часа

**Текущее состояние:**
```tsx
// Canvas3D.tsx — прямой импорт
import { poseService } from '../services/PoseService';

// Использование
const [poseData, setPoseData] = useState<PoseData>(poseService.getPoseData());
poseService.updateJoint(index, position);
poseService.mirrorPose();
poseService.undo();
```

**Задачи:**
1. Заменить прямой импорт на хуки из ServiceContext
2. Заменить `poseService.getPoseData()` на `usePoseService().getPoseData()`
3. Заменить `poseService.updateJoint()` на `usePoseService().updateJoint()`
4. Заменить `poseService.subscribe()` на `usePoseService().subscribe()`
5. Заменить `poseService.mirrorPose()`, `undo()`, `redo()` на методы из hook

**Файлы для изменения:**
- `src/components/Canvas3D.tsx` — основная работа

**Важно:** `poseService` используется в `useEffect` для подписки — нужно переписать на хуки.

**Пример замены:**
```tsx
// Было:
import { poseService } from '../services/PoseService';
const [poseData, setPoseData] = useState<PoseData>(poseService.getPoseData());
useEffect(() => {
  const unsubscribe = poseService.subscribe((data) => {
    setPoseData(data);
  });
  return () => unsubscribe();
}, []);

// Стало:
import { usePoseService } from '../context/ServiceContext';
const poseService = usePoseService();
const [poseData, setPoseData] = useState<PoseData>(() => poseService.getPoseData());
useEffect(() => {
  const unsubscribe = poseService.subscribe((data) => {
    setPoseData(data);
  });
  return () => unsubscribe();
}, [poseService]);
```

**Критерий успеха:** Canvas3D получает все сервисы через DI, прямой импорт `PoseService` удалён.

---

### Task 0.3: Активация Feature Flags в компонентах

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 3-4 часа

**Текущее состояние:**
```tsx
// Canvas3D.tsx — MiniView уже использует useFeatureFlag
const isMiniViewEnabled = useFeatureFlag('USE_MINI_VIEW');
// ...
{isMiniViewEnabled && <MiniView ... />}
```

**Но другие флаги не используются:**
- `USE_FIXED_LENGTHS` — не проверяется нигде
- `USE_DESIGNDOLL_CONTROLLERS` — проверяется через `useIsDesignDollControllersEnabled()` ✅
- `USE_CENTER_OF_GRAVITY` — не проверяется
- `USE_RING_GIZMOS` — не проверяется
- `USE_MULTIPLE_SKELETONS` — не проверяется

**Задачи:**

#### 0.3.1: Skeleton3D — conditional CoG и Gizmo
**Файл:** `src/components/skeleton/Skeleton3D.tsx`

```tsx
import { useFeatureFlag } from '../context/FeatureFlagContext';

const showCoG = useFeatureFlag('USE_CENTER_OF_GRAVITY');
const showGizmos = useFeatureFlag('USE_RING_GIZMOS');

// В рендере:
{showCoG && <CenterOfGravity poseData={poseData} />}
{showGizmos && <JointGizmo ... />}
```

#### 0.3.2: PoseService — conditional FixedLengthSolver
**Файл:** `src/services/PoseService.ts`

```tsx
import { useFeatureFlagService } from '../context/ServiceContext';

// В методе updateJoint:
if (featureFlagService.isEnabled('USE_FIXED_LENGTHS')) {
  // Применить FixedLengthSolver для ограничения длины костей
}
```

#### 0.3.3: Sidebar — conditional Multi-skeleton UI
**Файл:** `src/components/Sidebar.tsx`

```tsx
const showMultiSkeleton = useFeatureFlag('USE_MULTIPLE_SKELETONS');
// В рендере:
{showMultiSkeleton && <MultiSkeletonSection />}
```

**Критерий успеха:** Каждый экспериментальный компонент управляется своим feature flag.

---

### Task 0.4: Graceful Degradation — fallback на прямой PoseService

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 2-3 часа

**Цель:** Если DI Container не может предоставить сервис — использовать прямой импорт.

**Реализация:**

#### 0.4.1: Fallback в ServiceContext
**Файл:** `src/context/ServiceContext.tsx`

```tsx
export const usePoseService = (): IPoseService => {
  const context = useContext(ServiceContext);
  if (!context) {
    // Fallback: создать прямой экземпляр
    console.warn('[ServiceContext] useServices called outside ServiceProvider, using fallback');
    return new PoseService();
  }
  return context.poseService;
};
```

#### 0.4.2: Fallback в Canvas3D
**Файл:** `src/components/Canvas3D.tsx`

```tsx
const poseService = usePoseService();
// Если fallback сработал — всё равно работает, просто не через DI
```

#### 0.4.3: Feature Flag fallback
**Файл:** `src/context/FeatureFlagContext.tsx`

```tsx
export const useFeatureFlag = (key: string): boolean => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    // Fallback: вернуть defaultValue из registry
    const def = getFlagDefinition(key);
    return def?.defaultValue ?? false;
  }
  return context.isEnabled(key);
};
```

**Критерий успеха:** Приложение запускается и работает даже если `ServiceProvider` не обёрнут.

---

### Task 0.5: Настройка начальных значений Feature Flags

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 1 час

**Текущее состояние:** registry.ts имеет `defaultValue` для каждого флага, но они не синхронизированы с `appSettings.ts`.

**Задачи:**
1. Добавить feature flags в `appSettings.ts` для персистентности
2. Синхронизировать `FeatureFlagService` с `appSettings`
3. Добавить UI для управления флагами в `SettingsModal`

**Файлы для изменения:**
- `src/lib/appSettings.ts` — добавить `featureFlags` секцию
- `src/context/FeatureFlagContext.tsx` — синхронизация с appSettings
- `src/components/SettingsModal.tsx` — добавить секцию Feature Flags

---

### Task 0.6: Интеграция FeatureFlagPanel в UI

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 1 час

**Текущее состояние:** `FeatureFlagPanel` уже рендерится в `App.tsx` как floating panel.

**Задачи:**
1. Проверить, что панель корректно рендерится
2. Добавить стили для тёмной/светлой темы
3. Добавить возможность сброса всех флагов
4. Добавить отображение зависимостей между флагами

**Файлы для изменения:**
- `src/components/FeatureFlagPanel.tsx` — доработка UI
- `src/components/FeatureFlagPanel.css` — стили тем

---

### Task 0.7: Тестирование и валидация

**Статус:** ⏳ НЕ НАЧАТО  
**Оценка:** 3-4 часа

**Задачи:**

#### 0.7.1: Unit тесты
- `src/context/__tests__/ServiceContext.test.ts` — тест ServiceProvider с моками
- `src/context/__tests__/FeatureFlagContext.test.ts` — тест FeatureFlagProvider
- `src/components/__tests__/Canvas3D.di.test.ts` — тест DI интеграции

#### 0.7.2: Integration тесты
- Запустить приложение с DI включён — проверить все функции
- Запустить приложение с DI выключен — проверить fallback
- Переключить Feature Flags — проверить включение/выключение компонентов

#### 0.7.3: Regression тесты
- Запустить `npm run test` — все существующие тесты должны пройти
- Проверить экспорт PNG/JSON — работает ли с DI
- Проверить undo/redo — работает ли с DI
- Проверить mirror — работает ли с DI

---

## 📐 Архитектурные решения

### Решение 1: Двойная совместимость (Dual Compatibility)

**Проблема:** Прямой импорт `poseService` используется в 10+ файлах.

**Решение:** Постепенная миграция через fallback.

```
App.tsx
  └── ServiceProvider (DI)
        └── FeatureFlagProvider
              └── AppContent
                    ├── Canvas3D → usePoseService() → DI ✅
                    ├── Sidebar → usePoseService() → DI ✅
                    └── SettingsModal → useAppSettings() → localStorage ✅
```

Если `ServiceProvider` отсутствует:
```
App.tsx
  └── AppContent
        └── Canvas3D → usePoseService() → fallback new PoseService() ⚠️
```

### Решение 2: Feature Flag как адаптивный слой

Feature Flags не просто включают/выключают — они адаптируют поведение:

```
USE_DI_CONTAINER = true
  → Canvas3D использует usePoseService() из DI
  → PoseService из DI может включать FixedLengthSolver

USE_DI_CONTAINER = false  
  → Canvas3D использует fallback new PoseService()
  → Старый PoseService без FixedLengthSolver
```

### Решение 3: Централизованная настройка

Все настройки DI и Feature Flags в одном месте:

```
main.tsx
  └── setupDI() — настройка контейнера
        └── loadFeatureFlags() — загрузка из appSettings
              └── render(<App />) — рендер с ServiceProvider
```

---

## 📋 Зависимости между задачами

```
Task 0.1 (ServiceProvider) ── prerequisite for ──→ Task 0.2 (Canvas3D DI)
                                                        ↓
Task 0.5 (Flag settings) ── prerequisite for ──→ Task 0.3 (Flag activation)
                                                        ↓
Task 0.2 (Canvas3D DI) ── prerequisite for ──→ Task 0.7 (Testing)
Task 0.3 (Flag activation) ── prerequisite for ──→ Task 0.7 (Testing)
Task 0.4 (Fallback) ── parallel with ──→ Task 0.2
Task 0.6 (FlagPanel UI) ── parallel with ──→ Task 0.3
```

**Критический путь:** 0.1 → 0.2 → 0.7 (6-9 часов)

---

## 🧪 Критерии приёмки

### Functional Requirements
- [ ] Приложение запускается и работает с DI активным
- [ ] Все функции (drag, FK/IK, mirror, undo/redo, export) работают через DI
- [ ] MiniView включается/выключается через `USE_MINI_VIEW`
- [ ] CoG показывается через `USE_CENTER_OF_GRAVITY`
- [ ] Gizmo показывается через `USE_RING_GIZMOS`
- [ ] DesignDoll контроллеры включаются через `USE_DESIGNDOLL_CONTROLLERS`
- [ ] Приложение работает с DI деактивным (fallback mode)

### Non-Functional Requirements
- [ ] Все существующие тесты проходят (`npm run test`)
- [ ] Нет console.error при запуске
- [ ] Feature Flags сохраняются в localStorage
- [ ] Feature Flags синхронизированы с appSettings
- [ ] FeatureFlagPanel корректно отображает состояние всех флагов

### Code Quality
- [ ] Прямой импорт `poseService` удалён из Canvas3D
- [ ] Все сервисы используются через DI hooks
- [ ] Fallback код покрыт unit тестами
- [ ] Integration тесты для DI + Feature Flags

---

## 📅 Оценка времени

| Задача | Оценка | Зависит от |
|--------|--------|-----------|
| 0.1 ServiceProvider Integration | 1-2h | — |
| 0.2 Canvas3D DI Migration | 2-3h | 0.1 |
| 0.3 Feature Flag Activation | 3-4h | 0.5 |
| 0.4 Graceful Degradation | 2-3h | — |
| 0.5 Flag Settings Sync | 1h | — |
| 0.6 FeatureFlagPanel UI | 1h | 0.3 |
| 0.7 Testing & Validation | 3-4h | 0.2, 0.3, 0.4 |
| **Итого** | **13-21 часов** | |

**Рекомендуемый спринт:** 2 дня (16 часов) с учётом code review и итераций.

---

## 📦 Результат Phase 0

После завершения Phase 0:
1. **DI Container** — основной способ получения сервисов
2. **Feature Flags** — основной способ управления экспериментальными функциями
3. **Graceful Degradation** — приложение работает в обоих режимах
4. **Чистая архитектура** — разделение ответственности через DI
5. **Готовая основа** — для Steps 8-11 и Phase 4 интеграции
