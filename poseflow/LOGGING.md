# Система логирования PoseFlow Editor

## Обзор

Приложение использует раздельную систему логирования для каждого компонента:
- **Python Backend** — логи в `backend/logs/`
- **Electron Main Process** — логи в `logs/`
- **React Frontend** — логи в браузере (localStorage + консоль)

## Структура логов

### Python Backend (`backend/logs/`)

| Файл | Описание | Уровень |
|------|----------|---------|
| `backend.log` | Основной лог приложения | INFO |
| `backend_error.log` | Только ошибки | ERROR |
| `backend_export.log` | Операции экспорта | INFO |
| `backend_pose.log` | Операции с позами | INFO |

**Пример записи:**
```
2026-04-05 14:30:15 - poseflow.backend - INFO - Export request: format=json
```

### Electron Main Process (`logs/`)

| Файл | Описание |
|------|----------|
| `electron-main.log` | Основные события приложения |
| `electron-error.log` | Ошибки Electron |

**Пример записи:**
```
2026-04-05T14:30:15.123Z [INFO] [Main] Application ready
```

### React Frontend (localStorage)

Фронтенд хранит логи в localStorage браузера (до 1000 записей).

**Модули:**
- `UI` — события интерфейса
- `Canvas3D` — события 3D-канваса
- `Skeleton3D` — операции со скелетом
- `Export` — операции экспорта
- `IPC` — взаимодействие с Electron/Backend

## Просмотр логов

### Python Backend

1. **Консоль**: Все логи дублируются в stdout
2. **Файлы**: `backend/logs/*.log`

```bash
# Просмотр в реальном времени
tail -f backend/logs/backend.log

# Только ошибки
tail -f backend/logs/backend_error.log
```

### Electron

1. **Консоль**: Все логи дублируются в консоль Node.js
2. **Файлы**: `logs/*.log`

### React Frontend

1. **Консоль браузера**: F12 → Console
2. **localStorage**: Ключ `poseflow-logs`
3. **Экспорт**: В консоли браузера выполните:

```javascript
// Получить все логи
logUtils.getLogs()

// Экспорт в файл
logUtils.exportLogs()

// Очистить логи
logUtils.clearLogs()

// Количество записей
logUtils.getLogCount()
```

Для доступа к `logUtils` импортируйте в компоненте:
```typescript
import { logUtils } from './lib/logger';
```

## Использование в коде

### Python

```python
from logging_config import app_logger, error_logger, export_logger, pose_logger

# Обычное сообщение
app_logger.info("Operation completed")

# Ошибка с traceback
try:
    risky_operation()
except Exception as e:
    error_logger.error(f"Operation failed: {e}", exc_info=True)

# Отладочное сообщение
export_logger.debug(f"Processing {count} items")
```

### TypeScript (Electron)

```typescript
import { mainLogger, pythonLogger, ipcLogger } from './logger';

mainLogger.info('Application started');
pythonLogger.error('Python process failed', errorDetails);
ipcLogger.debug('IPC message received', data);
```

### TypeScript (React)

```typescript
import { uiLogger, canvasLogger, exportLogger, logUtils } from './logger';

uiLogger.info('Button clicked');
canvasLogger.warn('Texture not loaded');
exportLogger.error('Export failed', error);

// DEBUG логи только в development
canvasLogger.debug('Joint position updated', position);
```

## Ротация логов

### Python
- Максимальный размер файла: **10 МБ**
- Количество резервных копий: **3**
- Автоматическая ротация через `RotatingFileHandler`

### Electron
- Логи перезаписываются при каждом запуске
- Рекомендуется ручная очистка при необходимости

### React (localStorage)
- Максимум **1000 записей**
- Старые записи автоматически удаляются
- Хранилище очищается пользователем через DevTools

## Настройка уровней логирования

### Python
В `backend/logging_config.py` измените параметр `level`:
```python
app_logger = setup_logger('poseflow.backend', 'backend.log', level=logging.DEBUG)
```

### Electron
В `electron/logger.ts` DEBUG-логи включаются автоматически в development:
```typescript
if (process.env.NODE_ENV === 'development') {
  // debug логи выводятся
}
```

### React
В `src/lib/logger.ts` DEBUG-логи также ограничены development режимом.

## Добавление нового логгера

### Python
```python
# В logging_config.py
my_logger = setup_logger('poseflow.backend.my_module', 'backend_my_module.log')
```

### Electron
```typescript
// В electron/logger.ts
export const myLogger = createLogger('MyModule');
```

### React
```typescript
// В src/lib/logger.ts
export const myLogger = createLogger('MyComponent');
```

## Устранение проблем

### Логи не создаются
1. Проверьте права доступа к директории
2. Убедитесь, что директория `logs` существует
3. Проверьте, что процесс имеет права на запись

### Логи слишком большие
1. Уменьшите `MAX_BYTES` в `logging_config.py`
2. Уменьшите `MAX_LOG_ENTRIES` в `logger.ts` (фронтенд)
3. Включите ротацию для Electron логов

### Фронтенд логи не сохраняются
1. Проверьте, что localStorage не отключен в браузере
2. Очистите место в localStorage
3. Проверьте консоль на ошибки сохранения

## Мониторинг в реальном времени

### Python
```bash
# Windows PowerShell
Get-Content backend/logs/backend.log -Wait

# Все логи
Get-Content backend/logs/*.log -Wait
```

### Electron
```bash
# Windows PowerShell
Get-Content logs/electron-main.log -Wait
```

### Все компоненты одновременно
Используйте утилиты вроде `multitail` или откройте несколько терминалов.
