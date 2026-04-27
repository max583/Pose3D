import { useState, useEffect } from 'react';
import { ipcLogger } from '../lib/logger';

// Типы (должны совпадать с preload.ts)
interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

interface HealthStatus {
  status: string;
  message?: string;
}

// Проверяем, доступен ли electronAPI (в браузере его не будет)
const hasElectronAPI = () => typeof window !== 'undefined' && 'electronAPI' in window;

export const useIPC = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  // Загрузка информации о приложении
  useEffect(() => {
    if (hasElectronAPI()) {
      window.electronAPI.getAppInfo()
        .then((info) => {
          ipcLogger.info('App info received', info);
          setAppInfo(info);
        })
        .catch((error) => {
          ipcLogger.error('Failed to get app info', error);
        });
    } else {
      // Fallback для браузера
      ipcLogger.info('Running in browser mode (no Electron)');
      setAppInfo({
        name: 'PoseFlow Editor (Browser Mode)',
        version: '0.1.0',
        platform: 'web',
      });
    }
  }, []);

  // Проверка здоровья Python backend
  useEffect(() => {
    const checkHealth = async () => {
      if (hasElectronAPI()) {
        const status = await window.electronAPI.checkPythonHealth();
        ipcLogger.debug('Python health check', status);
        setHealthStatus(status);
      } else {
        // Fallback: прямое обращение к API
        try {
          const response = await fetch('http://127.0.0.1:8000/health');
          const data = await response.json();
          setHealthStatus(data);
        } catch (error) {
          setHealthStatus({ status: 'unreachable', message: 'Backend not running' });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000); // Проверка каждые 5 секунд

    return () => clearInterval(interval);
  }, []);

  // Тестовый лог
  const testLog = async (message: string) => {
    ipcLogger.info('Test log requested', message);
    
    if (hasElectronAPI()) {
      return await window.electronAPI.testLog(message);
    } else {
      // Fallback
      try {
        const response = await fetch('http://127.0.0.1:8000/log/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        return await response.json();
      } catch (error) {
        ipcLogger.error('Log failed', error);
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }
  };

  return {
    appInfo,
    healthStatus,
    testLog,
  };
};
