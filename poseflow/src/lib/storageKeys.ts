/**
 * Единый реестр ключей localStorage для PoseFlow.
 *
 * Правило: любой новый ключ добавляется сюда с кратким описанием.
 * После добавления — обновить таблицу в ai/docs/codebase-map.md §6.E.
 */
export const STORAGE_KEYS = {
  /** Состояние feature-флагов (lib/feature-flags/FeatureFlagService.ts) */
  FEATURE_FLAGS: 'poseflow_feature_flags',

  /** Логи в кольцевом буфере (lib/logger.ts) */
  LOGS: 'poseflow-logs',

  /** Настройки приложения (lib/appSettings.ts) */
  APP_SETTINGS: 'poseflow-app-settings-v1',

  /** Свёрнут ли Sidebar (App.tsx) */
  SIDEBAR_COLLAPSED: 'poseflow-sidebar-collapsed',

  /** Свёрнута ли панель Camera Controls (components/Canvas3D.tsx) */
  CAMERA_CONTROLS_COLLAPSED: 'poseflow-camera-controls-collapsed',
} as const;
