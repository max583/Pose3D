// src/lib/services/interfaces/IFeatureFlagService.ts
// Интерфейс сервиса управления feature flags

import { FeatureFlagState, UserContext } from '../../feature-flags/types';

export interface IFeatureFlagService {
  // ─── Проверка состояния флагов ────────────────────────────────────────────
  
  /** Проверить, включен ли флаг */
  isEnabled(key: string): boolean;
  
  /** Получить состояние флага */
  getFlagState(key: string): FeatureFlagState | undefined;
  
  /** Получить все флаги */
  getAllFlags(): Map<string, FeatureFlagState>;
  
  /** Получить список включенных флагов */
  getEnabledFlags(): string[];
  
  // ─── Управление пользовательским контекстом ───────────────────────────────
  
  /** Установить контекст пользователя */
  setUserContext(context: UserContext): void;
  
  /** Получить текущий контекст пользователя */
  getUserContext(): UserContext | null;
  
  // ─── Административное управление (только в dev) ───────────────────────────
  
  /** Включить флаг */
  enableFlag(key: string): void;
  
  /** Выключить флаг */
  disableFlag(key: string): void;
  
  /** Переключить флаг */
  toggleFlag(key: string): void;
  
  /** Сбросить все флаги к значениям по умолчанию */
  resetToDefaults(): void;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения флага */
  subscribe(
    key: string,
    listener: (state: FeatureFlagState) => void
  ): () => void;
  
  /** Подписаться на изменения всех флагов */
  subscribeToAll(listener: (key: string, state: FeatureFlagState) => void): () => void;
  
  // ─── Утилиты и статистика ────────────────────────────────────────────────
  
  /** Получить статистику по флагам */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    activatedForUser: number;
  };
  
  /** Экспортировать состояние флагов в JSON */
  exportToJSON(): string;
  
  /** Импортировать состояние флагов из JSON */
  importFromJSON(json: string): void;
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  
  /** Очистить ресурсы (опционально) */
  dispose?(): void;
}
