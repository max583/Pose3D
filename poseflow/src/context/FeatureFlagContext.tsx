// src/context/FeatureFlagContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';
import { UserContext } from '../lib/feature-flags/types';

// Создаем экземпляр сервиса
const createFeatureFlagService = () => {
  return new FeatureFlagService({
    debug: import.meta.env.DEV,
  });
};

// Создаем контекст
const FeatureFlagContext = createContext<FeatureFlagService | null>(null);

interface FeatureFlagProviderProps {
  children: React.ReactNode;
  /** Пользовательский контекст (опционально) */
  userContext?: UserContext;
  /** Кастомный сервис (опционально, для тестов) */
  service?: FeatureFlagService;
}

/**
 * Провайдер для feature flags
 */
export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  userContext,
  service,
}) => {
  const [featureFlagService] = useState(() => service || createFeatureFlagService());

  useEffect(() => {
    // Устанавливаем контекст пользователя, если предоставлен
    if (userContext) {
      featureFlagService.setUserContext(userContext);
    } else {
      // Или создаем анонимный контекст
      const anonymousContext: UserContext = {
        userId: `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      featureFlagService.setUserContext(anonymousContext);
    }

    // В dev режиме экспортируем сервис в глобальную область для отладки
    if (import.meta.env.DEV) {
      (window as any).__featureFlags = featureFlagService;
    }

    // Очистка при размонтировании
    return () => {
      if (import.meta.env.DEV && (window as any).__featureFlags === featureFlagService) {
        delete (window as any).__featureFlags;
      }
    };
  }, [featureFlagService, userContext]);

  return (
    <FeatureFlagContext.Provider value={featureFlagService}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

/**
 * Хук для использования feature flag сервиса
 */
export const useFeatureFlagService = (): FeatureFlagService => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagService must be used within FeatureFlagProvider');
  }
  return context;
};

/**
 * Хук для проверки включен ли флаг
 */
export const useFeatureFlag = (key: string): boolean => {
  const service = useFeatureFlagService();
  const [isEnabled, setIsEnabled] = useState(() => service.isEnabled(key));

  useEffect(() => {
    // Подписываемся на изменения флага
    const unsubscribe = service.subscribe(key, (state) => {
      setIsEnabled(state.enabled && state.activatedForUser);
    });

    return unsubscribe;
  }, [service, key]);

  return isEnabled;
};

/**
 * Хук для получения состояния флага
 */
export const useFeatureFlagState = (key: string) => {
  const service = useFeatureFlagService();
  const [state, setState] = useState(() => service.getFlagState(key));

  useEffect(() => {
    const unsubscribe = service.subscribe(key, (newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [service, key]);

  return state;
};

/**
 * Хук для получения всех включенных флагов
 */
export const useEnabledFeatureFlags = (): string[] => {
  const service = useFeatureFlagService();
  const [enabledFlags, setEnabledFlags] = useState(() => service.getEnabledFlags());

  useEffect(() => {
    // Подписываемся на изменения всех флагов
    const unsubscribes: Array<() => void> = [];
    const allFlags = Array.from(service.getAllFlags().keys());

    allFlags.forEach((key) => {
      const unsubscribe = service.subscribe(key, () => {
        setEnabledFlags(service.getEnabledFlags());
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [service]);

  return enabledFlags;
};

/**
 * Компонент для условного рендеринга на основе feature flag
 */
export const FeatureFlag: React.FC<{
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ flag, children, fallback = null }) => {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback}</>;
};

/**
 * Компонент для рендеринга разных компонентов в зависимости от feature flag
 */
export const FeatureFlagSwitch: React.FC<{
  flag: string;
  enabled: React.ReactNode;
  disabled: React.ReactNode;
}> = ({ flag, enabled, disabled }) => {
  const isEnabled = useFeatureFlag(flag);
  return <>{isEnabled ? enabled : disabled}</>;
};
