# Прототип фиксированных длин костей для DesignDoll рефакторинга

## Обзор
Прототип системы фиксированных длин костей, которая будет работать параллельно с существующей системой и постепенно заменять ее через feature flags.

## Цели прототипа
1. **Доказательство концепции**: Показать, что фиксированные длины костей работают в контексте PoseFlow
2. **Изоляция**: Работать независимо от production кода
3. **Интеграционная готовность**: Легко интегрироваться через feature flags
4. **Тестируемость**: Полное покрытие unit тестами

## Архитектура прототипа

### 1. FixedLengthSolver
```typescript
// src/lib/experimental/fixed-length/FixedLengthSolver.ts

import { Body25Index, JointPosition, PoseData } from '../../body25/body25-types';
import { Vector3 } from 'three';
import { SkeletonGraph } from '../../body25/SkeletonGraph';

/**
 * Решатель, который сохраняет фиксированные длины костей при манипуляциях
 */
export class FixedLengthSolver {
  private boneLengths: Map<string, number> = new Map();
  private graph: SkeletonGraph;
  
  constructor() {
    this.graph = new SkeletonGraph();
  }
  
  /**
   * Вычислить и сохранить длины костей из позы
   */
  computeBoneLengths(pose: PoseData): void {
    this.graph.computeBoneLengths(pose);
    
    // Сохраняем длины для всех костей
    const connections = this.graph.getConnections();
    for (const [from, to] of connections) {
      const length = this.graph.getBoneLength(from, to, pose);
      const key = this.getBoneKey(from, to);
      this.boneLengths.set(key, length);
    }
  }
  
  /**
   * Применить drag к суставу с сохранением длин костей
   */
  applyDrag(
    draggedJoint: Body25Index,
    targetPosition: Vector3,
    pose: PoseData
  ): PoseData {
    // Копируем позу для модификации
    const newPose = { ...pose };
    
    // Обновляем позицию dragged сустава
    newPose[draggedJoint] = {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      confidence: 1.0
    };
    
    // Находим все affected кости (те, которые связаны с dragged суставом)
    const affectedBones = this.getAffectedBones(draggedJoint);
    
    // Применяем constraints для каждой affected кости
    for (const [from, to] of affectedBones) {
      this.applyBoneConstraint(from, to, newPose);
    }
    
    return newPose;
  }
  
  /**
   * Решить IK цепь с фиксированными длинами
   */
  solveIKWithFixedLengths(
    chain: Body25Index[],
    target: Vector3,
    pose: PoseData
  ): PoseData {
    if (chain.length < 2) {
      return pose;
    }
    
    // Копируем позу
    const newPose = { ...pose };
    
    // Устанавливаем end effector в target позицию
    const endEffector = chain[chain.length - 1];
    newPose[endEffector] = {
      x: target.x,
      y: target.y,
      z: target.z,
      confidence: 1.0
    };
    
    // Применяем FABRIK-like алгоритм с фиксированными длинами
    for (let i = chain.length - 2; i >= 0; i--) {
      const current = chain[i];
      const next = chain[i + 1];
      
      // Получаем фиксированную длину
      const length = this.getBoneLength(current, next);
      if (length === undefined) {
        continue;
      }
      
      // Вычисляем направление от current к next
      const currentPos = new Vector3(
        newPose[current].x,
        newPose[current].y,
        newPose[current].z
      );
      const nextPos = new Vector3(
        newPose[next].x,
        newPose[next].y,
        newPose[next].z
      );
      
      const direction = new Vector3()
        .subVectors(nextPos, currentPos)
        .normalize();
      
      // Устанавливаем next позицию на фиксированном расстоянии от current
      const newNextPos = currentPos.clone().add(
        direction.multiplyScalar(length)
      );
      
      newPose[next] = {
        x: newNextPos.x,
        y: newNextPos.y,
        z: newNextPos.z,
        confidence: 1.0
      };
    }
    
    return newPose;
  }
  
  /**
   * Получить длину кости
   */
  getBoneLength(from: Body25Index, to: Body25Index): number | undefined {
    const key = this.getBoneKey(from, to);
    return this.boneLengths.get(key);
  }
  
  /**
   * Получить все длины костей
   */
  getAllBoneLengths(): Map<string, number> {
    return new Map(this.boneLengths);
  }
  
  /**
   * Сбросить длины костей
   */
  reset(): void {
    this.boneLengths.clear();
  }
  
  // ─── Private methods ──────────────────────────────────────────────────────
  
  private getBoneKey(from: Body25Index, to: Body25Index): string {
    return `${from}-${to}`;
  }
  
  private getAffectedBones(joint: Body25Index): Array<[Body25Index, Body25Index]> {
    const connections = this.graph.getConnections();
    return connections.filter(([from, to]) => from === joint || to === joint);
  }
  
  private applyBoneConstraint(
    from: Body25Index,
    to: Body25Index,
    pose: PoseData
  ): void {
    const length = this.getBoneLength(from, to);
    if (length === undefined) {
      return;
    }
    
    const fromPos = new Vector3(
      pose[from].x,
      pose[from].y,
      pose[from].z
    );
    const toPos = new Vector3(
      pose[to].x,
      pose[to].y,
      pose[to].z
    );
    
    const currentDirection = new Vector3()
      .subVectors(toPos, fromPos)
      .normalize();
    
    // Устанавливаем to позицию на фиксированном расстоянии от from
    const newToPos = fromPos.clone().add(
      currentDirection.multiplyScalar(length)
    );
    
    pose[to] = {
      x: newToPos.x,
      y: newToPos.y,
      z: newToPos.z,
      confidence: pose[to].confidence
    };
  }
}
```

