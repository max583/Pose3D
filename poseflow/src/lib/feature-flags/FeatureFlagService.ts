// src/lib/feature-flags/FeatureFlagService.ts

import {
  FeatureFlagDefinition,
  FeatureFlagState,
  UserContext,
  FeatureFlagsConfig,
} from './types';
import { FEATURE_FLAGS } from './registry';

/**
 * Сервис управления feature flags
 */
export class FeatureFlagService {
  private flags: Map<string, FeatureFlagState> = new Map();
  private userContext: UserContext | null = null;
  private config: FeatureFlagsConfig;
  private listeners: Map<string, Array<(state: FeatureFlagState) => void>> = new Map();
  private readonly STORAGE_KEY = 'poseflow_feature_flags';

  constructor(config: Partial<FeatureFlagsConfig> = {}) {
    this.config = {
      debug: false,
      ...config,
    };

    this.initializeFlags();
  }

  /**
   * Загрузить сохраненные флаги из localStorage
   */
  private loadSavedFlags(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        if (this.config.debug) {
          console.log('[FeatureFlagService] No saved flags found in localStorage');
        }
        return;
      }

      const parsed = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null) {
        if (this.config.debug) {
          console.warn('[FeatureFlagService] Invalid saved flags format');
        }
        return;
      }

      // Загружаем только те флаги, которые существуют в реестре
      Object.values(FEATURE_FLAGS).forEach((def) => {
        if (parsed[def.key]) {
          const savedState = parsed[def.key];
          // Сохраняем enabled из сохраненного состояния, но пересчитываем activatedForUser
          this.flags.set(def.key, {
            enabled: savedState.enabled,
            lastUpdated: savedState.lastUpdated || new Date().toISOString(),
            activatedForUser: this.shouldActivateForUser(def),
          });
        }
      });

      if (this.config.debug) {
        console.log('[FeatureFlagService] Loaded saved flags from localStorage');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[FeatureFlagService] Error loading saved flags:', error);
      }
    }
  }

  /**
   * Сохранить флаги в localStorage
   */
  private saveFlags(): void {
    try {
      const saveData: Record<string, FeatureFlagState> = {};
      for (const [key, state] of this.flags.entries()) {
        saveData[key] = state;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));

      if (this.config.debug) {
        console.log('[FeatureFlagService] Saved flags to localStorage');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[FeatureFlagService] Error saving flags:', error);
      }
    }
  }

  /**
   * Инициализировать все флаги
   */
  private initializeFlags(): void {
    // Сначала инициализируем значениями по умолчанию
    Object.values(FEATURE_FLAGS).forEach((def) => {
      this.flags.set(def.key, {
        enabled: def.defaultValue,
        lastUpdated: new Date().toISOString(),
        activatedForUser: this.shouldActivateForUser(def),
      });
    });

    // Затем загружаем сохраненные значения (перезаписывая enabled)
    this.loadSavedFlags();

    if (this.config.debug) {
      console.log('[FeatureFlagService] Initialized flags:', this.flags.size);
    }
  }

  /**
   * Определить, должен ли флаг быть активирован для текущего пользователя
   */
  private shouldActivateForUser(def: FeatureFlagDefinition): boolean {
    // Проверка canary пользователей
    if (def.canaryUsers && this.userContext) {
      if (def.canaryUsers.includes(this.userContext.userId)) {
        return true;
      }
    }

    // Проверка процентного распределения
    if (def.rolloutPercentage && def.rolloutPercentage > 0) {
      const hash = this.hashUserId(this.userContext?.userId || 'anonymous');
      return hash % 100 < def.rolloutPercentage;
    }

    return def.defaultValue;
  }

  /**
   * Простая хэш-функция для детерминированного распределения
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Проверить, включен ли флаг
   */
  isEnabled(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      if (this.config.debug) {
        console.warn(`[FeatureFlagService] Flag not found: ${key}`);
      }
      return false;
    }

    // Проверка зависимостей
    const def = FEATURE_FLAGS[key];
    if (def?.dependsOn) {
      const allDependenciesEnabled = def.dependsOn.every((depKey) =>
        this.isEnabled(depKey)
      );
      if (!allDependenciesEnabled) {
        return false;
      }
    }

    // Если флаг принудительно включен (enabled = true), он считается включенным
    // независимо от activatedForUser (которое отражает автоматическую активацию по правилам rollout)
    if (flag.enabled) {
      return true;
    }
    
    // Если флаг не принудительно включен, проверяем активацию по правилам rollout
    return flag.activatedForUser;
  }

  /**
   * Установить контекст пользователя
   */
  setUserContext(context: UserContext): void {
    this.userContext = context;
    this.recalculateUserFlags();

    if (this.config.debug) {
      console.log('[FeatureFlagService] User context set:', context.userId);
    }
  }

  /**
   * Пересчитать флаги для текущего пользователя
   */
  private recalculateUserFlags(): void {
    Object.values(FEATURE_FLAGS).forEach((def) => {
      const flag = this.flags.get(def.key);
      if (flag) {
        const newActivated = this.shouldActivateForUser(def);
        if (flag.activatedForUser !== newActivated) {
          flag.activatedForUser = newActivated;
          flag.lastUpdated = new Date().toISOString();
          this.notifyListeners(def.key, flag);
        }
      }
    });
  }

  /**
   * Получить состояние флага
   */
  getFlagState(key: string): FeatureFlagState | undefined {
    return this.flags.get(key);
  }

  /**
   * Получить все флаги
   */
  getAllFlags(): Map<string, FeatureFlagState> {
    return new Map(this.flags);
  }

  /**
   * Получить включенные флаги
   */
  getEnabledFlags(): string[] {
    const enabled: string[] = [];
    for (const [key, flag] of this.flags.entries()) {
      // Используем ту же логику, что и в isEnabled
      if (flag.enabled) {
        // Принудительно включенный флаг считается включенным
        enabled.push(key);
      } else if (flag.activatedForUser) {
        // Автоматически активированный флаг также считается включенным
        enabled.push(key);
      }
    }
    return enabled;
  }

  // ─── Методы для административного управления (только в dev) ────────────────

  /**
   * Включить флаг
   */
  enableFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = true;
      flag.lastUpdated = new Date().toISOString();
      this.notifyListeners(key, flag);
      this.saveFlags();

      if (this.config.debug) {
        console.log(`[FeatureFlagService] Flag enabled: ${key}`);
      }
    } else if (this.config.debug) {
      console.warn(`[FeatureFlagService] Cannot enable unknown flag: ${key}`);
    }
  }

  /**
   * Выключить флаг
   */
  disableFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = false;
      flag.lastUpdated = new Date().toISOString();
      this.notifyListeners(key, flag);
      this.saveFlags();

      if (this.config.debug) {
        console.log(`[FeatureFlagService] Flag disabled: ${key}`);
      }
    } else if (this.config.debug) {
      console.warn(`[FeatureFlagService] Cannot disable unknown flag: ${key}`);
    }
  }

  /**
   * Переключить флаг
   */
  toggleFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = !flag.enabled;
      flag.lastUpdated = new Date().toISOString();
      this.notifyListeners(key, flag);
      this.saveFlags();

      if (this.config.debug) {
        console.log(`[FeatureFlagService] Flag toggled: ${key} = ${flag.enabled}`);
      }
    }
  }

  /**
   * Сбросить все флаги к значениям по умолчанию
   */
  resetToDefaults(): void {
    Object.values(FEATURE_FLAGS).forEach((def) => {
      const flag = this.flags.get(def.key);
      if (flag) {
        const wasEnabled = flag.enabled;
        flag.enabled = def.defaultValue;
        flag.activatedForUser = this.shouldActivateForUser(def);
        flag.lastUpdated = new Date().toISOString();

        if (wasEnabled !== flag.enabled) {
          this.notifyListeners(def.key, flag);
        }
      }
    });

    this.saveFlags();

    if (this.config.debug) {
      console.log('[FeatureFlagService] All flags reset to defaults');
    }
  }

  // ─── Подписки на изменения ────────────────────────────────────────────────

  /**
   * Подписаться на изменения флага
   */
  subscribe(
    key: string,
    listener: (state: FeatureFlagState) => void
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    const listeners = this.listeners.get(key)!;
    listeners.push(listener);

    // Вызвать listener с текущим состоянием
    const currentState = this.getFlagState(key);
    if (currentState) {
      listener(currentState);
    }

    // Функция отписки
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Уведомить слушателей об изменении флага
   */
  private notifyListeners(key: string, state: FeatureFlagState): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error(`[FeatureFlagService] Error in listener for ${key}:`, error);
        }
      });
    }
  }

  // ─── Утилиты ──────────────────────────────────────────────────────────────

  /**
   * Получить статистику по флагам
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    activatedForUser: number;
  } {
    let enabled = 0;
    let disabled = 0;
    let activatedForUser = 0;

    for (const flag of this.flags.values()) {
      if (flag.enabled) {
        enabled++;
      } else {
        disabled++;
      }

      if (flag.activatedForUser) {
        activatedForUser++;
      }
    }

    return {
      total: this.flags.size,
      enabled,
      disabled,
      activatedForUser,
    };
  }

  /**
   * Экспортировать состояние флагов в JSON
   */
  exportToJSON(): string {
    const exportData: Record<string, FeatureFlagState> = {};
    for (const [key, state] of this.flags.entries()) {
      exportData[key] = state;
    }

    return JSON.stringify(
      {
        flags: exportData,
        userContext: this.userContext,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }
}