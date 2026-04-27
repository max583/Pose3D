# [ARCHIVED] 2026-04-28

Историческая спецификация сервисных интерфейсов. Актуальные контракты см. в `poseflow/src/lib/services/interfaces/` и фактических сервисах.

# Спецификация интерфейсов ключевых сервисов PoseFlow

## Обзор
Этот документ определяет интерфейсы для всех ключевых сервисов приложения, которые будут использоваться в DI контейнере. Интерфейсы обеспечивают контракты между компонентами и позволяют легко заменять реализации.

## Базовые типы

### 1. Общие типы данных
```typescript
// src/lib/types/common.ts
import { Vector3 } from 'three';

export type Body25Index = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;

export interface JointPosition {
  x: number;
  y: number;
  z: number;
}

export type PoseData = Record<Body25Index, JointPosition>;

export type ManipulationMode = 'fk' | 'ik';

export interface CameraState {
  position: Vector3;
  target: Vector3;
  fov: number;
}

export interface ExportOptions {
  format: 'png' | 'json';
  quality?: number;
  includeMetadata?: boolean;
  timestamp?: boolean;
}
```

## Интерфейсы сервисов

### 1. IPoseService - Управление позой
```typescript
// src/lib/services/interfaces/IPoseService.ts
import { Body25Index, JointPosition, PoseData, ManipulationMode } from '../../types/common';
import { Vector3 } from 'three';
import { SkeletonGraph } from '../../body25/SkeletonGraph';

export interface IPoseService {
  // ─── Основные операции ─────────────────────────────────────────────────────
  
  /** Получить текущую позу активного скелета */
  getPoseData(): PoseData;
  
  /** Установить новую позу (с сохранением в undo) */
  setPoseData(data: PoseData): void;
  
  /** Сдвинуть всю позу на указанный вектор */
  translate(dx: number, dy: number, dz: number): void;
  
  /** Отразить позу по оси X */
  mirrorPose(): void;
  
  /** Сбросить позу к T-pose */
  reset(): void;
  
  // ─── Работа с отдельными суставами ────────────────────────────────────────
  
  /** Обновить позицию сустава с учетом FK/IK режима */
  updateJoint(index: Body25Index, position: JointPosition): void;
  
  /** Установить позицию сустава напрямую (без FK/IK) */
  setJointPosition(index: Body25Index, position: JointPosition): void;
  
  /** Получить позицию сустава */
  getJointPosition(index: Body25Index): JointPosition;
  
  // ─── FK/IK управление ─────────────────────────────────────────────────────
  
  /** Получить текущий режим манипуляции */
  getManipulationMode(): ManipulationMode;
  
  /** Установить режим манипуляции */
  setManipulationMode(mode: ManipulationMode): void;
  
  /** Переключить FK-связь сустава с родителем */
  toggleJointLink(index: Body25Index): void;
  
  /** Проверить, есть ли FK-связь у сустава */
  isJointLinked(index: Body25Index): boolean;
  
  /** Получить множество суставов с отключённой FK-пропагацией */
  getUnlinkedJoints(): Set<Body25Index>;
  
  // ─── Undo/Redo ────────────────────────────────────────────────────────────
  
  /** Отменить последнее действие */
  undo(): void;
  
  /** Повторить отмененное действие */
  redo(): void;
  
  /** Проверить возможность отмены */
  get canUndo(): boolean;
  
  /** Проверить возможность повтора */
  get canRedo(): boolean;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения позы */
  subscribe(listener: (data: PoseData) => void): () => void;
  
  // ─── Вспомогательные методы ───────────────────────────────────────────────
  
  /** Получить граф скелета (для внутреннего использования) */
  getGraph(): SkeletonGraph;
  
  /** Создать T-pose */
  createTPose(): PoseData;
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  
  /** Очистить ресурсы (опционально) */
  dispose?(): void;
}
```

### 2. ICameraService - Управление камерой
```typescript
// src/lib/services/interfaces/ICameraService.ts
import { Vector3 } from 'three';
import { CameraState } from '../../types/common';

export interface ICameraService {
  // ─── Основные операции ─────────────────────────────────────────────────────
  
  /** Получить текущее состояние камеры */
  getState(): CameraState;
  
  /** Установить состояние камеры */
  setState(state: CameraState): void;
  
  /** Получить позицию камеры */
  getPosition(): Vector3;
  
  /** Установить позицию камеры */
  setPosition(x: number, y: number, z: number): void;
  
  /** Направить камеру на цель */
  lookAt(target: Vector3): void;
  
  /** Сбросить камеру в положение по умолчанию */
  reset(): void;
  
  // ─── Трансформации ────────────────────────────────────────────────────────
  
  /** Сдвинуть камеру */
  translate(dx: number, dy: number, dz: number): void;
  
  /** Повернуть камеру */
  rotate(dx: number, dy: number): void;
  
  /** Приблизить/отдалить */
  zoom(delta: number): void;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения камеры */
  subscribe(listener: (state: CameraState) => void): () => void;
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  
  /** Очистить ресурсы (опционально) */
  dispose?(): void;
}
```

