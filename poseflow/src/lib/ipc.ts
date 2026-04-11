// Глобальные типы для Electron IPC
// Эти типы предоставляются через preload script

export interface ElectronAPI {
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    platform: string;
  }>;
  
  checkPythonHealth: () => Promise<{
    status: string;
    message?: string;
  }>;
  
  exportPose: (data: any) => Promise<{
    status: string;
    data?: any;
    message?: string;
  }>;
  
  testLog: (message: string) => Promise<{
    status: string;
    message: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
