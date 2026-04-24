// src/lib/di/Container.ts
// Простой DI контейнер с поддержкой синглтонов и иерархии

type ServiceKey = string | symbol;
type ServiceFactory<T = any> = (container: Container) => T;
type ServiceInstance<T = any> = {
  factory: ServiceFactory<T>;
  instance?: T;
  singleton: boolean;
};

export class Container {
  private registry = new Map<ServiceKey, ServiceInstance>();
  private parent: Container | null = null;

  constructor(parent?: Container) {
    this.parent = parent || null;
  }

  /**
   * Регистрация сервиса
   * @param key Ключ сервиса (символ или строка)
   * @param factory Фабрика, создающая экземпляр сервиса
   * @param options Опции регистрации (singleton по умолчанию true)
   */
  register<T>(
    key: ServiceKey,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): this {
    this.registry.set(key, {
      factory,
      singleton: options.singleton ?? true,
    });
    return this;
  }

  /**
   * Получение сервиса по ключу
   * @throws Error если сервис не найден
   */
  get<T>(key: ServiceKey): T {
    // Проверка локального регистра
    const local = this.registry.get(key);
    if (local) {
      if (local.singleton) {
        if (!local.instance) {
          local.instance = local.factory(this);
        }
        return local.instance as T;
      }
      // Не синглтон - создаем новый экземпляр каждый раз
      return local.factory(this);
    }

    // Если не найдено локально, проверяем родительский контейнер
    if (this.parent) {
      return this.parent.get<T>(key);
    }

    throw new Error(`Service not registered: ${key.toString()}`);
  }

  /**
   * Проверка наличия сервиса
   */
  has(key: ServiceKey): boolean {
    if (this.registry.has(key)) return true;
    if (this.parent) return this.parent.has(key);
    return false;
  }

  /**
   * Создание дочернего контейнера
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * Очистка всех экземпляров (для тестов)
   */
  clearInstances(): void {
    for (const entry of this.registry.values()) {
      if (entry.instance && typeof entry.instance.dispose === 'function') {
        entry.instance.dispose();
      }
      entry.instance = undefined;
    }
  }

  /**
   * Удаление регистрации сервиса
   */
  unregister(key: ServiceKey): boolean {
    const entry = this.registry.get(key);
    if (entry) {
      if (entry.instance && typeof entry.instance.dispose === 'function') {
        entry.instance.dispose();
      }
    }
    return this.registry.delete(key);
  }
}

/**
 * Глобальный экземпляр контейнера по умолчанию
 */
export const defaultContainer = new Container();