// src/lib/di/types.ts
// Базовые типы и интерфейсы для DI контейнера

import { IPoseService } from '../services/interfaces/IPoseService';
import { ICameraService } from '../services/interfaces/ICameraService';
import { IExportService } from '../services/interfaces/IExportService';
import { IFeatureFlagService } from '../services/interfaces/IFeatureFlagService';

/**
 * Базовый интерфейс для всех сервисов
 */
export interface Service {
  dispose?(): void;
}

// Реэкспорт интерфейсов сервисов
export type { IPoseService, ICameraService, IExportService, IFeatureFlagService };

/**
 * Ключи сервисов для DI контейнера
 */
export const ServiceKeys = {
  PoseService: Symbol('PoseService'),
  CameraService: Symbol('CameraService'),
  ExportService: Symbol('ExportService'),
  FeatureFlagService: Symbol('FeatureFlagService'),
} as const;

export type ServiceKey = keyof typeof ServiceKeys | symbol;