# [ARCHIVED] 2026-04-28

Исторический дизайн DI container. DI уже интегрирован; актуальное состояние см. в `PLAN.md`, `STATUS.md` и `poseflow/src/lib/di/`.

# Архитектура Dependency Injection контейнера для PoseFlow

## Обзор
Dependency Injection (DI) контейнер позволит управлять зависимостями между сервисами, улучшить тестируемость кода и обеспечить плавный переход от синглтонов к управляемым зависимостям.

## Цели
1. **Устранить синглтоны** - заменить глобальные экземпляры на инжектируемые зависимости
2. **Улучшить тестируемость** - возможность мокать зависимости в тестах
3. **Обеспечить обратную совместимость** - поддержка как старых синглтонов, так и новых инжектируемых сервисов
4. **Упростить рефакторинг** - централизованное управление зависимостями

## Текущее состояние
В проекте используются синглтоны:
- `poseService` - глобальный экземпляр PoseService
- `cameraService` - глобальный экземпляр CameraService
- `ExportService` - создается по необходимости

## Архитектура DI системы

### 1. Интерфейсы сервисов
```typescript
// src/lib/di/types.ts

// Базовый интерфейс для всех сервисов
export interface Service {
  dispose?(): void;
}

// Интерфейсы для конкретных сервисов
export interface IPoseService extends Service {
  getPoseData(): PoseData;
  translate(dx: number, dy: number, dz: number): void;
  setJointPosition(jointId: number, position: Vector3): void;
  mirrorPose(): void;
  reset(): void;
  undo(): void;
  redo(): void;
  get canUndo(): boolean;
  get canRedo(): boolean;
  addListener(listener: (data: PoseData) => void): void;
  removeListener(listener: (data: PoseData) => void): void;
}

export interface ICameraService extends Service {
  getCamera(): Camera | null;
  setCamera(camera: Camera): void;
  getPosition(): Vector3;
  setPosition(x: number, y: number, z: number): void;
  lookAt(target: Vector3): void;
}

export interface IExportService extends Service {
  exportToPNG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob>;
  exportToJSON(poseData: PoseData, options?: ExportOptions): Promise<string>;
}
```

### 2. DI контейнер
```typescript
// src/lib/di/Container.ts

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

  // Регистрация сервиса
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

  // Получение сервиса
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
      return local.factory(this) as T;
    }

    // Проверка родительского контейнера
    if (this.parent) {
      return this.parent.get<T>(key);
    }

    throw new Error(`Service not found: ${String(key)}`);
  }

  // Проверка наличия сервиса
  has(key: ServiceKey): boolean {
    if (this.registry.has(key)) return true;
    if (this.parent) return this.parent.has(key);
    return false;
  }

  // Создание дочернего контейнера
  createChild(): Container {
    return new Container(this);
  }

  // Очистка (для тестов)
  clear(): void {
    // Вызов dispose у всех синглтонов
    for (const [key, service] of this.registry.entries()) {
      if (service.instance && typeof service.instance.dispose === 'function') {
        (service.instance as any).dispose();
      }
    }
    this.registry.clear();
  }
}
```

### 3. Адаптеры для обратной совместимости
```typescript
// src/lib/di/adapters/LegacyPoseServiceAdapter.ts
import { poseService } from '../../services/PoseService';
import { IPoseService, PoseData, Vector3 } from '../types';

export class LegacyPoseServiceAdapter implements IPoseService {
  getPoseData(): PoseData {
    return poseService.getPoseData();
  }

  translate(dx: number, dy: number, dz: number): void {
    poseService.translate(dx, dy, dz);
  }

  setJointPosition(jointId: number, position: Vector3): void {
    poseService.setJointPosition(jointId, position);
  }

  mirrorPose(): void {
    poseService.mirrorPose();
  }

  reset(): void {
    poseService.reset();
  }

  undo(): void {
    poseService.undo();
  }

  redo(): void {
    poseService.redo();
  }

  get canUndo(): boolean {
    return poseService.canUndo;
  }

  get canRedo(): boolean {
    return poseService.canRedo;
  }

  addListener(listener: (data: PoseData) => void): void {
    poseService.addListener(listener);
  }

  removeListener(listener: (data: PoseData) => void): void {
    poseService.removeListener(listener);
  }
}

// Аналогично для CameraService
```