### 2. FixedLengthDragAdapter
```typescript
// src/lib/experimental/fixed-length/FixedLengthDragAdapter.ts

import { Body25Index, JointPosition } from '../../body25/body25-types';
import { FixedLengthSolver } from './FixedLengthSolver';
import { poseService } from '../../../services/PoseService';

/**
 * Адаптер для интеграции FixedLengthSolver с существующей drag системой
 */
export class FixedLengthDragAdapter {
  private solver: FixedLengthSolver;
  private enabled: boolean = false;
  
  constructor() {
    this.solver = new FixedLengthSolver();
    
    // Инициализируем длины костей из текущей позы
    const pose = poseService.getPoseData();
    this.solver.computeBoneLengths(pose);
  }
  
  /**
   * Включить/выключить фиксированные длины
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (enabled) {
      // Пересчитываем длины при включении
      const pose = poseService.getPoseData();
      this.solver.computeBoneLengths(pose);
    }
  }
  
  /**
   * Обработать drag событие
   */
  handleDrag(
    joint: Body25Index,
    targetPosition: { x: number; y: number; z: number },
    currentPose: Record<Body25Index, JointPosition>
  ): Record<Body25Index, JointPosition> {
    if (!this.enabled) {
      // Возвращаем исходную позу (никаких изменений)
      return currentPose;
    }
    
    // Применяем drag с фиксированными длинами
    return this.solver.applyDrag(
      joint,
      targetPosition,
      currentPose
    );
  }
  
  /**
   * Обработать IK операцию
   */
  handleIK(
    chain: Body25Index[],
    target: { x: number; y: number; z: number },
    currentPose: Record<Body25Index, JointPosition>
  ): Record<Body25Index, JointPosition> {
    if (!this.enabled) {
      return currentPose;
    }
    
    return this.solver.solveIKWithFixedLengths(
      chain,
      target,
      currentPose
    );
  }
  
  /**
   * Обновить длины костей из текущей позы
   */
  updateBoneLengths(): void {
    const pose = poseService.getPoseData();
    this.solver.computeBoneLengths(pose);
  }
  
  /**
   * Получить текущие длины костей
   */
  getBoneLengths(): Map<string, number> {
    return this.solver.getAllBoneLengths();
  }
}
```

### 3. ExperimentalDragHook
```typescript
// src/hooks/experimental/useExperimentalDrag.ts

import { useState, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Plane, Raycaster, Vector2 } from 'three';
import { Body25Index, JointPosition } from '../../lib/body25/body25-types';
import { FixedLengthDragAdapter } from '../../lib/experimental/fixed-length/FixedLengthDragAdapter';

/**
 * Экспериментальный хук для drag с фиксированными длинами
 */
export function useExperimentalDrag({
  index,
  onPositionChange,
  fixedLengthAdapter,
}: {
  index: Body25Index;
  onPositionChange: (index: Body25Index, position: JointPosition) => void;
  fixedLengthAdapter: FixedLengthDragAdapter;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();
  
  const dragPlaneRef = useRef<Plane>(new Plane());
  const offsetRef = useRef<Vector3>(new Vector3());
  const raycasterRef = useRef<Raycaster>(new Raycaster());
  const ndcRef = useRef<Vector2>(new Vector2());
  
  const updateNDC = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }, [gl]);
  
  const intersectDragPlane = useCallback((clientX: number, clientY: number): Vector3 | null => {
    updateNDC(clientX, clientY);
    raycasterRef.current.setFromCamera(ndcRef.current, camera);
    const target = new Vector3();
    const hit = raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, target);
    return hit ? target : null;
  }, [camera, updateNDC]);
  
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const intersection = intersectDragPlane(e.clientX, e.clientY);
    if (!intersection) return;
    
    // Получаем текущую позу
    // В реальной реализации это должно приходить из контекста или props
    const currentPose = {}; // Заглушка
    
    // Обрабатываем drag через адаптер
    const newPose = fixedLengthAdapter.handleDrag(
      index,
      { x: intersection.x, y: intersection.y, z: intersection.z },
      currentPose
    );
    
    // Вызываем callback с новой позицией
    const newPosition = newPose[index];
    onPositionChange(index, newPosition);
  }, [index, onPositionChange, intersectDragPlane, fixedLengthAdapter]);
  
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);
  
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    
    const jointWorldPos = new Vector3(
      e.object.position.x,
      e.object.position.y,
      e.object.position.z
    );
    
    const cameraDir = new Vector3();
    camera.getWorldDirection(cameraDir);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, jointWorldPos);
    
    const intersection = intersectDragPlane(
      e.clientX ?? e.nativeEvent?.clientX ?? 0,
      e.clientY ?? e.nativeEvent?.clientY ?? 0
    );
    
    if (intersection) {
      offsetRef.current.copy(intersection).sub(jointWorldPos);
    } else {
      offsetRef.current.set(0, 0, 0);
    }
    
    setIsDragging(true);
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [camera, intersectDragPlane, handlePointerMove, handlePointerUp]);
  
  return {
    isDragging,
    handlePointerDown,
  };
}
```

