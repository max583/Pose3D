// src/lib/feature-flags/registry.ts

import { FeatureFlagDefinition } from './types';

/**
 * Реестр всех feature flags в PoseFlow
 */
export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  // ===========================================================================
  // Архитектурные улучшения
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
  // DesignDoll рефакторинг
  // ===========================================================================
  
  USE_FIXED_LENGTHS: {
    key: 'USE_FIXED_LENGTHS',
    type: 'release',
    description: 'Использовать фиксированные длины костей',
    defaultValue: true,
    rolloutPercentage: 0,
  },
  
  USE_RIGID_SKULL: {
    key: 'USE_RIGID_SKULL',
    type: 'release',
    description: 'Жесткий череп (недеформируемая группа)',
    defaultValue: true,
    dependsOn: ['USE_FIXED_LENGTHS'],
  },
  
  USE_DESIGNDOLL_CONTROLLERS: {
    key: 'USE_DESIGNDOLL_CONTROLLERS',
    type: 'release',
    description: 'Использовать 7 контроллеров в стиле DesignDoll',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  
  USE_SPINE_CHAIN: {
    key: 'USE_SPINE_CHAIN',
    type: 'release',
    description: 'Использовать цепь позвоночника с виртуальными сегментами',
    defaultValue: false,
    dependsOn: ['USE_FIXED_LENGTHS'],
  },
  
  // ===========================================================================
  // Экспериментальные функции
  // ===========================================================================
  
  USE_MINI_VIEW: {
    key: 'USE_MINI_VIEW',
    type: 'experiment',
    description: 'Показывать мини-вид (Step 8)',
    defaultValue: false,
    rolloutPercentage: 30, // Увеличено для Phase 3
  },
  
  USE_MULTIPLE_SKELETONS: {
    key: 'USE_MULTIPLE_SKELETONS',
    type: 'experiment',
    description: 'Поддержка нескольких скелетов (Step 9)',
    defaultValue: false,
    rolloutPercentage: 20,
    dependsOn: ['ALLOW_EXPERIMENTAL_FEATURES'],
  },
  
  USE_CENTER_OF_GRAVITY: {
    key: 'USE_CENTER_OF_GRAVITY',
    type: 'experiment',
    description: 'Визуализация центра тяжести (Step 10)',
    defaultValue: false,
    rolloutPercentage: 20,
    dependsOn: ['ALLOW_EXPERIMENTAL_FEATURES'],
  },
  
  USE_RING_GIZMOS: {
    key: 'USE_RING_GIZMOS',
    type: 'experiment',
    description: 'Кольцевые гизмо для вращения суставов (Step 11)',
    defaultValue: false,
    rolloutPercentage: 20,
    dependsOn: ['ALLOW_EXPERIMENTAL_FEATURES'],
  },
  
  USE_DIRECTION_B_MODE: {
    key: 'USE_DIRECTION_B_MODE',
    type: 'experiment',
    description: 'Режим "Направление B" с кольцевыми гизмо',
    defaultValue: false,
    rolloutPercentage: 20, // Увеличено для Phase 3
    dependsOn: ['ALLOW_EXPERIMENTAL_FEATURES'],
  },
  
  // ===========================================================================
  // Операционные флаги
  // ===========================================================================
  
  // ===========================================================================
  // Оптимизации производительности (Phase 3A)
  // ===========================================================================
  
  USE_REACT_MEMO_OPTIMIZATIONS: {
    key: 'USE_REACT_MEMO_OPTIMIZATIONS',
    type: 'operational',
    description: 'Включить оптимизации React.memo для компонентов',
    defaultValue: true, // Включено по умолчанию в Phase 3
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
    defaultValue: import.meta.env.DEV, // Включено только в dev режиме
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