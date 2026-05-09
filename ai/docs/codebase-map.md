# PoseFlow Codebase Map

Архитектурная карта `poseflow/src/` — где живёт состояние, кто кому что предоставляет, и какие в коде есть параллельные механизмы / ловушки.

> **Документ требует актуализации при структурных изменениях.** Если правишь то, что упоминается ниже (DI, контексты, регистрации сервисов, layout `lib/`, добавление новых хранилищ, источников флагов или путей localStorage) — обнови этот файл в той же задаче. См. также `source-modules.md` (короткая таблица «что где лежит»).

---

## 1. Точки входа и порядок инициализации

| Файл | Роль |
|---|---|
| `poseflow/src/main.tsx` | Точка входа. Порядок: `setupErrorHandling()` → `setupContainer()` → ReactDOM рендер. **DI инициализируется до React.** |
| `poseflow/src/App.tsx` | Корень React: `<ServiceProvider><AppContent/>`. AppContent — header + Sidebar + Canvas3D + StatusBar + модали. |
| `poseflow/electron/*`, `poseflow/vite.config.ts` | Electron-обёртка. `vite-plugin-electron` сам запускает Electron в dev — **не запускать `electron .` отдельно**, иначе будет два окна (см. PR `fix: electron:dev`). |

`AppSettingsProvider` оборачивает всё снаружи (в `main.tsx`).

---

## 2. DI-контейнер и React-провайдеры

```
defaultContainer (lib/di/Container.ts, модульный синглтон)
   ↑
setupContainer() в main.tsx → регистрирует все сервисы
   ↑
ServiceProvider (context/ServiceContext.tsx) → достаёт через container.get(...)
   ↑
useRigService(), usePoseService(), useCameraService(), useExportService(),
useFeatureFlagService(), useSelectionService() → graceful fallback на новые экземпляры вне Provider
```

**Регистрация сервисов** (`lib/di/setup.ts`):

| Ключ (`ServiceKeys.*`) | Singleton | Реализация |
|---|---|---|
| `RigService` | да | `services/RigService.ts` |
| `PoseService` | да | `services/PoseService.ts` (обёртка над RigService) |
| `SelectionService` | да | `services/SelectionService.ts` |
| `CameraService` | да | `services/cameraService.ts` |
| `ExportService` | **нет** | `services/ExportService.ts` (новый экземпляр на каждый `get`) |
| `FeatureFlagService` | да | `lib/feature-flags/FeatureFlagService.ts` |

**Доступ из не-React кода** (другие сервисы, утилиты): `getService<T>(ServiceKeys.X)` из `lib/di/setup.ts`. Бросает, если контейнер пуст — оборачивай в try/catch с фолбэком, если код может вызываться в тестах (см. `RigService.constructor`).

---

## 3. Состояние позы — поток данных

**Источник истины:** `SkeletonRig` внутри `RigService` (DI-синглтон).

```
Пользователь тянет гизмо в контроллере
  → useCameraPlaneWorldDrag / useAngularGizmoDrag (hooks/) считает дельту
  → controller вызывает rigService.applyXxx(...)
      ├─ IK/FK солвер из lib/rig/ считает новые localRotations
      ├─ this.resolvedCache = null (инвалидация)
      └─ this.notifyListeners()
  → resolveSkeleton(rig) вычисляет PoseData (мировые позиции) при следующем getPoseData()
  → Skeleton3D и контроллеры (через подписку на RigService) перерисовываются
```

**Ключевые поля `SkeletonRig`** (`lib/rig/SkeletonRig.ts`):
- `rest: RestPose` — фиксированные локальные смещения (T-pose)
- `rootPosition`, `rootRotation` — мировой transform таза (MID_HIP)
- `localRotations: Map<Body25Index, Quaternion>` — локальные кватернионы остальных суставов
- `spine`, `neck: VirtualChain` — сегментированные цепочки
- `spineAngles`, `neckAngles`, `headAngles` и т.п. — суммарные углы (для UI и FK)
- `headRotation` — кватернион, **производный** от `headAngles` (порядок Euler YXZ, обновляется через `updateHeadRotation()`)