### 4. Feature Flag Integration
```typescript
// src/lib/experimental/fixed-length/featureFlagIntegration.ts

import { FeatureFlagService } from '../../feature-flags/FeatureFlagService';
import { FixedLengthDragAdapter } from './FixedLengthDragAdapter';

/**
 * Фабрика для создания адаптера с учетом feature flags
 */
export class FixedLengthFactory {
  static createAdapter(featureFlags: FeatureFlagService): FixedLengthDragAdapter {
    const adapter = new FixedLengthDragAdapter();
    
    // Проверяем feature flag
    const enabled = featureFlags.isEnabled('USE_FIXED_LENGTHS');
    adapter.setEnabled(enabled);
    
    // Подписываемся на изменения feature flag
    // В реальной реализации это должно быть через observer pattern
    
    return adapter;
  }
  
  /**
   * Создать хук для drag в зависимости от feature flag
   */
  static createDragHook(
    featureFlags: FeatureFlagService,
    params: {
      index: Body25Index;
      onPositionChange: (index: Body25Index, position: JointPosition) => void;
    }
  ) {
    const adapter = this.createAdapter(featureFlags);
    
    if (featureFlags.isEnabled('USE_FIXED_LENGTHS')) {
      // Используем экспериментальный хук
      return {
        hook: 'experimental',
        adapter,
        // В реальной реализации возвращаем хук
      };
    } else {
      // Используем стандартный хук
      return {
        hook: 'standard',
        adapter: null,
        // В реальной реализации возвращаем стандартный хук
      };
    }
  }
}
```

## Структура директорий для прототипа

```
src/
├── lib/
│   ├── experimental/
│   │   ├── fixed-length/
│   │   │   ├── FixedLengthSolver.ts          # Основной решатель
│   │   │   ├── FixedLengthDragAdapter.ts     # Адаптер для интеграции
│   │   │   ├── featureFlagIntegration.ts     # Интеграция с feature flags
│   │   │   ├── __tests__/
│   │   │   │   ├── FixedLengthSolver.test.ts
│   │   │   │   └── FixedLengthDragAdapter.test.ts
│   │   │   └── index.ts                      # Экспорт всех модулей
│   │   └── index.ts
│   └── feature-flags/                        # Существующая система feature flags
├── hooks/
│   ├── experimental/
│   │   └── useExperimentalDrag.ts            # Экспериментальный хук
│   └── useTransformDrag.ts                   # Существующий хук
└── components/
    └── experimental/                         # Экспериментальные компоненты
```

## Unit тесты для прототипа

### 1. FixedLengthSolver.test.ts
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FixedLengthSolver } from './FixedLengthSolver';
import { Body25Index } from '../../body25/body25-types';

