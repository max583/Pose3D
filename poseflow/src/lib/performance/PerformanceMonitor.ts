// src/lib/performance/PerformanceMonitor.ts
// Утилита для мониторинга производительности и профилирования

import { FeatureFlagService } from '../feature-flags/FeatureFlagService';
import { getService } from '../di/setup';
import { ServiceKeys } from '../di/types';

export interface PerformanceMetric {
  name: string;
  duration: number; // в миллисекундах
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  callCount: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private enabled: boolean = false;
  private featureFlagService: FeatureFlagService;

  private constructor() {
    // Получаем FeatureFlagService через DI
    this.featureFlagService = getService<FeatureFlagService>(ServiceKeys.FeatureFlagService);
    this.updateEnabledState();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private updateEnabledState(): void {
    this.enabled = this.featureFlagService.isEnabled('ENABLE_PERFORMANCE_LOGGING');
    
    // Подписываемся на изменения флага
    this.featureFlagService.subscribe('ENABLE_PERFORMANCE_LOGGING', (state) => {
      this.enabled = state.enabled;
    });
  }

  /**
   * Запуск измерения производительности
   * @param name Имя операции
   * @returns Функция для остановки измерения и записи метрики
   */
  startMeasurement(name: string): () => void {
    if (!this.enabled) {
      return () => {}; // Пустая функция если мониторинг отключен
    }

    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration);
    };
  }

  /**
   * Измерение производительности асинхронной функции
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const stop = this.startMeasurement(name);
    try {
      const result = await fn();
      stop();
      if (metadata) {
        this.addMetadata(name, metadata);
      }
      return result;
    } catch (error) {
      stop();
      throw error;
    }
  }

  /**
   * Измерение производительности синхронной функции
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const stop = this.startMeasurement(name);
    try {
      const result = fn();
      stop();
      if (metadata) {
        this.addMetadata(name, metadata);
      }
      return result;
    } catch (error) {
      stop();
      throw error;
    }
  }

  /**
   * Запись метрики
   */
  private recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Ограничиваем историю последними 100 измерениями
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Логируем если длительность превышает порог
    if (duration > 100) { // > 100ms
      console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Добавление метаданных к последней метрике
   */
  private addMetadata(name: string, metadata: Record<string, any>): void {
    if (!this.enabled) return;

    const metrics = this.metrics.get(name);
    if (metrics && metrics.length > 0) {
      const lastMetric = metrics[metrics.length - 1];
      lastMetric.metadata = { ...lastMetric.metadata, ...metadata };
    }
  }

  /**
   * Получение отчета по метрикам
   */
  getReport(name?: string): PerformanceReport | Map<string, PerformanceReport> {
    if (name) {
      return this.getSingleReport(name);
    }
    return this.getAllReports();
  }

  private getSingleReport(name: string): PerformanceReport {
    const metrics = this.metrics.get(name) || [];
    
    if (metrics.length === 0) {
      return {
        metrics: [],
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        callCount: 0,
      };
    }

    const durations = metrics.map(m => m.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      metrics: [...metrics].reverse(), // Новейшие первыми
      averageDuration,
      minDuration,
      maxDuration,
      callCount: durations.length,
    };
  }

  private getAllReports(): Map<string, PerformanceReport> {
    const reports = new Map<string, PerformanceReport>();
    
    for (const [name] of this.metrics) {
      reports.set(name, this.getSingleReport(name));
    }

    return reports;
  }

  /**
   * Очистка метрик
   */
  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Экспорт метрик в JSON
   */
  exportMetrics(): string {
    const data: Record<string, PerformanceMetric[]> = {};
    
    for (const [name, metrics] of this.metrics) {
      data[name] = metrics;
    }

    return JSON.stringify(data, null, 2);
  }
}

// Глобальный экземпляр для удобного использования
export const performanceMonitor = PerformanceMonitor.getInstance();

// Декоратор для измерения производительности методов класса
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    if (typeof originalMethod === 'function') {
      if (originalMethod.constructor.name === 'AsyncFunction') {
        // Асинхронный метод
        descriptor.value = async function (...args: any[]) {
          const stop = performanceMonitor.startMeasurement(methodName);
          try {
            return await originalMethod.apply(this, args);
          } finally {
            stop();
          }
        };
      } else {
        // Синхронный метод
        descriptor.value = function (...args: any[]) {
          const stop = performanceMonitor.startMeasurement(methodName);
          try {
            return originalMethod.apply(this, args);
          } finally {
            stop();
          }
        };
      }
    }

    return descriptor;
  };
}