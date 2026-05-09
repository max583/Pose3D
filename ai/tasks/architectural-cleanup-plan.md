# План архитектурного рефакторинга

**Цель:** устранить параллельные механизмы, коллизии имён и зомби-код, обнаруженные при ревизии 2026-05-09.

**Источник:** `ai/docs/codebase-map.md` §6 (раздел «Архитектурные ловушки»).

**Исполнитель:** Claude Sonnet (продолжает после Opus). Задачи независимые — можно делать в любом порядке, но рекомендуется по возрастанию риска (B → C → A → D → E).

**Рабочая директория:** `D:\ai\QwenCoder\.claude\worktrees\epic-mclean-a6836d\poseflow\` (ветка git worktree `claude/epic-mclean-a6836d`). **Не путать** с `D:\ai\QwenCoder\poseflow` — это master.

**Коммиты:** один коммит на каждую задачу (A, B, C, D, E). Префиксы — `refactor:` или `chore:`. После каждой задачи: `npm run typecheck` + `npm test` должны проходить.

---

## Общие правила для исполнителя

1. **Перед началом задачи** — `git status --short` (рабочее дерево чистое), прочитать `ai/docs/codebase-map.md` §6 для контекста.
2. **После каждой задачи**:
   - `npm run typecheck`
   - `npm test`
   - `git add` затронутые файлы → коммит → следующая задача
3. **Не делать unrelated changes**. Если по пути замечена ещё одна проблема — записать в конец этого файла под секцию «Найдено по пути», не править.
4. **Не трогать `ai/docs/codebase-map.md`** до конца всех задач — обновить одним заходом в конце (раздел §6 → отметить решённые пункты).
5. После всего — обновить `CHANGELOG.md` (или `STATUS.md`) одной строкой про чистку архитектуры.

---

## Задача B. Удалить зомби-сторы Zustand

**Риск:** низкий. **Время:** ~10 минут.

### Что делать

1. Удалить файлы:
   - `src/lib/stores/settingsStore.ts`
   - `src/lib/stores/uiStore.ts`
2. Если папка `src/lib/stores/` стала пустой — удалить её.
3. Если есть тесты для этих сторов под `__tests__/` — удалить.

### Проверка перед удалением

```bash
# Убедиться, что никто не импортирует — должно быть 0 совпадений вне самих файлов
```
Запустить `Grep` по `useSettingsStore|settingsStore|useUIStore|uiStore` в `src/` — кроме самих файлов и их тестов, ссылок быть не должно. На момент написания плана подтверждено: ноль внешних импортов.

### Acceptance

- [ ] Файлы `settingsStore.ts`, `uiStore.ts` удалены.
- [ ] `npm run typecheck` чистый.
- [ ] `npm test` — 308 тестов проходят (если были тесты на сторы — счёт уменьшится, это ок).
- [ ] Коммит: `chore: удалить неиспользуемые Zustand-сторы (settingsStore, uiStore)`.

---

## Задача C. Консолидировать debug-флаги в FeatureFlagService

**Риск:** средний. **Время:** ~30 минут.

### Контекст

Сейчас `LEG_IK_TRACE_FLAG` в `lib/debugFlags.ts` (legacy путь, ключ localStorage `poseflow-debug-leg-ik`) — последний оставшийся клиент этого файла. `PERF_TRACE_FLAG` объявлен, но мёртв (его клиенты уже на `FeatureFlagService`). Цель — перевести leg-ik trace на `FeatureFlagService` и удалить `debugFlags.ts` целиком.

### Шаги

1. **Добавить флаг в реестр** (`src/lib/feature-flags/registry.ts`), в секцию «Операционные флаги», по образцу `ENABLE_PERFORMANCE_LOGGING`:
   ```ts
   ENABLE_LEG_IK_TRACE: {
     key: 'ENABLE_LEG_IK_TRACE',
     type: 'operational',
     description: 'Включить детальное логирование Leg IK солвера',
     defaultValue: false,
   },
   ```

2. **`src/components/Sidebar.tsx`**:
   - Удалить импорт `isLegIKTraceEnabled, setLegIKTraceEnabled` из `'../lib/debugFlags'`.
   - Заменить `useState<boolean>(false)` + `useEffect` для `legIKTraceEnabled` на хук по образцу уже существующего `usePerfTraceFlag`. Лучший подход — вынести универсальный хук:
     ```ts
     function useFlagToggle(flagKey: string): [boolean, () => void] {
       const service = getService<FeatureFlagService>(ServiceKeys.FeatureFlagService);
       const [enabled, setEnabled] = useState(() => service.isEnabled(flagKey));
       useEffect(() => service.subscribe(flagKey, (s) => setEnabled(s.enabled || s.activatedForUser)), [service, flagKey]);
       const toggle = useCallback(() => service.toggleFlag(flagKey), [service, flagKey]);
       return [enabled, toggle];
     }
     ```
   - Использовать `useFlagToggle('ENABLE_LEG_IK_TRACE')` для leg ik trace и `useFlagToggle('ENABLE_PERFORMANCE_LOGGING')` для perf trace вместо текущего `usePerfTraceFlag`.
   - Удалить `handleToggleLegIKTrace` (теперь хук возвращает toggle напрямую).
   - Удалить отдельный `useEffect` с `setLegIKTraceEnabledState(isLegIKTraceEnabled())`.

3. **`src/services/RigService.ts`**:
   - Удалить импорт `isLegIKTraceEnabled` из `'../lib/debugFlags'`.
   - Заменить **обе** строки `const trace = isLegIKTraceEnabled();` (в `applyLegIK` и `applyKneeTwist`) на:
     ```ts
     const trace = this.featureFlagService.isEnabled('ENABLE_LEG_IK_TRACE');
     ```

4. **Удалить файлы:**
   - `src/lib/debugFlags.ts`
   - `src/lib/__tests__/debugFlags.test.ts`

5. Проверить, что больше никто не импортирует `'../lib/debugFlags'` или аналог. Должно быть ноль совпадений.

### Acceptance

- [ ] Включение «Leg IK Trace» из Sidebar теперь пишет/читает `localStorage['poseflow_feature_flags']` (тот же ключ, что и Perf Trace).
- [ ] `legIKTraceLogger.info(...)` срабатывает при включённом флаге, не срабатывает при выключенном (ручная проверка: тяни ногу с включённым/выключенным флагом, смотри в Console и в `Export Logs`).
- [ ] `npm run typecheck`, `npm test`, оба чистые. Тесты `debugFlags.test.ts` удалены вместе с файлом.
- [ ] Коммит: `refactor: перенести Leg IK Trace на FeatureFlagService, удалить debugFlags.ts`.

---

## Задача A. Устранить коллизию `useFeatureFlagService`

**Риск:** высокий. **Время:** ~45 минут.

### Контекст

`useFeatureFlagService` экспортируется из двух файлов и возвращает **разные** инстансы `FeatureFlagService`:
- `src/context/ServiceContext.tsx:110` — из DI-контейнера (правильный)
- `src/context/FeatureFlagContext.tsx:70` — из своего React-контекста (создаёт второй инстанс)

`FeatureFlagContext` также экспортирует `useFeatureFlag`, `useFeatureFlagState`, `useEnabledFeatureFlags`, `<FeatureFlag>`, `<FeatureFlagSwitch>` — всё это работает против второго инстанса.

**Внешние импорты `FeatureFlagContext`:**
- `src/App.tsx:10` — `FeatureFlagProvider`
- `src/components/Canvas3D.tsx:13` — `useFeatureFlag`

### Решение

Сделать `FeatureFlagContext.tsx` тонкой обёрткой над DI-сервисом — не создавать свой инстанс, а доставать через DI. Удалить дублированный `useFeatureFlagService` (оставить только в `ServiceContext.tsx`).

### Шаги

1. **`src/context/FeatureFlagContext.tsx`** — переписать:
   - В `FeatureFlagProvider` **не вызывать** `createFeatureFlagService()`. Вместо этого получать сервис через `getService<FeatureFlagService>(ServiceKeys.FeatureFlagService)` и сохранять в `useState(() => getService(...))`. Это гарантирует тот же синглтон, что и в DI.
   - Удалить локальную функцию `createFeatureFlagService`.
   - **Удалить экспорт `useFeatureFlagService`** из этого файла. (Он останется только в `ServiceContext.tsx`.)
   - `useFeatureFlag`, `useFeatureFlagState`, `useEnabledFeatureFlags` оставить, но внутри переключить `useFeatureFlagService()` (внутренний вызов) на чтение DI-сервиса напрямую через `getService`. Чтобы избежать дубля кода — можно:
     - либо переиспользовать хук `useFeatureFlagService` из `ServiceContext.tsx` (`import { useFeatureFlagService } from './ServiceContext';`),
     - либо сделать локальный хелпер `useDIFeatureFlagService()` внутри файла, который тянет из DI.

   Рекомендуется первый вариант — меньше дублирования.

2. **`src/App.tsx`** — `<FeatureFlagProvider>` теперь не нужен (он ничего не создаёт, а только переоборачивает DI-сервис в провайдер). **Удалить:**
   - импорт `FeatureFlagProvider`
   - оборачивание `<FeatureFlagProvider>` в `App` (оставить только `<ServiceProvider>`).

   Вместе с этим становится не нужен сам провайдер — но хуки `useFeatureFlag` и т.п. в `FeatureFlagContext.tsx` не зависят от провайдера, если они сразу идут в DI. Решение: **полностью удалить `FeatureFlagProvider`** (компонент-провайдер и `FeatureFlagContext` сам), оставить только независимые хуки и компоненты, которые ходят в DI напрямую.

3. **`src/components/Canvas3D.tsx`** — импорт `useFeatureFlag` теперь идёт из обновлённого `FeatureFlagContext.tsx`. Если решено удалить файл целиком (см. п. 2) — переименовать файл в `useFeatureFlag.ts` (или `lib/feature-flags/hooks.ts`) и обновить импорт.

   Рекомендация: переместить хуки `useFeatureFlag`, `useFeatureFlagState`, `useEnabledFeatureFlags` и компоненты `FeatureFlag`, `FeatureFlagSwitch` в **`src/lib/feature-flags/hooks.tsx`**, а `src/context/FeatureFlagContext.tsx` удалить целиком.

4. Проверить, что нет других импортов из `'./context/FeatureFlagContext'` или `'../context/FeatureFlagContext'`.

### Финальная цель

- Существует **один** `useFeatureFlagService` — в `ServiceContext.tsx`, возвращает DI-синглтон.
- Существует **один** инстанс `FeatureFlagService` на всё приложение.
- Хуки `useFeatureFlag` и т.д. переехали в `lib/feature-flags/hooks.tsx` или остались в `FeatureFlagContext.tsx`, но без своего провайдера и без своего экземпляра.

### Acceptance

- [ ] `Grep` по `useFeatureFlagService` показывает экспорт **только** из `ServiceContext.tsx`.
- [ ] `Grep` по `FeatureFlagProvider` — ноль совпадений (компонент удалён).
- [ ] `Grep` по `new FeatureFlagService(` — только в `lib/di/setup.ts` и в тестовых фолбэках (`ServiceContext.tsx`, `RigService.constructor`).
- [ ] Кнопка Perf Trace + Leg IK Trace по-прежнему работают (после задачи C).
- [ ] `npm run typecheck`, `npm test` чистые.
- [ ] Ручная проверка: открыть DevTools → Console → `__featureFlags` (если был экспорт в dev) — теперь это должен быть DI-синглтон, либо переменная исчезла.
- [ ] Коммит: `refactor: устранить коллизию useFeatureFlagService, единый инстанс FeatureFlagService через DI`.

---

## Задача D. Убрать дублированный синглтон `cameraService`

**Риск:** средний. **Время:** ~20 минут.

### Контекст

`src/services/cameraService.ts` в конце файла:
```ts
export const cameraService = new CameraService();
```
Это создаёт **отдельный инстанс**, не связанный с DI-контейнером. Прямые импорты:
- `src/components/controls/CameraControls.tsx:4` (использует `cameraService.registerCamera`, `switchTo`)
- `src/context/AppSettingsContext.tsx:16` (использует `cameraService.setAnimationDurationMs`)

### Решение

Удалить модульный экспорт. Перевести оба прямых импорта на DI.

### Тонкость с `AppSettingsProvider`

`AppSettingsProvider` находится **снаружи** `ServiceProvider` в дереве (см. `main.tsx`):
```tsx
<AppSettingsProvider>
  <App />  {/* содержит ServiceProvider */}
</AppSettingsProvider>
```
Поэтому **из `AppSettingsContext.tsx` нельзя использовать хук `useCameraService()`** — `ServiceProvider` ещё не доступен. Нужно использовать `getService<CameraService>(ServiceKeys.CameraService)` напрямую (`setupContainer()` вызван до рендеринга — синглтон уже зарегистрирован).

### Шаги

1. **`src/services/cameraService.ts`** — удалить последнюю строку:
   ```ts
   export const cameraService = new CameraService();
   ```
   (Класс `CameraService` остаётся.)

2. **`src/components/controls/CameraControls.tsx`**:
   - Удалить `import { cameraService } from '../../services/cameraService';`
   - Импортировать `useCameraService` из `'../../context/ServiceContext'`.
   - В компоненте: `const cameraService = useCameraService();` (имя локальной переменной можно оставить, чтобы не править все вызовы).
   - Использовать в обработчиках как раньше.

3. **`src/context/AppSettingsContext.tsx`**:
   - Удалить `import { cameraService } from '../services/cameraService';`
   - Импортировать:
     ```ts
     import { getService } from '../lib/di/setup';
     import { ServiceKeys } from '../lib/di/types';
     import type { CameraService } from '../services/cameraService';
     ```
   - Заменить вызов `cameraService.setAnimationDurationMs(...)` (строка 50) на:
     ```ts
     getService<CameraService>(ServiceKeys.CameraService).setAnimationDurationMs(settings.cameraAnimationMs);
     ```
   - Альтернатива — мемоизировать сервис через `useMemo(() => getService<CameraService>(ServiceKeys.CameraService), [])`, если используется не только в одном месте. Но для одного вызова это излишне.

4. Запустить `Grep` по `from ['"].*services/cameraService['"]` — проверить, что `cameraService` (lowercase, инстанс) больше нигде не импортируется. Только класс `CameraService` (импорт через `import { CameraService }` или `import type { CameraService }`).

### Тонкость для тестов

Если есть тесты, которые делают `import { cameraService } from '...'` — заменить на создание собственного инстанса `new CameraService()` или мокирование через DI.

### Acceptance

- [ ] `Grep` по `export const cameraService` — ноль совпадений.
- [ ] `Grep` по `import { cameraService }` или `import {cameraService` — ноль совпадений.
- [ ] Камера-кнопки в `CameraControls` работают (ручная проверка: переключения фронт/сбоку/3Q сохраняют ракурс через тот же сервис, который видят настройки).
- [ ] Изменение `cameraAnimationMs` в SettingsModal реально влияет на длительность анимации (сервис один и тот же).
- [ ] `npm run typecheck`, `npm test` чистые.
- [ ] Коммит: `refactor: убрать модульный синглтон cameraService, единый инстанс через DI`.

---

## Задача E. Реестр localStorage-ключей (опционально)

**Риск:** низкий. **Время:** ~30 минут.

### Контекст

В коде разбросано **9 ключей** localStorage без единого реестра (см. `codebase-map.md` §6.E). После задач B и C список сократится:
- ✂ `poseflow-settings-storage` — удалится с `settingsStore`
- ✂ `poseflow-ui-storage` — удалится с `uiStore`
- ✂ `poseflow-debug-leg-ik`, `poseflow-debug-perf` — удалятся с `debugFlags.ts`

Останется 5 живых ключей: `poseflow_feature_flags`, `poseflow-logs`, `poseflow-app-settings-v1`, `poseflow-sidebar-collapsed`, `poseflow-camera-controls-collapsed`.

### Решение

Создать `src/lib/storageKeys.ts` с константами и обновить ссылки.

### Шаги

1. **Создать `src/lib/storageKeys.ts`:**
   ```ts
   /**
    * Единый реестр ключей localStorage для PoseFlow.
    * Любой новый ключ должен быть добавлен сюда + кратко описан в codebase-map.md §6.E.
    */
   export const STORAGE_KEYS = {
     /** Состояние feature-флагов (FeatureFlagService) */
     FEATURE_FLAGS: 'poseflow_feature_flags',
     /** Логи в кольцевом буфере (lib/logger.ts) */
     LOGS: 'poseflow-logs',
     /** Настройки приложения (lib/appSettings.ts) */
     APP_SETTINGS: 'poseflow-app-settings-v1',
     /** Свернут ли Sidebar */
     SIDEBAR_COLLAPSED: 'poseflow-sidebar-collapsed',
     /** Свернута ли панель Camera Controls */
     CAMERA_CONTROLS_COLLAPSED: 'poseflow-camera-controls-collapsed',
   } as const;
   ```

2. Заменить string-литералы в:
   - `src/lib/feature-flags/FeatureFlagService.ts` (`STORAGE_KEY = 'poseflow_feature_flags'`)
   - `src/lib/logger.ts` (`'poseflow-logs'`)
   - `src/lib/appSettings.ts` (`'poseflow-app-settings-v1'`)
   - `src/App.tsx` и `src/components/Canvas3D.tsx` (`'poseflow-sidebar-collapsed'`)
   - `src/components/Canvas3D.tsx` (`'poseflow-camera-controls-collapsed'`)

   На `STORAGE_KEYS.FEATURE_FLAGS` и т.д.

3. Если найдены другие ключи (не из списка выше) — добавить их в `STORAGE_KEYS` и обновить `codebase-map.md` §6.E.

### Acceptance

- [ ] `Grep` по `'poseflow[_-]` (с одинарными кавычками или backticks) — все совпадения только в `storageKeys.ts` (определение констант).
- [ ] `npm run typecheck`, `npm test` чистые.
- [ ] Поведение приложения не меняется (значения ключей остались теми же).
- [ ] Коммит: `chore: единый реестр localStorage-ключей в lib/storageKeys.ts`.

---

## Финальный шаг (после A–E)

1. **Обновить `ai/docs/codebase-map.md`:**
   - В §6 пометить решённые пункты (A, B, C, D, E) как «✅ исправлено [дата]».
   - Если что-то осталось (например, F — graceful degradation сохранён) — оставить как есть.
   - В §4 (`lib/`) удалить упоминания `lib/debugFlags.ts` и `lib/stores/`.
   - В §6.E обновить таблицу localStorage-ключей.

2. **Обновить `STATUS.md`** — одна строка под текущую дату:
   > Архитектурная чистка: устранены параллельные механизмы (FeatureFlagContext, debugFlags, stores), модульный синглтон cameraService переведён на DI, добавлен реестр localStorage-ключей.

3. **Обновить `CHANGELOG.md`** в секции «Технические изменения» — кратко то же самое.

4. Финальный коммит, если эти три файла затронуты: `docs: зафиксировать результаты архитектурной чистки`.

5. `npm run verify` — финальная общая проверка.

---

## Найдено по пути

*(Исполнитель добавляет сюда любые архитектурные проблемы, замеченные при выполнении задач, но не относящиеся к ним. Не правит — только записывает.)*

- 

---

## Контрольные точки запуска

```bash
cd D:\ai\QwenCoder\.claude\worktrees\epic-mclean-a6836d\poseflow
npm run typecheck    # после каждой задачи
npm test             # после каждой задачи
npm run verify       # в самом конце (typecheck + test + build)
npm run dev          # для ручной проверки UI после A, C, D
```

При запуске `npm run dev` — открыть DevTools Console, проверить:
- Кнопки Perf Trace и Leg IK Trace в Sidebar → Debug секции работают, лог `[perf:applyLegIK]` появляется при движении ноги.
- Камера-кнопки в правой панели Canvas3D переключают ракурсы.
- Settings → Camera animation duration реально влияет на скорость анимации переключения камер.
