/**
 * Logger для Electron main процесса
 * Записывает логи в файл и выводит в консоль
 */
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Директория для логов (в пользовательской директории или рядом с приложением)
const getLogDir = (): string => {
  // В режиме разработки используем папку проекта
  const basePath = path.join(process.cwd(), 'logs');
  return basePath;
};

// Убедимся, что директория существует
const ensureLogDir = (): void => {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

// Получить путь к файлу лога
const getLogFilePath = (name: string): string => {
  ensureLogDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(getLogDir(), `${name}.log`);
};

// Форматирование сообщения
const formatMessage = (level: string, module: string, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const base = `${timestamp} [${level}] [${module}] ${message}`;
  return data ? `${base}\n${JSON.stringify(data, null, 2)}` : base;
};

const safeConsole = (
  method: 'log' | 'warn' | 'error' | 'debug',
  ...args: unknown[]
): void => {
  try {
    console[method](...args);
  } catch (error: any) {
    if (error?.code !== 'EPIPE') {
      try {
        process.stderr.write(`Logger console ${method} failed: ${String(error)}\n`);
      } catch {
        // stderr can be closed too; file logging below remains the reliable path.
      }
    }
  }
};

// Запись в файл
const writeToFile = (filePath: string, message: string): void => {
  try {
    fs.appendFileSync(filePath, message + '\n', 'utf-8');
  } catch (error) {
    safeConsole('error', 'Failed to write to log file:', error);
  }
};

// Создание логгера
export const createLogger = (module: string) => {
  const logFilePath = getLogFilePath('electron-main');
  const errorFilePath = getLogFilePath('electron-error');

  return {
    info: (message: string, data?: any) => {
      const formatted = formatMessage('INFO', module, message, data);
      safeConsole('log', formatted);
      writeToFile(logFilePath, formatted);
    },

    warn: (message: string, data?: any) => {
      const formatted = formatMessage('WARN', module, message, data);
      safeConsole('warn', formatted);
      writeToFile(logFilePath, formatted);
    },

    error: (message: string, error?: any) => {
      const formatted = formatMessage('ERROR', module, message, error);
      safeConsole('error', formatted);
      writeToFile(errorFilePath, formatted);
    },

    debug: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        const formatted = formatMessage('DEBUG', module, message, data);
        safeConsole('debug', formatted);
        writeToFile(logFilePath, formatted);
      }
    },
  };
};

// Глобальный логгер для main процесса
export const mainLogger = createLogger('Main');

// Логгер для IPC
export const ipcLogger = createLogger('IPC');

// Логгер для Python процесса
export const pythonLogger = createLogger('Python');
