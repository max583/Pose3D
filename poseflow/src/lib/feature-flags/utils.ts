// src/lib/feature-flags/utils.ts

import { FeatureFlagDefinition, FeatureFlagState } from './types';

/**
 * Утилиты для работы с feature flags
 */

/**
 * Проверить, можно ли включить флаг на основе его зависимостей
 */
export function canEnableFlag(
  flagKey: string,
  getFlagState: (key: string) => FeatureFlagState | undefined,
  getFlagDefinition: (key: string) => FeatureFlagDefinition | undefined
): { canEnable: boolean; missingDependencies: string[] } {
  const definition = getFlagDefinition(flagKey);
  if (!definition) {
    return { canEnable: false, missingDependencies: [] };
  }

  const missingDependencies: string[] = [];

  if (definition.dependsOn) {
    for (const depKey of definition.dependsOn) {
      const depState = getFlagState(depKey);
      if (!depState?.enabled) {
        missingDependencies.push(depKey);
      }
    }
  }

  return {
    canEnable: missingDependencies.length === 0,
    missingDependencies,
  };
}

/**
 * Получить дерево зависимостей флага
 */
export function getDependencyTree(
  flagKey: string,
  getFlagDefinition: (key: string) => FeatureFlagDefinition | undefined,
  visited: Set<string> = new Set()
): { key: string; dependencies: any[] } | null {
  if (visited.has(flagKey)) {
    return null; // Обнаружен цикл
  }

  visited.add(flagKey);

  const definition = getFlagDefinition(flagKey);
  if (!definition) {
    return null;
  }

  const dependencies: any[] = [];

  if (definition.dependsOn) {
    for (const depKey of definition.dependsOn) {
      const depTree = getDependencyTree(depKey, getFlagDefinition, new Set(visited));
      if (depTree) {
        dependencies.push(depTree);
      }
    }
  }

  return {
    key: flagKey,
    dependencies,
  };
}

/**
 * Получить все флаги, которые зависят от указанного флага
 */
export function getDependentFlags(
  flagKey: string,
  getAllDefinitions: () => FeatureFlagDefinition[]
): string[] {
  const definitions = getAllDefinitions();
  const dependents: string[] = [];

  for (const definition of definitions) {
    if (definition.dependsOn?.includes(flagKey)) {
      dependents.push(definition.key);
    }
  }

  return dependents;
}

/**
 * Проверить, есть ли циклические зависимости
 */
export function hasCyclicDependencies(
  getAllDefinitions: () => FeatureFlagDefinition[]
): { hasCycle: boolean; cycles: string[][] } {
  const definitions = getAllDefinitions();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(key: string, path: string[] = []): boolean {
    if (recursionStack.has(key)) {
      // Найден цикл
      const cycleStart = path.indexOf(key);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return true;
    }

    if (visited.has(key)) {
      return false;
    }

    visited.add(key);
    recursionStack.add(key);

    const definition = definitions.find(def => def.key === key);
    if (definition?.dependsOn) {
      for (const depKey of definition.dependsOn) {
        const newPath = [...path, key];
        if (dfs(depKey, newPath)) {
          recursionStack.delete(key);
          return true;
        }
      }
    }

    recursionStack.delete(key);
    return false;
  }

  let hasCycle = false;
  for (const definition of definitions) {
    if (!visited.has(definition.key)) {
      if (dfs(definition.key)) {
        hasCycle = true;
      }
    }
  }

  return { hasCycle, cycles };
}

/**
 * Отфильтровать флаги по префиксу
 */
export function filterFlagsByPrefix(
  flags: FeatureFlagDefinition[],
  prefix: string
): FeatureFlagDefinition[] {
  return flags.filter(flag => flag.key.startsWith(prefix));
}

/**
 * Группировать флаги по типу
 */
export function groupFlagsByType(
  flags: FeatureFlagDefinition[]
): Record<string, FeatureFlagDefinition[]> {
  const groups: Record<string, FeatureFlagDefinition[]> = {};

  for (const flag of flags) {
    if (!groups[flag.type]) {
      groups[flag.type] = [];
    }
    groups[flag.type].push(flag);
  }

  return groups;
}

/**
 * Создать человеко-читаемое описание флага
 */
export function getFlagDescription(flag: FeatureFlagDefinition): string {
  const parts = [flag.description];

  if (flag.dependsOn && flag.dependsOn.length > 0) {
    parts.push(`Зависит от: ${flag.dependsOn.join(', ')}`);
  }

  if (flag.rolloutPercentage !== undefined) {
    parts.push(`Распределение: ${flag.rolloutPercentage}% пользователей`);
  }

  if (flag.canaryUsers && flag.canaryUsers.length > 0) {
    parts.push(`Canary пользователи: ${flag.canaryUsers.length}`);
  }

  return parts.join('. ');
}

/**
 * Проверить, должен ли флаг быть видимым в UI
 */
export function shouldShowInUI(flag: FeatureFlagDefinition, isDev: boolean): boolean {
  // В dev режиме показываем все флаги
  if (isDev) {
    return true;
  }

  // В production показываем только release и experiment флаги
  return flag.type === 'release' || flag.type === 'experiment';
}

/**
 * Создать уникальный идентификатор пользователя для feature flags
 */
export function createUserId(): string {
  // Используем комбинацию timestamp и random для уникальности
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `user_${timestamp}_${random}`;
}

/**
 * Вычислить хэш строки для детерминированного распределения
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Определить, попадает ли пользователь в процентное распределение
 */
export function isUserInRolloutPercentage(
  userId: string,
  rolloutPercentage: number
): boolean {
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;

  const hash = hashString(userId);
  return hash % 100 < rolloutPercentage;
}