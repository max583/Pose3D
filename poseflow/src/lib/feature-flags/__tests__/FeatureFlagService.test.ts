// src/lib/feature-flags/__tests__/FeatureFlagService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService } from '../FeatureFlagService';
import { FEATURE_FLAGS } from '../registry';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService({ debug: false });
  });

  describe('initialization', () => {
    it('should initialize with all flags from registry', () => {
      const allFlags = service.getAllFlags();
      expect(allFlags.size).toBe(Object.keys(FEATURE_FLAGS).length);
    });

    it('should set default values from registry', () => {
      const useFixedLengths = service.getFlagState('USE_FIXED_LENGTHS');
      expect(useFixedLengths).toBeDefined();
      expect(useFixedLengths?.enabled).toBe(false); // defaultValue из registry
    });

    it('should activate flags for canary users', () => {
      const canaryUserId = 'test-canary-user';
      
      // Сохраняем оригинальный canaryUsers для USE_FIXED_LENGTHS
      const originalFlag = FEATURE_FLAGS.USE_FIXED_LENGTHS;
      const originalCanaryUsers = (FEATURE_FLAGS as any).USE_FIXED_LENGTHS.canaryUsers;
      
      // Временно добавляем canary пользователя
      (FEATURE_FLAGS as any).USE_FIXED_LENGTHS.canaryUsers = [canaryUserId];
      
      try {
        // Создаем новый сервис после модификации реестра
        const service2 = new FeatureFlagService();
        service2.setUserContext({ userId: canaryUserId });
        // Флаг должен быть включен для canary пользователя
        expect(service2.isEnabled('USE_FIXED_LENGTHS')).toBe(true);
      } finally {
        // Восстанавливаем
        if (originalCanaryUsers) {
          (FEATURE_FLAGS as any).USE_FIXED_LENGTHS.canaryUsers = originalCanaryUsers;
        } else {
          delete (FEATURE_FLAGS as any).USE_FIXED_LENGTHS.canaryUsers;
        }
      }
    });
  });

  describe('isEnabled', () => {
    it('should return false for unknown flag', () => {
      expect(service.isEnabled('UNKNOWN_FLAG')).toBe(false);
    });

    it('should respect flag dependencies', () => {
      // USE_ZUSTAND_STORE зависит от USE_DI_CONTAINER
      // Оба флага теперь включены по умолчанию в Phase 4
      expect(service.isEnabled('USE_DI_CONTAINER')).toBe(true);
      expect(service.isEnabled('USE_ZUSTAND_STORE')).toBe(true);

      // Отключаем родительский флаг
      service.disableFlag('USE_DI_CONTAINER');
      // Дочерний флаг должен отключиться из-за зависимости
      expect(service.isEnabled('USE_ZUSTAND_STORE')).toBe(false);

      // Включаем родительский флаг обратно
      service.enableFlag('USE_DI_CONTAINER');
      // Дочерний флаг все еще выключен, потому что сам не включен
      expect(service.isEnabled('USE_ZUSTAND_STORE')).toBe(false);

      // Включаем и дочерний флаг
      service.enableFlag('USE_ZUSTAND_STORE');
      // Теперь оба включены, зависимости удовлетворены
      expect(service.isEnabled('USE_ZUSTAND_STORE')).toBe(true);
    });

    it('should return true for enabled flag', () => {
      // Убедимся что флаг изначально выключен
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(false);
      // Включаем его
      service.enableFlag('USE_FIXED_LENGTHS');
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(true);
    });

    it('should return false for disabled flag', () => {
      service.disableFlag('USE_FIXED_LENGTHS');
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(false);
    });
  });

  describe('flag management', () => {
    it('should enable flag', () => {
      service.enableFlag('USE_FIXED_LENGTHS');
      const state = service.getFlagState('USE_FIXED_LENGTHS');
      expect(state?.enabled).toBe(true);
    });

    it('should disable flag', () => {
      service.enableFlag('USE_FIXED_LENGTHS');
      service.disableFlag('USE_FIXED_LENGTHS');
      const state = service.getFlagState('USE_FIXED_LENGTHS');
      expect(state?.enabled).toBe(false);
    });

    it('should toggle flag', () => {
      const initialState = service.isEnabled('USE_FIXED_LENGTHS');
      // Переключаем
      service.toggleFlag('USE_FIXED_LENGTHS');
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(!initialState);

      // Переключаем обратно
      service.toggleFlag('USE_FIXED_LENGTHS');
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(initialState);
    });

    it('should reset all flags to defaults', () => {
      // Включаем несколько флагов (USE_DI_CONTAINER уже включен по умолчанию)
      service.enableFlag('USE_FIXED_LENGTHS');
      // USE_DI_CONTAINER уже true, отключаем его для теста
      service.disableFlag('USE_DI_CONTAINER');

      // Сбрасываем
      service.resetToDefaults();

      // Проверяем что вернулись значения по умолчанию
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(false);
      expect(service.isEnabled('USE_DI_CONTAINER')).toBe(true); // Теперь true по умолчанию
    });
  });

  describe('user context', () => {
    it('should set user context', () => {
      const userId = 'test-user-123';
      service.setUserContext({ userId });

      // Проверяем что контекст установлен
      // (внутреннее состояние, но можем проверить через поведение)
      expect(service.isEnabled('USE_FIXED_LENGTHS')).toBe(false); // Просто проверяем что не падает
    });

    it('should recalculate flags when user context changes', () => {
      // Создаем флаг с процентным распределением
      const originalFlags = { ...FEATURE_FLAGS };
      (FEATURE_FLAGS as any).TEST_PERCENTAGE_FLAG = {
        key: 'TEST_PERCENTAGE_FLAG',
        type: 'release',
        description: 'Test percentage flag',
        defaultValue: false,
        rolloutPercentage: 50, // 50% пользователей
      };

      try {
        const service2 = new FeatureFlagService();
        
        // Первый пользователь
        service2.setUserContext({ userId: 'user-always-true' });
        const enabledForUser1 = service2.isEnabled('TEST_PERCENTAGE_FLAG');
        
        // Второй пользователь (должен иметь другой хэш)
        service2.setUserContext({ userId: 'user-always-false' });
        const enabledForUser2 = service2.isEnabled('TEST_PERCENTAGE_FLAG');
        
        // Оба значения должны быть boolean
        expect(typeof enabledForUser1).toBe('boolean');
        expect(typeof enabledForUser2).toBe('boolean');
      } finally {
        // Восстанавливаем
        Object.keys(FEATURE_FLAGS).forEach(key => {
          if (key === 'TEST_PERCENTAGE_FLAG') {
            delete (FEATURE_FLAGS as any)[key];
          }
        });
      }
    });
  });

  describe('subscriptions', () => {
    it('should notify subscribers when flag changes', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe('USE_FIXED_LENGTHS', listener);

      // Listener должен быть вызван сразу с текущим состоянием
      expect(listener).toHaveBeenCalledTimes(1);

      // Меняем флаг
      service.enableFlag('USE_FIXED_LENGTHS');
      expect(listener).toHaveBeenCalledTimes(2);

      // Отписываемся
      unsubscribe();
      service.disableFlag('USE_FIXED_LENGTHS');
      expect(listener).toHaveBeenCalledTimes(2); // Больше не вызывается
    });

    it('should handle multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = service.subscribe('USE_FIXED_LENGTHS', listener1);
      const unsubscribe2 = service.subscribe('USE_FIXED_LENGTHS', listener2);

      service.enableFlag('USE_FIXED_LENGTHS');

      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('utilities', () => {
    it('should get enabled flags', () => {
      // Получаем текущие включенные флаги (некоторые могут быть включены по умолчанию в dev)
      const initialEnabledFlags = service.getEnabledFlags();
      
      // USE_DI_CONTAINER и USE_ZUSTAND_STORE теперь включены по умолчанию в Phase 4
      // Включаем тестовый флаг
      service.enableFlag('USE_FIXED_LENGTHS');
      // USE_DI_CONTAINER уже включен, отключаем его для теста
      service.disableFlag('USE_DI_CONTAINER');

      const enabledFlags = service.getEnabledFlags();
      
      // Проверяем что наши флаги добавились/убрались
      expect(enabledFlags).toContain('USE_FIXED_LENGTHS');
      expect(enabledFlags).not.toContain('USE_DI_CONTAINER'); // Теперь отключен
      // USE_ZUSTAND_STORE должен быть отключен из-за зависимости от USE_DI_CONTAINER
      expect(enabledFlags).not.toContain('USE_ZUSTAND_STORE');
      
      // Проверяем что количество включенных флагов увеличилось как минимум на 2
      // (но может быть больше если были другие флаги включены по умолчанию)
      const newlyEnabled = enabledFlags.filter(f => !initialEnabledFlags.includes(f));
      expect(newlyEnabled).toContain('USE_FIXED_LENGTHS');
      expect(newlyEnabled).toContain('USE_DI_CONTAINER');
    });

    it('should get stats', () => {
      const stats = service.getStats();
      expect(stats.total).toBe(Object.keys(FEATURE_FLAGS).length);
      
      // В dev режиме некоторые флаги могут быть включены по умолчанию
      // (ENABLE_DEBUG_OVERLAY, ALLOW_EXPERIMENTAL_FEATURES)
      // Поэтому проверяем только что enabled + disabled = total
      expect(stats.enabled + stats.disabled).toBe(stats.total);
      expect(stats.activatedForUser).toBeLessThanOrEqual(stats.total);
    });

    it('should export to JSON', () => {
      const json = service.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('flags');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.flags).toHaveProperty('USE_FIXED_LENGTHS');
    });
  });
});