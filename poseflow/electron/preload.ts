import { contextBridge, ipcRenderer } from 'electron';

// Типы для IPC
export interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

export interface HealthStatus {
  status: string;
  message?: string;
}

export interface ExportResult {
  status: string;
  data?: any;
  message?: string;
}

// Безопасное предоставление API renderer-процессу
contextBridge.exposeInMainWorld('electronAPI', {
  // Получить информацию о приложении
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke('app:info'),
  
  // Проверить здоровье Python backend
  checkPythonHealth: (): Promise<HealthStatus> => ipcRenderer.invoke('python:health'),
  
  // Экспортировать позу
  exportPose: (data: any): Promise<ExportResult> => ipcRenderer.invoke('pose:export', data),
  
  // Тестовый лог
  testLog: (message: string): Promise<any> => ipcRenderer.invoke('log:test', message),
});
