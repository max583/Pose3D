// src/lib/feature-flags/index.ts

// Экспорт типов
export type {
  FlagType,
  FeatureFlagDefinition,
  FeatureFlagState,
  UserContext,
  FeatureFlagsConfig,
} from './types';

// Экспорт реестра
export {
  FEATURE_FLAGS,
  getFlagDefinition,
  getAllFlagDefinitions,
  getFlagsByType,
  flagExists,
} from './registry';

// Экспорт сервиса
export { FeatureFlagService } from './FeatureFlagService';

// Экспорт утилит
export * as FeatureFlagUtils from './utils';