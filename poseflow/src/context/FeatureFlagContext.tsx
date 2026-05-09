// src/context/FeatureFlagContext.tsx
//
// Утилитарные хуки и компоненты для feature flags.
// Все хуки обращаются к DI-синглтону FeatureFlagService напрямую.
// FeatureFlagProvider УДАЛЁН — больше не нужен, используется DI-контейнер.
//
// НЕ экспортирует useFeatureFlagService — единственная версия этого хука
// находится в ServiceContext.tsx (возвращает DI-синглтон).

import React, { useEffect, useState } from 'react';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';
import { getService } from '../lib/di/setup';
import { ServiceKeys } from '../lib/di/types';

function getDIService(): FeatureFlagService {
  return getService<FeatureFlagService>(ServiceKeys.FeatureFlagService);
}

/**
 * Хук для проверки включён ли флаг.
 * Реактивно обновляется при изменении флага.
 */
export const useFeatureFlag = (key: string): boolean => {
  const service = getDIService();
  const [isEnabled, setIsEnabled] = useState(() => service.isEnabled(key));

  useEffect(() => {
    const unsubscribe = service.subscribe(key, (state) => {
      setIsEnabled(state.enabled || state.activatedForUser);
    });
    return unsubscribe;
  }, [service, key]);

  return isEnabled;
};

/**
 * Хук для получения полного состояния флага.
 */
export const useFeatureFlagState = (key: string) => {
  const service = getDIService();
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
 * Хук для получения всех включённых флагов.
 */
export const useEnabledFeatureFlags = (): string[] => {
  const service = getDIService();
  const [enabledFlags, setEnabledFlags] = useState(() => service.getEnabledFlags());

  useEffect(() => {
    const allFlags = Array.from(service.getAllFlags().keys());
    const unsubscribes = allFlags.map((key) =>
      service.subscribe(key, () => {
        setEnabledFlags(service.getEnabledFlags());
      })
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [service]);

  return enabledFlags;
};

/**
 * Компонент для условного рендеринга на основе feature flag.
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
 * Компонент для рендеринга разных компонентов в зависимости от feature flag.
 */
export const FeatureFlagSwitch: React.FC<{
  flag: string;
  enabled: React.ReactNode;
  disabled: React.ReactNode;
}> = ({ flag, enabled, disabled }) => {
  const isEnabled = useFeatureFlag(flag);
  return <>{isEnabled ? enabled : disabled}</>;
};
