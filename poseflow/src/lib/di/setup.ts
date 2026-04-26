// src/lib/di/setup.ts
// Настройка DI контейнера с регистрацией сервисов

import { Container, defaultContainer } from './Container';
import { ServiceKeys } from './types';
import { PoseService } from '../../services/PoseService';
import { CameraService } from '../../services/cameraService';
import { ExportService } from '../../services/ExportService';
import { FeatureFlagService } from '../feature-flags/FeatureFlagService';

/**
 * Настройка контейнера с регистрацией всех сервисов
 */
export function setupContainer(container: Container = defaultContainer): Container {
  // PoseService - синглтон
  container.register(
    ServiceKeys.PoseService,
    () => new PoseService(),
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
