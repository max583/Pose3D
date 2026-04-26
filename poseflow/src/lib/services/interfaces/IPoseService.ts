// src/lib/services/interfaces/IPoseService.ts
// Интерфейс сервиса управления позой (rotation-tree архитектура)
// PoseData — производное от SkeletonRig, управляемого через RigService.

import { PoseData } from '../../body25/body25-types';

export interface IPoseService {
  // ─── Основные операции ─────────────────────────────────────────────────────

  /** Получить текущую позу (производное от SkeletonRig). */
  getPoseData(): PoseData;

  /** Установить новую позу (конвертируется через inverseFK). */
  setPoseData(data: PoseData): void;

  /** Сдвинуть всю позу */
  translate(dx: number, dy: number, dz: number): void;

  /** Масштабировать позу */
  scale(factor: number): void;

  /** Отразить позу по оси X */
  mirrorPose(): void;

  /** Сбросить позу к T-pose */
  reset(): void;

  // ─── Undo/Redo ────────────────────────────────────────────────────────────

  undo(): void;
  redo(): void;
  get canUndo(): boolean;
  get canRedo(): boolean;

  // ─── Подписки на изменения ────────────────────────────────────────────────

  subscribe(listener: (data: PoseData) => void): () => void;

  // ─── Вспомогательные методы ───────────────────────────────────────────────

  createTPose(): PoseData;

  // ─── Multiple skeletons (совместимость) ──────────────────────────────────

  getSkeletonCount(): number;
  getActiveSkeletonId(): number;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  dispose?(): void;
}
