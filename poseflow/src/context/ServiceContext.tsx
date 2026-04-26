// src/context/ServiceContext.tsx
// Контекст для предоставления сервисов через DI контейнер
// С поддержкой graceful degradation — fallback на прямые экземпляры при отсутствии ServiceProvider

import React, { createContext, useContext, ReactNode } from 'react';
import { Container, defaultContainer } from '../lib/di/Container';
import { ServiceKeys } from '../lib/di/types';
import { IPoseService } from '../lib/services/interfaces/IPoseService';
import { ICameraService } from '../lib/services/interfaces/ICameraService';
import { IExportService } from '../lib/services/interfaces/IExportService';
import { IFeatureFlagService } from '../lib/services/interfaces/IFeatureFlagService';
import { PoseService } from '../services/PoseService';
import { CameraService } from '../services/cameraService';
import { ExportService } from '../services/ExportService';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';
import { RigService } from '../services/RigService';
import { SelectionService } from '../services/SelectionService';
import { canvasLogger } from '../lib/logger';

interface ServiceContextValue {
  container: Container;
  poseService: IPoseService;
  cameraService: ICameraService;
  exportService: IExportService;
  featureFlagService: IFeatureFlagService;
  rigService: RigService;
  selectionService: SelectionService;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
  container?: Container;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ 
  children, 
  container = defaultContainer 
}) => {
  const value: ServiceContextValue = {
    container,
    poseService: container.get<IPoseService>(ServiceKeys.PoseService),
    cameraService: container.get<ICameraService>(ServiceKeys.CameraService),
    exportService: container.get<IExportService>(ServiceKeys.ExportService),
    featureFlagService: container.get<IFeatureFlagService>(ServiceKeys.FeatureFlagService),
    rigService: container.get<RigService>(ServiceKeys.RigService),
    selectionService: container.get<SelectionService>(ServiceKeys.SelectionService),
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Получить значение контекста сервисов.
 * Бросает ошибку если вне ServiceProvider — используйте use* hooks для graceful degradation.
 */
export const useServices = (): ServiceContextValue => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};

/**
 * Хук для получения PoseService с graceful degradation.
 * Если вне ServiceProvider — создаёт новый PoseService как fallback.
 */
export const usePoseService = (): IPoseService => {
  const context = useContext(ServiceContext);
  if (!context) {
    canvasLogger.warn('[ServiceContext] usePoseService called outside ServiceProvider, using fallback');
    return new PoseService(new RigService());
  }
  return context.poseService;
};

/**
 * Хук для получения CameraService с graceful degradation.
 */
export const useCameraService = (): ICameraService => {
  const context = useContext(ServiceContext);
  if (!context) {
    canvasLogger.warn('[ServiceContext] useCameraService called outside ServiceProvider, using fallback');
    return new CameraService();
  }
  return context.cameraService;
};

/**
 * Хук для получения ExportService с graceful degradation.
 */
export const useExportService = (): IExportService => {
  const context = useContext(ServiceContext);
  if (!context) {
    canvasLogger.warn('[ServiceContext] useExportService called outside ServiceProvider, using fallback');
    return new ExportService();
  }
  return context.exportService;
};

/**
 * Хук для получения FeatureFlagService с graceful degradation.
 */
export const useFeatureFlagService = (): IFeatureFlagService => {
  const context = useContext(ServiceContext);
  if (!context) {
    canvasLogger.warn('[ServiceContext] useFeatureFlagService called outside ServiceProvider, using fallback');
    return new FeatureFlagService({ debug: typeof import.meta !== 'undefined' && import.meta.env?.DEV });
  }
  return context.featureFlagService;
};

/**
 * Хук для получения RigService.
 */
export const useRigService = (): RigService => {
  const context = useContext(ServiceContext);
  if (!context) {
    canvasLogger.warn('[ServiceContext] useRigService called outside ServiceProvider, using fallback');
    return new RigService();
  }
  return context.rigService;
};

/**
 * Хук для получения SelectionService.
 */
export const useSelectionService = (): SelectionService => {
  const context = useContext(ServiceContext);
  if (!context) {
    canvasLogger.warn('[ServiceContext] useSelectionService called outside ServiceProvider, using fallback');
    return new SelectionService();
  }
  return context.selectionService;
};