**Undo/Redo:** `UndoStack<SkeletonRig>` глубиной 50 в `RigService`. Снимок — `cloneRig()`. `beginDrag()` пушит снимок один раз перед серией мутаций гизмо.

**Кэш:** `RigService.resolvedCache: {pose, virtualPositions}` инвалидируется на каждое изменение rig. `resolveSkeleton()` дорогой, поэтому кэш важен.

---

## 4. Доменные библиотеки `lib/`

### `lib/body25/` — типы скелета OpenPose BODY_25
- `body25-types.ts` — `Body25Index` (25 суставов), `JointPosition`, `PoseData`, `PosePreset`, `OpenPoseJSON`
- `body25-connections.ts` — рёбра скелета (какие суставы соединены)
- `body25-mirror.ts` — `MIRROR_PAIRS` для зеркальной операции
- `IKChains.ts`, `SkeletonGraph.ts` — графовые утилиты (BFS, родитель/дети)

### `lib/rig/` — rig-механика и солверы
| Файл | Что делает |
|---|---|
| `SkeletonRig.ts`, `RestPose.ts`, `VirtualChain.ts` | Структуры данных позы и rest-позы |
| `resolveSkeleton.ts` | **FK**: `SkeletonRig → PoseData` (читать одним из первых при разбираке) |
| `inverseFK.ts` | **IK от позы**: `PoseData → SkeletonRig` (для пресетов и `setPoseData`) |
| `armIK.ts`, `armLimits.ts` | FABRIK + анатомические лимиты для руки |
| `legIK.ts`, `legLimits.ts`, `legAnatomy.ts`, `legHip.ts` | IK ноги, лимиты hip/knee/tibia (после рефакторинга D1–D5) |
| `footFK.ts`, `shoulderFK.ts` | FK для стопы и плечевого пояса |
| `elements.ts` | `ElementId`-перечисление управляемых сущностей (для Selection) |
| `coordinateFrames.ts`, `jointMarkers.ts` | Локальные базисы и анатомические маркеры |

### `lib/solvers/` — общие солверы
- `FABRIKSolver.ts` — стандартный FABRIK
- `RotationSolver.ts` — кватернионные повороты

### `lib/feature-flags/`
- `FeatureFlagService.ts` — сервис флагов с подписками. **localStorage ключ:** `poseflow_feature_flags`
- `registry.ts` — `FEATURE_FLAGS` реестр определений (USE_DI_CONTAINER, ENABLE_PERFORMANCE_LOGGING, ENABLE_DEBUG_OVERLAY, ALLOW_EXPERIMENTAL_FEATURES и др.)

### `lib/performance/`
- `PerformanceMonitor.ts` — синглтон, гейтится через `FeatureFlagService.isEnabled('ENABLE_PERFORMANCE_LOGGING')` (получает сервис через DI)

### `lib/storageKeys.ts`
- Единый реестр всех `localStorage`-ключей: `STORAGE_KEYS.FEATURE_FLAGS`, `.LOGS`, `.APP_SETTINGS`, `.SIDEBAR_COLLAPSED`, `.CAMERA_CONTROLS_COLLAPSED`.
- **Все новые ключи добавлять только сюда**, использовать через константу.

### `lib/logger.ts`
- Логгеры по категориям: `uiLogger`, `canvasLogger`, `exportLogger`, `errorLogger`, `legIKTraceLogger`
- Запись в консоль + в `STORAGE_KEYS.LOGS` (последние ~1000)
- `setupErrorHandling()` ловит unhandled errors

### `lib/appSettings.ts`
- Тип `AppSettings`, `DEFAULT_APP_SETTINGS`, load/save в localStorage

### `lib/presets/body25-presets.ts`
- Преднастроенные позы: T-Pose, A-Pose, Sitting и т.п.

### `lib/UndoStack.ts`
- Generic стек для undo/redo (используется в RigService)

### `lib/utils/`, `lib/canvasColorSchemes.ts`
- Геометрические утилиты (`clipLineToRect` и т.п.), цветовые схемы 3D-канвы