### 4. Фабрика контейнеров с поддержкой feature flags
```typescript
// src/lib/di/ContainerFactory.ts
import { Container } from './Container';
import { FeatureFlagService } from '../feature-flags/FeatureFlagService';
import { LegacyPoseServiceAdapter } from './adapters/LegacyPoseServiceAdapter';
import { NewPoseService } from '../services/NewPoseService';
import { LegacyCameraServiceAdapter } from './adapters/LegacyCameraServiceAdapter';
import { NewCameraService } from '../services/NewCameraService';

export class ContainerFactory {
  static createDefaultContainer(featureFlags?: FeatureFlagService): Container {
    const container = new Container();
    const flags = featureFlags || this.createDefaultFeatureFlags();

    // Регистрация сервисов с учетом feature flags
    container.register('poseService', (c) => {
      if (flags.isEnabled('USE_DI_CONTAINER')) {
        return new NewPoseService(
          c.get('skeletonGraph'),
          c.get('undoStack')
        );
      } else {
        return new LegacyPoseServiceAdapter();
      }
    }, { singleton: true });

    container.register('cameraService', (c) => {
      if (flags.isEnabled('USE_DI_CONTAINER')) {
        return new NewCameraService();
      } else {
        return new LegacyCameraServiceAdapter();
      }
    }, { singleton: true });

    container.register('exportService', (c) => {
      return new ExportService();
    }, { singleton: false }); // Новый экземпляр при каждом запросе

    container.register('skeletonGraph', (c) => {
      return new SkeletonGraph();
    }, { singleton: true });

    container.register('undoStack', (c) => {
      return new UndoStack(50);
    }, { singleton: true });

    // Вспомогательные сервисы
    container.register('logger', (c) => {
      return console; // или кастомный логгер
    }, { singleton: true });

    return container;
  }

  private static createDefaultFeatureFlags(): FeatureFlagService {
    const service = new FeatureFlagService({});
    // По умолчанию все флаги выключены
    return service;
  }
}
```

### 5. React Context для DI
```typescript
// src/context/DiContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Container } from '../lib/di/Container';
import { ContainerFactory } from '../lib/di/ContainerFactory';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';

const DiContext = createContext<Container | null>(null);

export const useDiContainer = (): Container => {
  const container = useContext(DiContext);
  if (!container) {
    throw new Error('useDiContainer must be used within DiProvider');
  }
  return container;
};

export const useService = <T,>(key: string | symbol): T => {
  const container = useDiContainer();
  return container.get<T>(key);
};

interface DiProviderProps {
  children: React.ReactNode;
  featureFlags?: FeatureFlagService;
  container?: Container;
}

export const DiProvider: React.FC<DiProviderProps> = ({
  children,
  featureFlags,
  container: externalContainer,
}) => {
  const [container] = useState(() => {
    return externalContainer || ContainerFactory.createDefaultContainer(featureFlags);
  });

  useEffect(() => {
    return () => {
      // Очистка при размонтировании (в dev режиме)
      if (import.meta.env.DEV) {
        container.clear();
      }
    };
  }, [container]);

  return (
    <DiContext.Provider value={container}>
      {children}
    </DiContext.Provider>
  );
};
```

### 6. Хуки для удобного использования
```typescript
// src/hooks/usePoseService.ts
import { useService } from '../context/DiContext';
import { IPoseService } from '../lib/di/types';

export const usePoseService = (): IPoseService => {
  return useService<IPoseService>('poseService');
};

// src/hooks/useCameraService.ts
import { useService } from '../context/DiContext';
import { ICameraService } from '../lib/di/types';

export const useCameraService = (): ICameraService => {
  return useService<ICameraService>('cameraService');
};

// src/hooks/useExportService.ts
import { useService } from '../context/DiContext';
import { IExportService } from '../lib/di/types';

export const useExportService = (): IExportService => {
  return useService<IExportService>('exportService');
};
```

