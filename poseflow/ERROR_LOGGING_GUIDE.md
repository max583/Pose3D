# Система логирования ошибок - Руководство

**Дата**: воскресенье, 5 апреля 2026 г.  
**Версия**: v0.2.1

---

## 📊 Обзор

Приложение использует **многоуровневую систему логирования** для перехвата и записи всех ошибок:

1. **Глобальный перехват** - window error handlers
2. **React Error Boundary** - перехват ошибок рендеринга
3. **Try-Catch в сервисах** - логирование бизнес-логики
4. **Try-Catch в хуках** - логирование пользовательских действий

---

## 🏗️ Архитектура

### Уровни логирования

```
┌─────────────────────────────────────┐
│ 1. Global Error Handlers            │  ← Синхронные ошибки, Promise rejections
├─────────────────────────────────────┤
│ 2. React Error Boundary             │  ← Ошибки рендеринга компонентов
├─────────────────────────────────────┤
│ 3. Service Error Logging            │  ← Экспорт, PoseService, камера
├─────────────────────────────────────┤
│ 4. Hook Error Logging               │  ← Drag-and-drop, события мыши
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Logger (src/lib/logger.ts)         │
│  ├── Console Output                 │
│  ├── localStorage (1000 записей)    │
│  └── Export to File                 │
└─────────────────────────────────────┘
```

---

## 🔧 Компоненты системы

### 1. Глобальные обработчики (`setupErrorHandling`)

**Файл**: `src/lib/logger.ts`

**Что перехватывает**:
- ✅ Синхронные ошибки (`window.addEventListener('error')`)
- ✅ Необработанные Promise rejection (`unhandledrejection`)
- ✅ Ошибки React (перехват `console.error`)

**Что логирует**:
- Сообщение ошибки
- Имя файла, строку, колонку
- Stack trace
- Тип ошибки

**Пример**:
```typescript
// В main.tsx
import { setupErrorHandling } from './lib/logger';
setupErrorHandling(); // Инициализация при запуске
```

### 2. Error Boundary (`ErrorBoundary.tsx`)

**Что перехватывает**:
- ✅ Ошибки рендеринга React компонентов
- ✅ Ошибки в lifecycle методах
- ✅ Ошибки в конструкторах

**Что логирует**:
- Сообщение ошибки
- Component stack (дерево компонентов)
- Stack trace
- Имя ошибки

**Пример использования**:
```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 3. Сервисы с логированием

#### ExportService (`src/services/ExportService.ts`)

**Методы с логированием**:
- `downloadJSON()` - логирует начало и ошибки экспорта JSON
- `downloadPNG()` - логирует начало и ошибки экспорта PNG
- `exportToPNG()` - логирует ошибки проекции
- `projectTo2D()` - логирует ошибки проекции камеры

**Пример лога**:
```
[Export] Downloading JSON: pose_openpose.json { camera: true, resolution: 512 }
[Export] JSON download initiated successfully
```

**Пример ошибки**:
```
[Error] Failed to download JSON {
  error: "camera.project is not a function",
  stack: "TypeError: camera.project is not a function\n    at...",
  filename: "pose_openpose.json"
}
```

#### PoseService (`src/services/PoseService.ts`)

**Методы с логированием**:
- `updateJoint()` - логирует ошибки обновления позиции сустава
- `notifyListeners()` - логирует ошибки уведомления подписчиков

**Пример лога**:
```
[Skeleton3D] Joint drag started
[Canvas3D] Joint 5 position changed { x: 0.3, y: 1.2, z: 0 }
```

**Пример ошибки**:
```
[Error] Failed to update joint position {
  index: 5,
  position: { x: NaN, y: 0, z: 0 },
  error: "Invalid joint position"
}
```

### 4. Хуки с логированием

#### useTransformDrag (`src/hooks/useTransformDrag.ts`)

**Что логирует**:
- ✅ Ошибки при движении мыши во время drag
- ✅ Ошибки при обновлении позиции сустава
- ✅ Ошибки при инициализации drag

**Пример лога**:
```
[Skeleton3D] Joint 3 pointer down
[Skeleton3D] Joint drag started
```

**Пример ошибки**:
```
[Error] Error during joint drag move {
  index: 3,
  error: "Cannot read properties of undefined",
  clientX: 450,
  clientY: 320
}
```

---

## 📝 Логгеры модулей

### Доступные логгеры

```typescript
import {
  uiLogger,        // UI события (кнопки, формы)
  canvasLogger,    // 3D Canvas события
  skeletonLogger,  // Скелет, joints, bones
  exportLogger,    // Экспорт JSON/PNG
  ipcLogger,       // IPC Electron ↔ Python
  errorLogger,     // ❌ Все ошибки (глобальный)
} from './lib/logger';
```

### Использование

```typescript
// Обычное сообщение
exportLogger.info('Exporting to JSON', { resolution: 512 });

// Предупреждение
canvasLogger.warn('Texture not loaded, using fallback');

// Ошибка
errorLogger.error('Failed to load pose data', {
  error: error.message,
  stack: error.stack,
  fileUrl: '/data/pose.json'
});

// Debug (только development)
skeletonLogger.debug('Joint position updated', { x: 0.5, y: 1.2, z: 0 });
```

---

## 💾 Хранение логов

### localStorage

**Ключ**: `poseflow-logs`  
**Максимум**: 1000 записей ( FIFO - старые удаляются)

**Формат записи**:
```json
{
  "timestamp": "2026-04-05T14:30:15.123Z",
  "level": "ERROR",
  "module": "Export",
  "message": "Failed to download JSON",
  "data": {
    "error": "camera.project is not a function",
    "stack": "TypeError: ..."
  }
}
```

### Просмотр логов

**Через DevTools**:
1. F12 → Application → Local Storage → `http://localhost:5173`
2. Ключ: `poseflow-logs`

