# [ARCHIVED] 2026-04-28

Исторический план baseline regression tests. Актуальная команда качества: `npm run verify` из `poseflow/`. Актуальные R3F/manual проверки: `ai/docs/r3f-smoke-manual-checklist.md`.

# План создания baseline тестов для регрессии

## Цель
Создать набор тестов, которые будут гарантировать, что основные функции приложения продолжают работать корректно во время рефакторинга и внедрения новых архитектурных решений.

## Принципы
1. **Изоляция** - тесты должны быть независимы от конкретной реализации
2. **Стабильность** - тесты должны давать одинаковые результаты при одинаковых входных данных
3. **Полнота** - покрытие ключевых пользовательских сценариев
4. **Скорость** - тесты должны выполняться быстро для частого запуска

## Категории тестов

### 1. Функциональные тесты ядра (Core Functionality)
- **PoseService**: базовые операции с позой
- **SkeletonGraph**: вычисление длин костей и граф связей
- **FABRIK solver**: инверсная кинематика
- **Undo/Redo**: отмена и повтор действий

### 2. Интеграционные тесты (Integration)
- Взаимодействие между PoseService и SkeletonGraph
- Взаимодействие между UI компонентами и сервисами
- IPC коммуникация между фронтендом и бэкендом

### 3. End-to-End тесты (E2E)
- Загрузка приложения и отображение 3D сцены
- Манипуляции с суставами через drag & drop
- Экспорт позы в PNG
- Применение пресетов

### 4. Тесты производительности (Performance)
- Время отклика на drag операции
- Производительность рендеринга при изменении позы
- Использование памяти при длительной работе

## Структура baseline тестов

### 1. Файл `baseline-regression.spec.ts`
```typescript
// tests/baseline-regression.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PoseService } from '../src/services/PoseService';
import { SkeletonGraph } from '../src/lib/body25/SkeletonGraph';
import { solveFABRIK } from '../src/lib/solvers/FABRIKSolver';
import { Body25Index } from '../src/lib/body25/body25-types';

describe('Baseline Regression Tests', () => {
  describe('Core Pose Operations', () => {
    let poseService: PoseService;
    
    beforeEach(() => {
      poseService = new PoseService();
    });
    
    it('should initialize with T-pose containing 25 joints', () => {
      const pose = poseService.getPoseData();
      expect(Object.keys(pose).length).toBe(25);
      expect(pose[Body25Index.MID_HIP].y).toBeCloseTo(0.9, 0.1);
    });
    
    it('should translate all joints correctly', () => {
      const before = poseService.getPoseData()[Body25Index.NOSE];
      poseService.translate(0.5, -0.3, 0.2);
      const after = poseService.getPoseData()[Body25Index.NOSE];
      
      expect(after.x).toBeCloseTo(before.x + 0.5, 0.001);
      expect(after.y).toBeCloseTo(before.y - 0.3, 0.001);
      expect(after.z).toBeCloseTo(before.z + 0.2, 0.001);
    });
    
    it('should support undo/redo operations', () => {
      const originalPose = { ...poseService.getPoseData()[Body25Index.NOSE] };
      
      // Изменение
      poseService.translate(1, 0, 0);
      expect(poseService.canUndo).toBe(true);
      
      // Отмена
      poseService.undo();
      const afterUndo = poseService.getPoseData()[Body25Index.NOSE];
      expect(afterUndo.x).toBeCloseTo(originalPose.x, 0.001);
      
      // Повтор
      poseService.redo();
      const afterRedo = poseService.getPoseData()[Body25Index.NOSE];
      expect(afterRedo.x).toBeCloseTo(originalPose.x + 1, 0.001);
    });
    
    it('should mirror pose correctly', () => {
      const rightShoulderBefore = poseService.getPoseData()[Body25Index.RIGHT_SHOULDER];
      const leftShoulderBefore = poseService.getPoseData()[Body25Index.LEFT_SHOULDER];
      
      poseService.mirrorPose();
      
      const rightShoulderAfter = poseService.getPoseData()[Body25Index.RIGHT_SHOULDER];
      const leftShoulderAfter = poseService.getPoseData()[Body25Index.LEFT_SHOULDER];
      
      // Проверка симметрии
      expect(rightShoulderAfter.x).toBeCloseTo(-leftShoulderBefore.x, 0.001);
      expect(leftShoulderAfter.x).toBeCloseTo(-rightShoulderBefore.x, 0.001);
    });
  });
  
  describe('Skeleton Graph Operations', () => {
    it('should compute bone lengths from T-pose', () => {
      const poseService = new PoseService();
      const pose = poseService.getPoseData();
      const graph = new SkeletonGraph();
      
      graph.computeBoneLengths(pose);
      
      // Проверка что длины вычислены для ключевых костей
      expect(graph.getBoneLength(Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW))
        .toBeGreaterThan(0);
      expect(graph.getBoneLength(Body25Index.LEFT_HIP, Body25Index.LEFT_KNEE))
        .toBeGreaterThan(0);
    });
    
    it('should maintain bone lengths after IK operations', () => {
      const poseService = new PoseService();
      const pose = poseService.getPoseData();
      const graph = new SkeletonGraph();
      graph.computeBoneLengths(pose);
      
      // Запоминаем исходные длины
      const originalLengths = new Map();
      const bones = [
        [Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW],
        [Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_WRIST],
        [Body25Index.LEFT_SHOULDER, Body25Index.LEFT_ELBOW],
      ];
      
      bones.forEach(([from, to]) => {
        originalLengths.set(`${from}-${to}`, graph.getBoneLength(from, to));
      });
      
      // Применяем IK
      const target = { x: 0.5, y: 0.5, z: 0.5 };
      const chain = [Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_WRIST];
      const result = solveFABRIK(chain, pose, target, graph);
      
      // Проверяем что длины сохранились
      bones.forEach(([from, to]) => {
        const newLength = graph.getBoneLength(from, to, result);
        const originalLength = originalLengths.get(`${from}-${to}`);
        expect(newLength).toBeCloseTo(originalLength, 0.001);
      });
    });
  });
  
  describe('UI Component Integration', () => {
    it('should render skeleton with all joints', () => {
      // Этот тест требует моков для Three.js и React Three Fiber
      // Проверяем что компонент Skeleton3D создает 25 Joint компонентов
    });
    
    it('should update 3D view when pose changes', () => {
      // Интеграционный тест между PoseService и Canvas3D
    });
  });
  
  describe('Performance Benchmarks', () => {
    it('should solve IK chain within 10ms', () => {
      const poseService = new PoseService();
      const pose = poseService.getPoseData();
      const graph = new SkeletonGraph();
      graph.computeBoneLengths(pose);
      
      const chain = [Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_WRIST];
      const target = { x: 0.5, y: 0.5, z: 0.5 };
      
      const startTime = performance.now();
      solveFABRIK(chain, pose, target, graph);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // 10ms
    });
    
    it('should handle 1000 consecutive translations without performance degradation', () => {
      const poseService = new PoseService();
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        poseService.translate(0.001, 0, 0);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // В среднем менее 0.1ms на операцию
      expect(totalTime).toBeLessThan(100); // 100ms total
    });
  });
});
```

