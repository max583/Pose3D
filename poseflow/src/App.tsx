import React, { useState } from 'react';
import * as THREE from 'three';
import { Canvas3D } from './components/Canvas3D';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { StatusBar } from './components/StatusBar';
import { ExportFrameData } from './components/ExportFrame';
import { useIPC } from './hooks/useIPC';
import { uiLogger, exportLogger } from './lib/logger';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { ServiceProvider } from './context/ServiceContext';
import { usePoseService, useExportService } from './context/ServiceContext';
import './App.css';

const AppContent: React.FC = () => {
  const { appInfo, healthStatus } = useIPC();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('focus') === '1';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.localStorage.getItem('poseflow-sidebar-collapsed') === 'true';
  });
  const [exportFrameRequestId, setExportFrameRequestId] = useState(0);
  
  const poseService = usePoseService();
  const exportService = useExportService();

  React.useEffect(() => {
    uiLogger.info('App initialized');
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem('poseflow-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        setFocusMode(value => !value);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportFrame = async (frameData: ExportFrameData, camera: THREE.Camera) => {
    exportLogger.info('Export frame requested', frameData);
    
    const poseData = poseService.getPoseData();
    const resolution = frameData.resolution === '1K' ? 1024 : frameData.resolution === '2K' ? 2048 : 4096;
    
    try {
      await exportService.downloadPNGWithCrop?.(
        poseData,
        camera,
        frameData,
        resolution,
        `pose_export_${frameData.resolution}.png`
      );
    } catch (error) {
      exportLogger.error('Export frame failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className={`app${focusMode ? ' app-focus-mode' : ''}`}>
      {!focusMode && (
      <header className="app-header">
        <h1>PoseFlow Editor</h1>
        <div className="header-info">
          {appInfo && <span>v{appInfo.version}</span>}
          {healthStatus && (
            <span className={`health-status ${healthStatus.status === 'healthy' ? 'healthy' : 'unhealthy'}`}>
              {healthStatus.status === 'healthy' ? '●' : '○'} Backend
            </span>
          )}
        </div>
      </header>
      )}

      <div className="app-content">
        {!focusMode && !sidebarCollapsed && (
          <Sidebar
            onOpenSettings={() => setSettingsOpen(true)}
            onShowExportFrame={() => setExportFrameRequestId((id) => id + 1)}
            onCollapse={() => setSidebarCollapsed(true)}
          />
        )}
        {!focusMode && sidebarCollapsed && (
          <button
            type="button"
            className="sidebar-restore"
            onClick={() => setSidebarCollapsed(false)}
            title="Показать панель инструментов"
            aria-label="Показать панель инструментов"
          >
            →
          </button>
        )}
        <main className="app-main">
          <Canvas3D
            focusMode={focusMode}
            exportFrameRequestId={exportFrameRequestId}
            onExportFrame={handleExportFrame}
          />
        </main>
      </div>

      {!focusMode && <StatusBar />}

      {!focusMode && <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ServiceProvider>
      <FeatureFlagProvider>
        <AppContent />
      </FeatureFlagProvider>
    </ServiceProvider>
  );
};

export default App;