**Через консоль**:
```javascript
// Получить все логи
logUtils.getLogs()

// Количество логов
logUtils.getLogCount()

// Экспорт в файл
logUtils.exportLogs()

// Очистить логи
logUtils.clearLogs()
```

---

## 📂 Экспорт логов

### Автоматический экспорт

```typescript
import { logUtils } from './lib/logger';

// Экспорт в текстовый файл
logUtils.exportLogs();
// Сохраняется как: poseflow-logs-2026-04-05T14-30-15.txt
```

### Формат экспортированного файла

```
2026-04-05T14:30:15.123Z [ERROR] [Export] Failed to download JSON
{
  "error": "camera.project is not a function",
  "stack": "TypeError: camera.project is not a function\n    at..."
}

2026-04-05T14:30:10.456Z [INFO] [Export] Downloading JSON: pose_openpose.json
{
  "camera": true,
  "resolution": 512
}
```

---

## 🔍 Отладка типичных проблем

### 1. Приложение не загружается (белый экран)

**Проверить**:
1. DevTools Console (F12)
2. Искать сообщения `[Error]`
3. Проверить `errorLogger` логи в localStorage

**Команды**:
```javascript
// Получить только ошибки
const logs = logUtils.getLogs().filter(l => l.level === 'ERROR');
console.table(logs);
```

### 2. Drag-and-Drop не работает

**Проверить**:
1. Консоль на `[Skeleton3D]` логи
2. localStorage на ошибки `Error during joint drag move`
3. Проверить, что `onPositionChange` вызывается

**Команды**:
```javascript
// Получить логи скелета
const logs = logUtils.getLogs().filter(l => l.module === 'Skeleton3D');
console.log(logs);
```

### 3. Экспорт падает

**Проверить**:
1. Консоль на `[Export]` логи
2. `[Error] Failed to download JSON/PNG`
3. Stack trace ошибки

**Команды**:
```javascript
// Получить ошибки экспорта
const logs = logUtils.getLogs().filter(
  l => l.module === 'Export' || l.message.includes('download')
);
console.log(logs);
```

### 4. Vite dev server упал

**Проверить**:
1. Терминал Vite на ошибки компиляции
2. `npx tsc --noEmit` для проверки TypeScript
3. Перезапустить: `npx vite`

---

## ⚙️ Настройка логирования

### Изменить максимальное количество записей

**Файл**: `src/lib/logger.ts`

```typescript
const MAX_LOG_ENTRIES = 2000; // Было 1000
```

### Отключить DEBUG логи в production

Уже реализовано:
```typescript
if (process.env.NODE_ENV === 'development') {
  // DEBUG логи только в разработке
}
```

### Добавить новый логгер

**Файл**: `src/lib/logger.ts`

```typescript
// В конец файла
export const myLogger = createLogger('MyModule');
```

**Использование**:
```typescript
import { myLogger } from './lib/logger';

myLogger.info('Module initialized');
myLogger.error('Something went wrong', { details });
```

---

## 🐛 Добавление логирования в новый код

### Шаблон для сервисов

```typescript
import { myLogger, errorLogger } from '../lib/logger';

export class MyService {
  static doSomething(data: any): Result {
    try {
      myLogger.info('Starting operation', { dataType: typeof data });
      
      // Бизнес-логика
      const result = processData(data);
      
      myLogger.info('Operation completed successfully');
      return result;
    } catch (error) {
      errorLogger.error('Operation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        data, // Контекст (осторожно с большими объектами!)
      });
      throw error; // Или вернуть fallback значение
    }
  }
}
```

### Шаблон для хуков

```typescript
import { myLogger, errorLogger } from '../lib/logger';

export function useMyHook() {
  const handleEvent = useCallback((event: Event) => {
    try {
      myLogger.debug('Event received', { type: event.type });
      // Обработка
    } catch (error) {
      errorLogger.error('Error in event handler', {
        error: error instanceof Error ? error.message : String(error),
        eventType: event.type,
      });
    }
  }, []);

  return handleEvent;
}
```

---

## 📊 Статистика логирования

### Покрытие кода логированием

| Модуль | Файлы с логированием | Всего файлов | Покрытие |
|--------|----------------------|--------------|----------|
| Services | 2/2 | 2 | 100% |
| Hooks | 1/2 | 2 | 50% |
| Components | 1/X | X | ... |
| Utils | 1/1 | 1 | 100% |

### Уровни ошибок

| Уровень | Когда использовать | Пример |
|---------|-------------------|--------|
| **DEBUG** | Отладочная информация (dev only) | "Joint position: {x: 0.5, y: 1.2}" |
| **INFO** | Обычные операции | "Export initiated" |
| **WARN** | Потенциальные проблемы | "Camera not registered, using fallback" |
| **ERROR** | Ошибки, исключения | "Failed to export: invalid camera" |

---

## ✅ Чек-лист добавления логирования

При добавлении нового функционала:

- [ ] Добавлен `try-catch` блок
- [ ] Вызывается `errorLogger.error()` с контекстом
- [ ] Логируется начало операции (`info`)
- [ ] Логируется успешное завершение (`info`)
- [ ] Stack trace включён в ошибку
- [ ] Контекст ошибки передан (параметры, данные)
- [ ] Ошибка пробрасывается дальше (`throw error`) или возвращается fallback

---

**Обновлено**: 5 апреля 2026 г.  
**Автор**: Qwen Code Agent
