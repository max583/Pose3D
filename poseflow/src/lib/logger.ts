/**
 * Logger для фронтенда (React)
 * - Выводит в консоль браузера
 * - Сохраняет в localStorage (последние 1000 записей)
 * - Позволяет экспортировать логи
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

const LOG_STORAGE_KEY = 'poseflow-logs';
const MAX_LOG_ENTRIES = 1000;

// Форматирование времени
const getTimestamp = (): string => new Date().toISOString();

// Получение сохраненных логов
const getStoredLogs = (): LogEntry[] => {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Сохранение логов в localStorage
const saveToStorage = (entry: LogEntry): void => {
  try {
    const logs = getStoredLogs();
    logs.push(entry);
    
    // Ограничиваем количество записей
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }
    
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to save logs to localStorage:', error);
  }
};

// Вывод в консоль
const logToConsole = (level: LogLevel, module: string, message: string, data?: any): void => {
  const prefix = `[${module}]`;
  
  switch (level) {
    case 'DEBUG':
      console.debug(`${prefix} ${message}`, data ?? '');
      break;
    case 'INFO':
      console.info(`${prefix} ${message}`, data ?? '');
      break;
    case 'WARN':
      console.warn(`${prefix} ${message}`, data ?? '');
      break;
    case 'ERROR':
      console.error(`${prefix} ${message}`, data ?? '');
      break;
  }
};

// Создание логгера для модуля
export const createLogger = (module: string) => {
  return {
    debug: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        const entry: LogEntry = {
          timestamp: getTimestamp(),
          level: 'DEBUG',
          module,
          message,
          data,
        };
        logToConsole('DEBUG', module, message, data);
        saveToStorage(entry);
      }
    },

    info: (message: string, data?: any) => {
      const entry: LogEntry = {
        timestamp: getTimestamp(),
        level: 'INFO',
        module,
        message,
        data,
      };
      logToConsole('INFO', module, message, data);
      saveToStorage(entry);
    },

    warn: (message: string, data?: any) => {
      const entry: LogEntry = {
        timestamp: getTimestamp(),
        level: 'WARN',
        module,
        message,
        data,
      };
      logToConsole('WARN', module, message, data);
      saveToStorage(entry);
    },

    error: (message: string, error?: any) => {
      const entry: LogEntry = {
        timestamp: getTimestamp(),
        level: 'ERROR',
        module,
        message,
        data: error?.toString?.() || error,
      };
      logToConsole('ERROR', module, message, error);
      saveToStorage(entry);
    },
  };
};

// Утилиты для управления логами
export const logUtils = {
  // Получить все логи
  getLogs: (): LogEntry[] => getStoredLogs(),

  // Очистить логи
  clearLogs: (): void => {
    localStorage.removeItem(LOG_STORAGE_KEY);
    console.info('Logs cleared');
  },

  // Экспорт логов в файл
  exportLogs: (): void => {
    const logs = getStoredLogs();
    const content = logs
      .map(entry => `${entry.timestamp} [${entry.level}] [${entry.module}] ${entry.message}${entry.data ? '\n' + JSON.stringify(entry.data, null, 2) : ''}`)
      .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poseflow-logs-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Получить количество логов
  getLogCount: (): number => getStoredLogs().length,
};

// Глобальные логгеры для основных модулей
export const uiLogger = createLogger('UI');
export const canvasLogger = createLogger('Canvas3D');
export const skeletonLogger = createLogger('Skeleton3D');
export const exportLogger = createLogger('Export');
export const ipcLogger = createLogger('IPC');
export const errorLogger = createLogger('Error');

/**
 * Настройка глобального перехвата ошибок
 */
export function setupErrorHandling(): void {
  // Перехват синхронных ошибок
  window.addEventListener('error', (event: ErrorEvent) => {
    errorLogger.error(
      `Global Error: ${event.message}`,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || event.error?.toString(),
      }
    );
  });

  // Перехват ошибок Promise
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    errorLogger.error(
      'Unhandled Promise Rejection',
      {
        reason: event.reason?.toString?.() || event.reason,
        stack: event.reason?.stack,
      }
    );
  });

  // Перехват ошибок React
  const originalConsoleError = console.error;
  let isInErrorHandling = false;
  
  console.error = (...args: any[]) => {
    // Защита от рекурсии
    if (isInErrorHandling) {
      originalConsoleError.apply(console, args);
      return;
    }
    
    isInErrorHandling = true;
    
    try {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      // Логируем только ошибки React
      if (message.includes('Error') || message.includes('error') || message.includes('failed')) {
        errorLogger.error('React Console Error', { message: message.substring(0, 500) });
      }
    } finally {
      isInErrorHandling = false;
    }

    // Вызываем оригинальный console.error
    originalConsoleError.apply(console, args);
  };

  errorLogger.info('Global error handling initialized');
}
