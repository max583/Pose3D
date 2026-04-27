# [ARCHIVED] 2026-04-28

Исторический дизайн feature flags. Актуальный реестр см. в `poseflow/src/lib/feature-flags/registry.ts`; старые DesignDoll flags из этого документа могут быть удалены из кода.

# Архитектура системы Feature Flags для PoseFlow

## Обзор
Система feature flags позволяет постепенно внедрять новые функции, управлять их доступностью и обеспечивать обратную совместимость во время рефакторинга.

## Цели
1. **Постепенное внедрение** - возможность включать функции для определенных пользователей или процент трафика
2. **Безопасный откат** - быстрое отключение проблемных функций без деплоя
3. **A/B тестирование** - сравнение разных реализаций
4. **Управление техническим долгом** - контроль за устаревшим кодом

## Типы feature flags
1. **Release flags** - для постепенного релиза новых функций
2. **Operational flags** - для управления поведением в runtime
3. **Permission flags** - для контроля доступа к функциям
4. **Experiment flags** - для A/B тестирования

## Архитектура

### 1. Конфигурация flags
```typescript
// src/lib/feature-flags/types.ts
export type FlagType = 'release' | 'operational' | 'permission' | 'experiment';

export interface FeatureFlagDefinition {
  key: string;
  type: FlagType;
  description: string;
  defaultValue: boolean;
  rolloutPercentage?: number; // 0-100
  canaryUsers?: string[]; // Список пользователей для раннего доступа
  dependsOn?: string[]; // Зависимости от других flags
  metadata?: Record<string, any>;
}

export interface FeatureFlagState {
  enabled: boolean;
  lastUpdated: string;
  activatedForUser: boolean;
}
```

### 2. Реестр всех flags
```typescript
// src/lib/feature-flags/registry.ts
export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  // Архитектурные улучшения
  USE_DI_CONTAINER: {
    key: 'USE_DI_CONTAINER',
    type: 'release',
    description: 'Включить Dependency Injection контейнер',
    defaultValue: false,
    rolloutPercentage: 0,
  },
  
  USE_ZUSTAND_STORE: {
    key: 'USE_ZUSTAND_STORE',
    type: 'release',
    description: 'Включить Zustand для state management',
    defaultValue: false,
    dependsOn: ['USE_DI_CONTAINER'],
  },
  
  // DesignDoll рефакторинг
  USE_FIXED_LENGTHS: {
    key: 'USE_FIXED_LENGTHS',
    type: 'release',
    description: 'Использовать фиксированные длины костей',
    defaultValue: false,
    rolloutPercentage: 0,
  },
  
  USE_RIGID_SKULL: {
    key: 'USE_RIGID_SKULL',
    type: 'release',
    description: 'Жесткий череп (недеформируемая группа)',
    defaultValue: false,
    dependsOn: ['USE_FIXED_LENGTHS'],
  },
  
  USE_DESIGNDOLL_CONTROLLERS: {
    key: 'USE_DESIGNDOLL_CONTROLLERS',
    type: 'release',
    description: 'Использовать 7 контроллеров в стиле DesignDoll',
    defaultValue: false,
    dependsOn: ['USE_FIXED_LENGTHS', 'USE_RIGID_SKULL'],
  },
  
  // Экспериментальные функции
  USE_MINI_VIEW: {
    key: 'USE_MINI_VIEW',
    type: 'experiment',
    description: 'Показывать мини-вид (Step 8)',
    defaultValue: false,
    rolloutPercentage: 10, // 10% пользователей
  },
  
  USE_DIRECTION_B_MODE: {
    key: 'USE_DIRECTION_B_MODE',
    type: 'experiment',
    description: 'Режим "Направление B" с кольцевыми гизмо',
    defaultValue: false,
    rolloutPercentage: 5,
  },
};
```