### 3. IExportService - Экспорт данных
```typescript
// src/lib/services/interfaces/IExportService.ts
import { PoseData } from '../../types/common';
import { ExportOptions } from '../../types/common';

export interface IExportService {
  // ─── Экспорт в файлы ──────────────────────────────────────────────────────
  
  /** Экспортировать позу в PNG */
  exportToPNG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob>;
  
  /** Экспортировать позу в JSON */
  exportToJSON(poseData: PoseData, options?: ExportOptions): Promise<string>;
  
  /** Экспортировать позу в BODY_25 формат (массив [x,y,c]...) */
  exportToBody25Format(poseData: PoseData): Promise<number[]>;
  
  // ─── Вспомогательные методы ───────────────────────────────────────────────
  
  /** Сгенерировать имя файла на основе текущего времени */
  generateFilename(prefix?: string, extension?: string): string;
  
  /** Скачать blob как файл */
  downloadBlob(blob: Blob, filename: string): void;
  
  /** Копировать JSON в буфер обмена */
  copyToClipboard(json: string): Promise<boolean>;
}
```

### 4. IAppSettingsService - Управление настройками приложения
```typescript
// src/lib/services/interfaces/IAppSettingsService.ts

export interface AppSettings {
  // Визуальные настройки
  showGrid: boolean;
  showAxes: boolean;
  backgroundColor: string;
  jointSize: number;
  boneThickness: number;
  
  // Поведение
  autoComputeBoneLengths: boolean;
  snapToGrid: boolean;
  gridSize: number;
  
  // Производительность
  renderQuality: 'low' | 'medium' | 'high';
  antialiasing: boolean;
  
  // Экспорт
  defaultExportFormat: 'png' | 'json';
  pngQuality: number;
  includeMetadata: boolean;
}

export interface IAppSettingsService {
  // ─── Чтение/запись настроек ────────────────────────────────────────────────
  
  /** Получить все настройки */
  getSettings(): AppSettings;
  
  /** Обновить настройки */
  updateSettings(updates: Partial<AppSettings>): void;
  
  /** Сбросить настройки к значениям по умолчанию */
  resetToDefaults(): void;
  
  /** Получить значение конкретной настройки */
  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K];
  
  /** Установить значение конкретной настройки */
  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void;
  
  // ─── Сохранение/загрузка ──────────────────────────────────────────────────
  
  /** Сохранить настройки в localStorage */
  save(): Promise<void>;
  
  /** Загрузить настройки из localStorage */
  load(): Promise<void>;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения настроек */
  subscribe(listener: (settings: AppSettings) => void): () => void;
}
```

### 5. ILoggerService - Логирование
```typescript
// src/lib/services/interfaces/ILoggerService.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

export interface ILoggerService {
  // ─── Основные методы логирования ──────────────────────────────────────────
  
  log(level: LogLevel, module: string, message: string, data?: any): void;
  
  debug(module: string, message: string, data?: any): void;
  
  info(module: string, message: string, data?: any): void;
  
  warn(module: string, message: string, data?: any): void;
  
  error(module: string, message: string, data?: any): void;
  
  // ─── Управление логами ────────────────────────────────────────────────────
  
  /** Получить историю логов */
  getHistory(maxEntries?: number): LogEntry[];
  
  /** Очистить историю логов */
  clearHistory(): void;
  
  /** Экспортировать логи в JSON */
  exportToJSON(): string;
  
  /** Экспортировать логи в текстовый формат */
  exportToText(): string;
  
  // ─── Конфигурация ─────────────────────────────────────────────────────────
  
  /** Установить минимальный уровень логирования */
  setMinLevel(level: LogLevel): void;
  
  /** Включить/выключить логирование в консоль */
  setConsoleOutput(enabled: boolean): void;
  
  /** Включить/выключить сохранение в localStorage */
  setStorageEnabled(enabled: boolean): void;
}
```

### 6. IUndoService - Управление историей действий
```typescript
// src/lib/services/interfaces/IUndoService.ts

export interface IUndoService<T = any> {
  // ─── Основные операции ─────────────────────────────────────────────────────
  
  /** Добавить состояние в историю */
  push(state: T): void;
  
  /** Отменить последнее действие */
  undo(currentState: T): T | null;
  
  /** Повторить отмененное действие */
  redo(currentState: T): T | null;
  
  // ─── Проверки состояния ───────────────────────────────────────────────────
  
  /** Можно ли отменить действие */
  get canUndo(): boolean;
  
  /** Можно ли повторить действие */
  get canRedo(): boolean;
  
  // ─── Управление историей ──────────────────────────────────────────────────
  
  /** Очистить историю */
  clear(): void;
  
  /** Получить размер истории */
  get size(): number;
  
  /** Получить максимальный размер истории */
  get maxSize(): number;
  
  /** Установить максимальный размер истории */
  setMaxSize(size: number): void;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения истории */
  subscribe(listener: () => void): () => void;
}
```

