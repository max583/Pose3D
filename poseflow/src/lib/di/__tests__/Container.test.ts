// src/lib/di/__tests__/Container.test.ts
// Тесты DI контейнера

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container, defaultContainer } from '../Container';
import { ServiceKeys } from '../types';
import { setupContainer } from '../setup';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('registration and retrieval', () => {
    it('should register and retrieve singleton service', () => {
      let creationCount = 0;
      container.register('TestService', () => {
        creationCount++;
        return { id: 'test' };
      }, { singleton: true });

      const instance1 = container.get<{ id: string }>('TestService');
      expect(instance1.id).toBe('test');
      expect(creationCount).toBe(1);

      const instance2 = container.get<{ id: string }>('TestService');
      expect(instance2.id).toBe('test');
      expect(creationCount).toBe(1); // Тот же экземпляр
      expect(instance1).toBe(instance2);
    });

    it('should register and retrieve transient service', () => {
      let creationCount = 0;
      container.register('TransientService', () => {
        creationCount++;
        return { id: creationCount };
      }, { singleton: false });

      const instance1 = container.get<{ id: number }>('TransientService');
      expect(instance1.id).toBe(1);
      expect(creationCount).toBe(1);

      const instance2 = container.get<{ id: number }>('TransientService');
      expect(instance2.id).toBe(2);
      expect(creationCount).toBe(2);
      expect(instance1).not.toBe(instance2);
    });

    it('should throw error when service not found', () => {
      expect(() => container.get('NonExistentService')).toThrow('Service not registered');
    });

    it('should check if service exists', () => {
      container.register('ExistingService', () => 'test');
      expect(container.has('ExistingService')).toBe(true);
      expect(container.has('NonExistentService')).toBe(false);
    });
  });

  describe('parent-child hierarchy', () => {
    it('should retrieve service from parent container', () => {
      const parent = new Container();
      parent.register('SharedService', () => 'parent-value');

      const child = parent.createChild();
      // Не регистрируем в child
      const value = child.get<string>('SharedService');
      expect(value).toBe('parent-value');
    });

    it('should prefer child service over parent', () => {
      const parent = new Container();
      parent.register('Service', () => 'parent');

      const child = parent.createChild();
      child.register('Service', () => 'child');

      expect(child.get<string>('Service')).toBe('child');
      expect(parent.get<string>('Service')).toBe('parent');
    });
  });

  describe('clearInstances', () => {
    it('should clear singleton instances', () => {
      let disposed = false;
      container.register('DisposableService', () => ({
        dispose: () => { disposed = true; }
      }), { singleton: true });

      const service = container.get<any>('DisposableService');
      container.clearInstances();
      expect(disposed).toBe(true);
      // При следующем запросе создается новый экземпляр
      const service2 = container.get<any>('DisposableService');
      expect(service2).not.toBe(service);
    });
  });

  describe('unregister', () => {
    it('should unregister service and dispose instance', () => {
      let disposed = false;
      container.register('Service', () => ({
        dispose: () => { disposed = true; }
      }), { singleton: true });

      const service = container.get<any>('Service');
      const result = container.unregister('Service');
      expect(result).toBe(true);
      expect(disposed).toBe(true);
      expect(container.has('Service')).toBe(false);
      expect(() => container.get('Service')).toThrow();
    });
  });
});

describe('defaultContainer', () => {
  beforeEach(() => {
    // Очищаем контейнер перед каждым тестом
    defaultContainer.clearInstances();
    // Удаляем все зарегистрированные сервисы
    defaultContainer.unregister(ServiceKeys.PoseService);
    defaultContainer.unregister(ServiceKeys.CameraService);
    defaultContainer.unregister(ServiceKeys.ExportService);
    defaultContainer.unregister(ServiceKeys.FeatureFlagService);
  });

  it('should be an instance of Container', () => {
    expect(defaultContainer).toBeInstanceOf(Container);
  });

  it('should have registered services after setup', () => {
    // Явно вызываем setup перед проверкой
    setupContainer(defaultContainer);
    
    // Проверяем что ключи зарегистрированы
    expect(defaultContainer.has(ServiceKeys.PoseService)).toBe(true);
    expect(defaultContainer.has(ServiceKeys.CameraService)).toBe(true);
    expect(defaultContainer.has(ServiceKeys.ExportService)).toBe(true);
    expect(defaultContainer.has(ServiceKeys.FeatureFlagService)).toBe(true);
  });
});