describe('FixedLengthSolver', () => {
  let solver: FixedLengthSolver;
  
  beforeEach(() => {
    solver = new FixedLengthSolver();
  });
  
  it('should compute and store bone lengths', () => {
    const mockPose = createMockPose();
    solver.computeBoneLengths(mockPose);
    
    const lengths = solver.getAllBoneLengths();
    expect(lengths.size).toBeGreaterThan(0);
  });
  
  it('should preserve bone lengths during drag', () => {
    const mockPose = createMockPose();
    solver.computeBoneLengths(mockPose);
    
    const initialLength = solver.getBoneLength(
      Body25Index.RIGHT_SHOULDER,
      Body25Index.RIGHT_ELBOW
    );
    
    const newPose = solver.applyDrag(
      Body25Index.RIGHT_SHOULDER,
      { x: 1, y: 1, z: 1 },
      mockPose
    );
    
    // После drag длина должна сохраниться
    solver.computeBoneLengths(newPose);
    const newLength = solver.getBoneLength(
      Body25Index.RIGHT_SHOULDER,
      Body25Index.RIGHT_ELBOW
    );
    
    expect(newLength).toBeCloseTo(initialLength!, 0.001);
  });
  
  it('should solve IK with fixed lengths', () => {
    const mockPose = createMockPose();
    solver.computeBoneLengths(mockPose);
    
    const chain = [
      Body25Index.RIGHT_SHOULDER,
      Body25Index.RIGHT_ELBOW,
      Body25Index.RIGHT_WRIST,
    ];
    
    const target = { x: 2, y: 2, z: 2 };
    const newPose = solver.solveIKWithFixedLengths(chain, target, mockPose);
    
    // End effector должен быть в target позиции
    expect(newPose[Body25Index.RIGHT_WRIST].x).toBeCloseTo(target.x, 0.001);
    expect(newPose[Body25Index.RIGHT_WRIST].y).toBeCloseTo(target.y, 0.001);
    expect(newPose[Body25Index.RIGHT_WRIST].z).toBeCloseTo(target.z, 0.001);
  });
});
```

### 2. FixedLengthDragAdapter.test.ts
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FixedLengthDragAdapter } from './FixedLengthDragAdapter';

// Mock poseService
vi.mock('../../../services/PoseService', () => ({
  poseService: {
    getPoseData: () => createMockPose(),
  },
}));

describe('FixedLengthDragAdapter', () => {
  let adapter: FixedLengthDragAdapter;
  
  beforeEach(() => {
    adapter = new FixedLengthDragAdapter();
  });
  
  it('should initialize with bone lengths from current pose', () => {
    const lengths = adapter.getBoneLengths();
    expect(lengths.size).toBeGreaterThan(0);
  });
  
  it('should handle drag when enabled', () => {
    adapter.setEnabled(true);
    
    const mockPose = createMockPose();
    const result = adapter.handleDrag(
      Body25Index.RIGHT_SHOULDER,
      { x: 1, y: 1, z: 1 },
      mockPose
    );
    
    expect(result).toBeDefined();
    expect(result[Body25Index.RIGHT_SHOULDER].x).toBe(1);
  });
  
  it('should not modify pose when disabled', () => {
    adapter.setEnabled(false);
    
    const mockPose = createMockPose();
    const result = adapter.handleDrag(
      Body25Index.RIGHT_SHOULDER,
      { x: 1, y: 1, z: 1 },
      mockPose
    );
    
    // Когда disabled, должен возвращать исходную позу
    expect(result).toEqual(mockPose);
  });
});
```

## Стратегия внедрения прототипа

### Этап 1: Создание изолированного модуля (1-2 дня)
1. Создать директорию `src/lib/experimental/fixed-length/`
2. Реализовать `FixedLengthSolver` с unit тестами
3. Реализовать `FixedLengthDragAdapter` с unit тестами

### Этап 2: Интеграция с feature flags (1 день)
1. Создать `featureFlagIntegration.ts`
2. Интегрировать с существующей системой feature flags
3. Добавить feature flag `USE_FIXED_LENGTHS`

### Этап 3: Создание экспериментального хука (1-2 дня)
1. Создать `useExperimentalDrag` хук
2. Протестировать в изолированной среде
3. Сравнить производительность со стандартным хуком

### Этап 4: Тестирование прототипа (2-3 дня)
1. Unit тесты для всех компонентов
2. Интеграционные тесты с существующей системой
3. Performance тесты

### Этап 5: Подготовка к интеграции (1 день)
1. Документация API
2. Примеры использования
3. План миграции для production кода

## Success Criteria для прототипа

### Функциональные:
- [ ] FixedLengthSolver корректно вычисляет и сохраняет длины костей
- [ ] Длины костей сохраняются при drag операциях
- [ ] IK решения работают с фиксированными длинами
- [ ] Feature flag корректно включает/выключает функциональность

### Технические:
- [ ] Zero dependencies на production код (кроме типов)
- [ ] 100% coverage unit тестами
- [ ] Чистый API для интеграции
- [ ] Хорошая документация

### Performance:
- [ ] Drag операции выполняются за < 10ms
- [ ] Memory usage < 50MB для типичных сцен
- [ ] No memory leaks

## Next Steps после прототипа

1. **Интеграция с реальным PoseService**: Заменить mock данные на реальные
2. **Создание UI переключателя**: Добавить кнопку для включения/выключения фиксированных длин
3. **User testing**: Собрать feedback от пользователей
4. **Performance optimization**: Оптимизировать на основе profiling
5. **Расширение на другие цепи**: Добавить поддержку позвоночника, шеи и т.д.