### 7. IIKService - Сервис инверсной кинематики
```typescript
// src/lib/services/interfaces/IIKService.ts
import { Body25Index, JointPosition, PoseData } from '../../types/common';
import { SkeletonGraph } from '../../body25/SkeletonGraph';

export interface IIKService {
  // ─── Основные операции ─────────────────────────────────────────────────────
  
  /** Решить IK цепь с помощью FABRIK алгоритма */
  solveFABRIK(
    chain: Body25Index[],
    pose: PoseData,
    target: JointPosition,
    graph: SkeletonGraph,
    options?: {
      maxIterations?: number;
      tolerance?: number;
      constraints?: any;
    }
  ): PoseData;
  
  /** Решить IK для конкретного сустава */
  solveForJoint(
    joint: Body25Index,
    target: JointPosition,
    pose: PoseData,
    graph: SkeletonGraph
  ): PoseData;
  
  // ─── Вспомогательные методы ───────────────────────────────────────────────
  
  /** Получить IK цепь для сустава */
  getIKChainForJoint(joint: Body25Index): Body25Index[] | null;
  
  /** Проверить, входит ли сустав в IK цепь */
  isJointInIKChain(joint: Body25Index): boolean;
  
  /** Применить ограничения к решению */
  applyConstraints(
    pose: PoseData,
    constraints: Record<Body25Index, any>
  ): PoseData;
}
```

## Адаптеры для существующих сервисов

### 1. PoseServiceAdapter
```typescript
// src/lib/services/adapters/PoseServiceAdapter.ts
import { IPoseService } from '../interfaces/IPoseService';
import { poseService } from '../../../services/PoseService';

export class PoseServiceAdapter implements IPoseService {
  // Реализация всех методов IPoseService через существующий poseService
  getPoseData() {
    return poseService.getPoseData();
  }
  
  setPoseData(data) {
    poseService.setPoseData(data);
  }
  
  translate(dx, dy, dz) {
    poseService.translate(dx, dy, dz);
  }
  
  // ... остальные методы
}
```

### 2. CameraServiceAdapter
```typescript
// src/lib/services/adapters/CameraServiceAdapter.ts
import { ICameraService } from '../interfaces/ICameraService';
import { cameraService } from '../../../services/cameraService';

export class CameraServiceAdapter implements ICameraService {
  // Реализация всех методов ICameraService через существующий cameraService
  getState() {
    // Преобразование из внутреннего формата cameraService
  }
  
  setState(state) {
    // Преобразование во внутренний формат cameraService
  }
  
  // ... остальные методы
}
```

## Стратегия внедрения

### Этап 1: Создание интерфейсов
1. Создать директорию `src/lib/services/interfaces/`
2. Реализовать все интерфейсы из этого документа
3. Создать файл `index.ts` для экспорта всех интерфейсов

### Этап 2: Создание адаптеров
1. Создать директорию `src/lib/services/adapters/`
2. Реализовать адаптеры для существующих сервисов
3. Протестировать обратную совместимость

### Этап 3: Интеграция с DI контейнером
1. Обновить ContainerFactory для использования интерфейсов
2. Зарегистрировать адаптеры в контейнере
3. Протестировать работу через интерфейсы

### Этап 4: Миграция компонентов
1. Обновить компоненты для использования интерфейсов
2. Заменить прямые вызовы синглтонов на useService хуки
3. Протестировать каждую мигрированную компоненту

## Преимущества использования интерфейсов

### 1. Тестируемость
```typescript
// В тестах можно использовать моки
const mockPoseService: IPoseService = {
  getPoseData: jest.fn(),
  setPoseData: jest.fn(),
  // ...
};

// Или использовать реальную реализацию с тестовыми данными
const testPoseService = new PoseServiceAdapter();
```

### 2. Гибкость
- Легко заменить реализацию (например, для A/B тестирования)
- Возможность использовать разные реализации для разных платформ
- Простое добавление прокси-сервисов для логирования или кэширования

### 3. Декомпозиция
- Четкое разделение ответственности
- Возможность рефакторинга одной реализации без влияния на другие
- Упрощенное понимание зависимостей

### 4. Type Safety
- Компилятор проверяет соответствие контракту
- Автодополнение в IDE
- Защита от ошибок при рефакторинге

## Next Steps

1. **Создать структуру файлов интерфейсов**
2. **Реализовать адаптеры для существующих сервисов**
3. **Интегрировать с DI контейнером**
4. **Начать миграцию компонентов на использование интерфейсов**
