// src/hooks/useFeatureFlagIntegration.ts
// Хук для доступа к FeatureFlagIntegration

import { useMemo } from 'react';
import { FeatureFlagIntegration } from '../lib/experimental/integration/FeatureFlagIntegration';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';
import { ServiceKeys } from '../lib/di';
import { getService } from '../lib/di/setup';

/**
 * Хук для получения экземпляра FeatureFlagIntegration
 * Использует DI контейнер для получения FeatureFlagIntegration
 * или создает новый экземпляр, если DI не настроен
 */
export function useFeatureFlagIntegration(): FeatureFlagIntegration {
  return useMemo(() => {
    try {
      // Пытаемся получить FeatureFlagIntegration из DI контейнера
      return getService<FeatureFlagIntegration>(ServiceKeys.FeatureFlagIntegration);
    } catch (error) {
      // Если DI контейнер не настроен или интеграция не зарегистрирована,
      // создаем новый экземпляр с FeatureFlagService
      console.warn('FeatureFlagIntegration not found in DI container, creating new instance', error);
      
      let featureFlagService: FeatureFlagService;
      try {
        featureFlagService = getService<FeatureFlagService>(ServiceKeys.FeatureFlagService);
      } catch (error2) {
        // Если FeatureFlagService тоже не найден, создаем новый
        featureFlagService = new FeatureFlagService({ debug: import.meta.env.DEV });
      }
      
      const integration = new FeatureFlagIntegration(featureFlagService);
      integration.initialize();
      return integration;
    }
  }, []);
}

/**
 * Хук для получения контроллеров для отображения
 * Возвращает массив контроллеров, если включен флаг USE_DESIGNDOLL_CONTROLLERS
 */
export function useDesignDollControllers() {
  const integration = useFeatureFlagIntegration();
  
  return useMemo(() => {
    return integration.getControllersForDisplay();
  }, [integration]);
}

/**
 * Хук для проверки, включены ли DesignDoll контроллеры
 */
export function useIsDesignDollControllersEnabled(): boolean {
  const integration = useFeatureFlagIntegration();
  
  return useMemo(() => {
    return integration.isDesignDollControllersEnabled();
  }, [integration]);
}