---

## 5. UI-компоненты

### Сцена и скелет
- `components/Canvas3D.tsx` — `<Canvas>` от R3F: камера, скелет, контроллеры, OrbitControls, экспорт-фрейм, фокус-режим
- `components/skeleton/Skeleton3D.tsx` — рисует все кости и суставы; подписан на RigService
- `components/skeleton/{Joint,Bone,JointAnatomyMarker,HandPrimitive}.tsx` — примитивы

### Контроллеры (гизмо)
Все в `components/controllers/`. Каждый контроллер:
1. Слушает `useSelectionService()` для активации
2. Использует один из `useGizmoDrag` / `useCameraPlaneWorldDrag` / `useAngularGizmoDrag` хуков
3. Вызывает соответствующий `rigService.applyXxx()`

| Контроллер | Метод RigService |
|---|---|
| `PelvisController` | `applyPelvisTranslate`, `applyPelvisRotate`, `applyPelvisRotateLocal` |
| `SpineController` | `applySpineBend`, `applySpineTwist` |
| `NeckController` | `applyNeckBend`, `applyNeckTwist` |
| `HeadController` | `applyHeadPitch`, `applyHeadYaw`, `applyHeadRoll` |
| `ArmController` | `applyArmIK`, `applyElbowTwist` |
| `ShoulderController` | `applyShoulderRaise`, `applyShoulderForward` |
| `LegController` | `applyLegIK`, `applyKneeTwist` |
| `FootController` | `applyFootRotation` |

### Прочее UI
- `Sidebar.tsx` — пресеты, undo/redo, mirror, reset, debug-секция (зависит от `settings.showDebugTools`)
- `SettingsModal.tsx` — настройки (тема, скорости, чувствительность гизмо, `showDebugTools`)
- `StatusBar.tsx`, `ExportFrame.tsx`, `MiniView.tsx`, `ErrorBoundary.tsx`
- `controls/CameraControls.tsx` — кнопки видов камеры

### Хуки
- `hooks/useCameraPlaneWorldDrag.ts` — drag в плоскости, перпендикулярной направлению камеры
- `hooks/useAngularGizmoDrag.ts` — drag углового гизмо (дуги)
- `hooks/useGizmoDrag.ts` — базовый pointer-захват
- `hooks/useTransformDrag.ts` — комбинированный transform
- `hooks/useIPC.ts` — обёртка для Electron IPC

---

## 6. Архитектурные ловушки и параллельные механизмы

> **Не дублировать механизмы**. Если добавляешь новую категорию состояния (флаг, настройка, локальный кэш) — сначала проверь, нет ли уже подходящего канала. Ниже — известные параллели и зомби-код.

### A. Коллизия имён `useFeatureFlagService` ✅ исправлено 2025-05-09
~~Хук с одинаковым именем экспортировался из двух файлов.~~

`FeatureFlagProvider` удалён из `App.tsx`. `context/FeatureFlagContext.tsx` больше не экспортирует `useFeatureFlagService` и не создаёт собственный экземпляр — все хуки (`useFeatureFlag`, `useFeatureFlagState`, `useEnabledFeatureFlags`) теперь вызывают `getService(ServiceKeys.FeatureFlagService)` напрямую. Единственный экземпляр — DI-синглтон.

### B. Два хранилища настроек: `AppSettings` vs `settingsStore` ✅ исправлено 2025-05-09
~~Zombie-сторы Zustand~~.

`lib/stores/settingsStore.ts` и `lib/stores/uiStore.ts` удалены. Единственное хранилище настроек — `context/AppSettingsContext.tsx` + `lib/appSettings.ts`.

### C. Два механизма debug-флагов ✅ исправлено 2025-05-09
~~`lib/debugFlags.ts` дублировал FeatureFlagService.~~

`lib/debugFlags.ts` удалён. Все debug-флаги (`ENABLE_PERFORMANCE_LOGGING`, `ENABLE_LEG_IK_TRACE`) зарегистрированы в `feature-flags/registry.ts`. `RigService` читает их через `this.featureFlagService.isEnabled(...)`. `Sidebar` управляет ими через универсальный `useFlagToggle(key)`. Perf-логирование использует `console.log` (не `console.debug`).

