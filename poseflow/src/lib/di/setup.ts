// src/lib/di/setup.ts
// Настройка DI контейнера с регистрацией сервисов

import { Container, defaultContainer } from './Container';
import { ServiceKeys } from './types';
import { PoseService } from '../../services/PoseService';
import { CameraService } from '../../services/cameraService';
import { ExportService } from '../../services/ExportService';
import { FeatureFlagService } from '../feature-flags/FeatureFlagService';
import { RigService } from '../../services/RigService';
import { SelectionService } from '../../services/SelectionService';

/**
 * Настройка контейнера с регистрацией всех сервисов
 */
export function setupContainer(container: Container = defaultContainer): Container {
  // RigService - синглтон (первичный источник истины позы)
  container.register(
    ServiceKeys.RigService,
    () => new RigService(),
    { singleton: true }
  );

  // PoseService - синглтон (обёртка над RigService для совместимости)
  container.register(
    ServiceKeys.PoseService,
    () => new PoseService(container.get<RigService>(ServiceKeys.RigService)),
    { singleton: true }
  );

  // SelectionService - синглтон
  container.register(
    ServiceKeys.SelectionService,
    () => new SelectionService(),
    { singleton: true }
  );

  // CameraService - создаем новый экземпляр
  container.register(
    ServiceKeys.CameraService,
    () => new CameraService(),
    { singleton: true }
  );

  // ExportService - создаем новый экземпляр каждый раз (не синглтон)
  container.register(
    ServiceKeys.ExportService,
    () => new ExportService(),
    { singleton: false }
  );

  // FeatureFlagService - синглтон
  container.register(
    ServiceKeys.FeatureFlagService,
    () => new FeatureFlagService({ debug: import.meta.env.DEV }),
    { singleton: true }
  );

  return container;
}

/**
 * Получение сервиса из контейнера по умолчанию (удобный хелпер)
 */
export function getService<T>(key: symbol): T {
  return defaultContainer.get<T>(key);
}

// NOTE: Автоматическая настройка при импорте УДАЛЕНА.
// setupContainer() вызывается явно в main.tsx.
// Это предотвращает двойную инициализацию при импорте из разных модулей.
