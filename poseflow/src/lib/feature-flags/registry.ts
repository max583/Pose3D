// src/lib/feature-flags/registry.ts

import { FeatureFlagDefinition } from './types';

/**
 * Реестр feature flags PoseFlow.
 * Флаги предыдущей попытки DesignDoll-рефакторинга
 * (USE_FIXED_LENGTHS, USE_RIGID_SKULL, USE_DESIGNDOLL_CONTROLLERS,
 * USE_SPINE_CHAIN, USE_RING_GIZMOS, USE_DIRECTION_B_MODE)
 * удалены — реализация ведётся на новой rotation-tree архитектуре.
 */
export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  // ===========================================================================
  // Архитектурные
  // ===========================================================================

  USE_DI_CONTAINER: {
    key: 'USE_DI_CONTAINER',
    type: 'release',
    description: 'Включить Dependency Injection контейнер',
    defaultValue: true,
    rolloutPercentage: 100,
  },

  USE_ZUSTAND_STORE: {
    key: 'USE_ZUSTAND_STORE',
    type: 'release',
    description: 'Включить Zustand для state management',
    defaultValue: true,
    rolloutPercentage: 100,
    dependsOn: ['USE_DI_CONTAINER'],
  },

  // ===========================================================================
  // Экспериментальные функции (текущие, не относятся к старой попытке)
  // ===========================================================================

  USE_MINI_VIEW: {
    key: 'USE_MINI_VIEW',
    type: 'experiment',
    description: 'Показывать мини-вид (Step 8)',
    defaultValue: false,
    rolloutPercentage: 30,
  },

  USE_MULTIPLE_SKELETONS: {
    key: 'USE_MULTIPLE_SKELETONS',
    type: 'experiment',
    description: 'Поддержка нескольких скелетов (Step 9)',
    defaultValue: false,
    rolloutPercentage: 20,
    dependsOn: ['ALLOW_EXPERIMENTAL_FEATURES'],
  },

  // ===========================================================================
  // Операционные флаги
  // ===========================================================================

  USE_REACT_MEMO_OPTIMIZATIONS: {
    key: 'USE_REACT_MEMO_OPTIMIZATIONS',
    type: 'operational',
    description: 'Включить оптимизации React.memo для компонентов',
    defaultValue: true,
  },

  ENABLE_PERFORMANCE_LOGGING: {
    key: 'ENABLE_PERFORMANCE_LOGGING',
    type: 'operational',
    description: 'Включить детальное логирование производительности',
    defaultValue: false,
  },

  USE_PERFORMANCE_OPTIMIZATIONS: {
    key: 'USE_PERFORMANCE_OPTIMIZATIONS',
    type: 'operational',
    description: 'Включить оптимизации производительности (React.memo, кэширование, профилирование)',
    defaultValue: true,
  },

  ENABLE_DEBUG_OVERLAY: {
    key: 'ENABLE_DEBUG_OVERLAY',
    type: 'operational',
    description: 'Показывать overlay с отладочной информацией',
    defaultValue: import.meta.env.DEV,
  },

  // ===========================================================================
  // Флаги разрешений
  // ===========================================================================

  ALLOW_EXPERIMENTAL_FEATURES: {
    key: 'ALLOW_EXPERIMENTAL_FEATURES',
    type: 'permission',
    description: 'Разрешить доступ к экспериментальным функциям',
    defaultValue: import.meta.env.DEV,
  },
};

/**
 * Получить определение флага по ключу
 */
export function getFlagDefinition(key: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAGS[key];
}

/**
 * Получить все определения флагов
 */
export function getAllFlagDefinitions(): FeatureFlagDefinition[] {
  return Object.values(FEATURE_FLAGS);
}

/**
 * Получить флаги по типу
 */
export function getFlagsByType(type: string): FeatureFlagDefinition[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.type === type);
}

/**
 * Проверить, существует ли флаг
 */
export function flagExists(key: string): boolean {
  return key in FEATURE_FLAGS;
}
