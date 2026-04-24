// src/lib/feature-flags/types.ts

/**
 * Типы feature flags для PoseFlow
 */

export type FlagType = 'release' | 'operational' | 'permission' | 'experiment';

export interface FeatureFlagDefinition {
  /** Уникальный ключ флага */
  key: string;
  
  /** Тип флага */
  type: FlagType;
  
  /** Описание флага */
  description: string;
  
  /** Значение по умолчанию */
  defaultValue: boolean;
  
  /** Процент пользователей, для которых включен флаг (0-100) */
  rolloutPercentage?: number;
  
  /** Список пользователей для раннего доступа (canary) */
  canaryUsers?: string[];
  
  /** Зависимости от других флагов */
  dependsOn?: string[];
  
  /** Дополнительные метаданные */
  metadata?: Record<string, any>;
}

export interface FeatureFlagState {
  /** Включен ли флаг */
  enabled: boolean;
  
  /** Время последнего обновления */
  lastUpdated: string;
  
  /** Активирован ли флаг для текущего пользователя */
  activatedForUser: boolean;
}

export interface UserContext {
  /** Идентификатор пользователя */
  userId: string;
  
  /** Роль пользователя */
  role?: string;
  
  /** Дополнительные атрибуты */
  attributes?: Record<string, any>;
}

/**
 * Конфигурация feature flags
 */
export interface FeatureFlagsConfig {
  /** Режим отладки */
  debug: boolean;
  
  /** URL для удаленной конфигурации (опционально) */
  remoteConfigUrl?: string;
  
  /** Интервал обновления конфигурации в миллисекундах */
  refreshInterval?: number;
}