### 2. Файл `regression-test-config.json`
```json
{
  "baseline": {
    "version": "1.0.0",
    "timestamp": "2024-01-01T00:00:00Z",
    "testSuites": [
      "core-pose-operations",
      "skeleton-graph",
      "ik-solver",
      "undo-redo",
      "mirror-operations"
    ]
  },
  "performanceThresholds": {
    "ikSolveTimeMs": 10,
    "translationTimeMs": 0.1,
    "renderFrameTimeMs": 16,
    "memoryUsageMB": 100
  },
  "coverageRequirements": {
    "lines": 80,
    "functions": 85,
    "branches": 70,
    "statements": 80
  }
}
```

### 3. Скрипт для запуска baseline тестов
```json
// package.json дополнение
{
  "scripts": {
    "test:baseline": "vitest run tests/baseline-regression.spec.ts --reporter=verbose",
    "test:regression": "vitest run --coverage --reporter=html",
    "test:performance": "vitest run tests/performance.spec.ts --reporter=verbose"
  }
}
```

## Стратегия внедрения

### Этап 1: Создание инфраструктуры
1. Создать директорию `tests/baseline/`
2. Добавить конфигурационный файл
3. Настроить скрипты в package.json
4. Создать фикстуры с тестовыми данными

### Этап 2: Реализация core тестов
1. Тесты для PoseService (уже частично есть)
2. Тесты для SkeletonGraph
3. Тесты для FABRIK solver
4. Тесты для UndoStack

### Этап 3: Интеграционные тесты
1. Тесты взаимодействия сервисов
2. Тесты с моками для Three.js
3. Тесты IPC коммуникации

### Этап 4: Performance тесты
1. Бенчмарки для ключевых операций
2. Тесты на стабильность памяти
3. Тесты на отзывчивость UI

### Этап 5: CI/CD интеграция
1. Запуск baseline тестов при каждом PR
2. Сравнение результатов с предыдущими прогонами
3. Автоматическое оповещение о регрессии

## Мониторинг регрессии

### 1. Хранение результатов
```typescript
interface TestResult {
  testName: string;
  duration: number;
  passed: boolean;
  timestamp: string;
  metrics: {
    memoryUsage: number;
    cpuTime: number;
    frameRate?: number;
  };
}

interface RegressionReport {
  baseline: TestResult[];
  current: TestResult[];
  regressions: Array<{
    testName: string;
    metric: string;
    baselineValue: number;
    currentValue: number;
    percentageChange: number;
  }>;
}
```

### 2. Визуализация
- Графики производительности over time
- Dashboard с ключевыми метриками
- Автоматические алерты при деградации

### 3. Автоматическое восстановление
- Возможность пометить тест как "flaky"
- Автоматический перезапуск неустойчивых тестов
- Ручное обновление baseline при intentional changes

## Next Steps

1. **Создать структуру директорий:**
   ```
   tests/
   ├── baseline/
   │   ├── regression.spec.ts
   │   ├── performance.spec.ts
   │   └── fixtures/
   ├── integration/
   └── e2e/
   ```

2. **Реализовать core тесты** на основе существующих тестов PoseService

3. **Добавить интеграционные тесты** с моками для Three.js

4. **Настроить CI pipeline** для автоматического запуска

5. **Создать dashboard** для мониторинга результатов

## Критерии успеха
- 100% прохождение baseline тестов перед каждым мержем
- Не более 5% деградации производительности
- Покрытие ключевых пользовательских сценариев
- Быстрое выполнение (менее 2 минут для всего набора)