Любые **новые debug-флаги** добавлять только в `feature-flags/registry.ts`.

### D. `cameraService` — модульный синглтон + DI-регистрация ✅ исправлено 2025-05-09
~~Два инстанса CameraService.~~

Модульный экспорт `export const cameraService` удалён из `services/cameraService.ts`. `CameraControls.tsx` теперь использует `useCameraService()`. `AppSettingsContext.tsx` вызывает `getService<CameraService>(ServiceKeys.CameraService)`. Единственный инстанс — DI-синглтон.

### E. Множественные ключи localStorage ✅ исправлено 2025-05-09
~~Рассыпанные строковые литералы по всему коду.~~

Создан `lib/storageKeys.ts` — единый реестр `STORAGE_KEYS`. Все активные ключи теперь в нём:

| Константа | Ключ | Источник |
|---|---|---|
| `STORAGE_KEYS.FEATURE_FLAGS` | `poseflow_feature_flags` | `FeatureFlagService` |
| `STORAGE_KEYS.LOGS` | `poseflow-logs` | `lib/logger.ts` |
| `STORAGE_KEYS.APP_SETTINGS` | `poseflow-app-settings-v1` | `lib/appSettings.ts` |
| `STORAGE_KEYS.SIDEBAR_COLLAPSED` | `poseflow-sidebar-collapsed` | `App.tsx` |
| `STORAGE_KEYS.CAMERA_CONTROLS_COLLAPSED` | `poseflow-camera-controls-collapsed` | `Canvas3D.tsx` |

**Новые ключи добавлять только в `lib/storageKeys.ts`**, использовать через константу.

### F. Graceful degradation в `ServiceContext` создаёт новые инстансы
Хуки `usePoseService`, `useRigService` и т.п. при отсутствии `ServiceProvider` возвращают **`new XService()`** (см. `ServiceContext.tsx:74–141`). Это удобно для тестов и сторибуков, но опасно: если компонент случайно окажется вне провайдера — он будет работать со своим личным `RigService`, и подписки на «общий» rig обмануты не сообщат об изменениях.

При добавлении новых хуков делать так же (warning + fallback), но в проде проверять, что компонент всегда внутри `ServiceProvider`.

### G. Запуск приложения — где worktree
Проект ведётся в git worktree. **Активная ветка работ:** `D:\ai\QwenCoder\.claude\worktrees\epic-mclean-a6836d\poseflow\`. `D:\ai\QwenCoder\poseflow\` — `master`, обычно отстаёт. При просьбе пользователя проверить — всегда напоминать про директорию, иначе он запустит старый код.

---

## 7. Тесты

- **Vitest** (`vitest.config.ts`) — unit-тесты под `__tests__/`. `environment: node`, `pool: forks`. Большинство тестов в `lib/rig/__tests__/`, `lib/feature-flags/__tests__/`, `services/__tests__/`.
- **Playwright** (`playwright.config.ts`) — `npm run smoke:browser`. Бейзлайн в `src/__tests__/baseline-regression.spec.ts`.
- Запускалки: `npm test`, `npm run typecheck`, `npm run verify` (typecheck + test + build).

В тестах `RigService` инстанцируется напрямую без DI — конструктор имеет try/catch фолбэк на `new FeatureFlagService()`. Не убирать без перевода всех тестов на DI-сетап.

---

## 8. Bash-шпаргалка (всё из `poseflow/`)

```bash
npm install
npm run dev               # vite + electron (через vite-plugin-electron)
npm run dev:web           # только web, без electron
npm run electron:dev      # то же что dev (alias)
npm run backend           # FastAPI на 127.0.0.1:8000
npm run typecheck         # tsc --noEmit (app + node)
npm run lint:unused       # tsc с --noUnusedLocals/Parameters
npm test                  # vitest run
npm run smoke:browser     # playwright
npm run verify            # typecheck + test + build
npm run build             # vite build (требует typecheck OK)
npm run electron:build    # build + electron-builder
```