### 3. Сервис управления flags
```typescript
// src/lib/feature-flags/FeatureFlagService.ts
export class FeatureFlagService {
  private flags: Map<string, FeatureFlagState> = new Map();
  private userId: string | null = null;
  
  constructor(private definitions: Record<string, FeatureFlagDefinition>) {
    this.initializeFlags();
  }
  
  private initializeFlags(): void {
    Object.values(this.definitions).forEach(def => {
      this.flags.set(def.key, {
        enabled: def.defaultValue,
        lastUpdated: new Date().toISOString(),
        activatedForUser: this.shouldActivateForUser(def),
      });
    });
  }
  
  private shouldActivateForUser(def: FeatureFlagDefinition): boolean {
    // Проверка canary пользователей
    if (def.canaryUsers?.includes(this.userId || '')) {
      return true;
    }
    
    // Проверка процентного распределения
    if (def.rolloutPercentage && def.rolloutPercentage > 0) {
      const hash = this.hashUserId(this.userId || 'anonymous');
      return hash % 100 < def.rolloutPercentage;
    }
    
    return def.defaultValue;
  }
  
  private hashUserId(userId: string): number {
    // Простая хэш-функция для детерминированного распределения
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
  
  isEnabled(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    
    // Проверка зависимостей
    const def = this.definitions[key];
    if (def?.dependsOn) {
      const allDependenciesEnabled = def.dependsOn.every(depKey => 
        this.isEnabled(depKey)
      );
      if (!allDependenciesEnabled) return false;
    }
    
    return flag.enabled && flag.activatedForUser;
  }
  
  setUserId(userId: string): void {
    this.userId = userId;
    this.recalculateUserFlags();
  }
  
  private recalculateUserFlags(): void {
    Object.values(this.definitions).forEach(def => {
      const flag = this.flags.get(def.key);
      if (flag) {
        flag.activatedForUser = this.shouldActivateForUser(def);
      }
    });
  }
  
  // Методы для административного управления (только в dev)
  enableFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = true;
      flag.lastUpdated = new Date().toISOString();
    }
  }
  
  disableFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = false;
      flag.lastUpdated = new Date().toISOString();
    }
  }
  
  getFlagState(key: string): FeatureFlagState | undefined {
    return this.flags.get(key);
  }
  
  getAllFlags(): Map<string, FeatureFlagState> {
    return new Map(this.flags);
  }
}
```

### 4. React хук для использования
```typescript
// src/hooks/useFeatureFlag.ts
import { useContext } from 'react';
import { FeatureFlagContext } from '../context/FeatureFlagContext';

export const useFeatureFlag = (key: string): boolean => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    console.warn('FeatureFlagContext not found, using default value');
    return false;
  }
  return context.isEnabled(key);
};

// Для компонентов с условным рендерингом
export const FeatureFlag: React.FC<{
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ flag, children, fallback = null }) => {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback}</>;
};
```

### 5. Контекст для React
```typescript
// src/context/FeatureFlagContext.tsx
import React, { createContext, useEffect, useState } from 'react';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';
import { FEATURE_FLAGS } from '../lib/feature-flags/registry';

const featureFlagService = new FeatureFlagService(FEATURE_FLAGS);

export const FeatureFlagContext = createContext<FeatureFlagService>(featureFlagService);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [service] = useState(() => featureFlagService);
  
  useEffect(() => {
    // Инициализация пользователя (можно из localStorage или API)
    const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
    service.setUserId(userId);
    
    // В dev режиме можно включить отладку
    if (import.meta.env.DEV) {
      (window as any).__featureFlags = service;
    }
  }, [service]);
  
  return (
    <FeatureFlagContext.Provider value={service}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
```

## Стратегия внедрения

### Этап 1: Базовая интеграция
1. Создать структуру каталогов `src/lib/feature-flags/`
2. Реализовать типы и реестр flags
3. Создать FeatureFlagService
4. Интегрировать FeatureFlagProvider в App.tsx

### Этап 2: Интеграция с существующим кодом
1. Заменить условные компиляции на feature flags
2. Создать адаптеры для сервисов с поддержкой flags
3. Добавить логирование активации flags

### Этап 3: Управление через UI
1. Создать панель администратора для управления flags (только в dev)
2. Добавить возможность переключать flags через hotkeys
3. Интегрировать с системой логирования

### Этап 4: Мониторинг и аналитика
1. Отслеживание активации flags
2. Сбор метрик использования новых функций
3. A/B тестирование с аналитикой

## Примеры использования

### В компонентах
```tsx
import { FeatureFlag } from '../hooks/useFeatureFlag';

const MyComponent = () => {
  return (
    <div>
      <h1>Основной интерфейс</h1>
      
      <FeatureFlag flag="USE_MINI_VIEW">
        <MiniView />
      </FeatureFlag>
      
      <FeatureFlag flag="USE_DESIGNDOLL_CONTROLLERS" fallback={<LegacyControls />}>
        <DesignDollControllers />
      </FeatureFlag>
    </div>
  );
};
```

### В сервисах
```typescript
import { featureFlagService } from '../lib/feature-flags/FeatureFlagService';

class AdaptivePoseService {
  private getSolver() {
    if (featureFlagService.isEnabled('USE_FIXED_LENGTHS')) {
      return new FixedLengthSolver();
    }
    return new LegacySkeletonGraph();
  }
}
```

## Безопасность и производительность
1. **Кэширование** - флаги кэшируются на сессию
2. **Валидация** - проверка зависимостей между флагами
3. **Fallback** - graceful degradation при ошибках
4. **Аудит** - логирование всех изменений флагов

## Next Steps
1. Создать файлы по указанным путям
2. Протестировать базовую функциональность
3. Интегрировать с существующими сервисами
4. Добавить UI для управления в dev режиме