## Стратегия внедрения

### Фаза 1: Подготовка (1 неделя)
1. Создать структуру каталогов `src/lib/di/`
2. Реализовать базовый Container
3. Создать интерфейсы для сервисов
4. Написать unit тесты для контейнера

### Фаза 2: Адаптеры (1 неделя)
1. Создать адаптеры для существующих синглтонов
2. Протестировать обратную совместимость
3. Интегрировать с feature flags

### Фаза 3: Интеграция с React (1 неделя)
1. Создать DiContext и DiProvider
2. Интегрировать в App.tsx
3. Создать хуки usePoseService, useCameraService и т.д.

### Фаза 4: Миграция компонентов (2 недели)
1. Заменить импорты синглтонов на useService хуки
2. Протестировать каждую мигрированную компоненту
3. Добавить fallback на старые синглтоны при отключенном feature flag

### Фаза 5: Оптимизация и cleanup (1 неделя)
1. Удалить неиспользуемые импорты синглтонов
2. Оптимизировать производительность контейнера
3. Добавить lazy loading для тяжелых сервисов

## Примеры использования

### До (старый подход)
```typescript
import { poseService } from '../services/PoseService';
import { cameraService } from '../services/cameraService';

const MyComponent = () => {
  const handleClick = () => {
    poseService.translate(1, 0, 0);
  };
  
  return <button onClick={handleClick}>Move</button>;
};
```

### После (новый подход с DI)
```typescript
import { usePoseService, useCameraService } from '../hooks/usePoseService';

const MyComponent = () => {
  const poseService = usePoseService();
  const cameraService = useCameraService();
  
  const handleClick = () => {
    poseService.translate(1, 0, 0);
  };
  
  return <button onClick={handleClick}>Move</button>;
};
```

### В тестах
```typescript
import { Container } from '../lib/di/Container';
import { MockPoseService } from './mocks/MockPoseService';

describe('MyComponent', () => {
  it('should work with mocked services', () => {
    const container = new Container();
    const mockPoseService = new MockPoseService();
    container.register('poseService', () => mockPoseService);
    
    // Рендерим компонент с тестовым контейнером
    render(
      <DiProvider container={container}>
        <MyComponent />
      </DiProvider>
    );
    
    // Тестируем взаимодействие с mock
    expect(mockPoseService.translate).toHaveBeenCalled();
  });
});
```

## Преимущества

### 1. Улучшенная тестируемость
- Легко мокать зависимости
- Изолированные тесты без глобального состояния
- Возможность тестировать разные конфигурации

### 2. Гибкость конфигурации
- Разные контейнеры для dev/prod/test
- Легко менять реализации сервисов
- Поддержка A/B тестирования через feature flags

### 3. Управление жизненным циклом
- Контроль над созданием и уничтожением сервисов
- Возможность lazy loading
- Автоматическая очистка ресурсов

### 4. Обратная совместимость
- Плавный переход от синглтонов
- Возможность отката через feature flags
- Параллельная работа старых и новых реализаций

## Риски и митигации

### Риск 1: Производительность
**Митигация**: Использовать singleton регистрацию, кэширование, избегать создания сервисов на каждый рендер

### Риск 2: Сложность внедрения
**Митигация**: Поэтапное внедрение с feature flags, extensive testing, fallback механизмы

### Риск 3: Обучение команды
**Митигация**: Документация, примеры кода, code review, pair programming

## Next Steps

1. **Создать базовую инфраструктуру DI**
   - Реализовать Container класс
   - Написать unit тесты
   - Создать интерфейсы сервисов

2. **Интегрировать с существующим кодом**
   - Создать адаптеры для синглтонов
   - Добавить DiProvider в App.tsx
   - Создать хуки useService

3. **Начать миграцию компонентов**
   - Выбрать простые компоненты для начала
   - Заменить импорты синглтонов
   - Протестировать регрессии

4. **Мониторинг и оптимизация**
   - Измерять производительность
   - Собирать feedback от разработчиков
   - Оптимизировать based on usage patterns
