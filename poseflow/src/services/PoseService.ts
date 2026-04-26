// PoseService — совместимая обёртка над RigService.
// После перехода на rotation-tree архитектуру PoseData является производным
// от SkeletonRig. Этот класс предоставляет совместимый API для Skeleton3D,
// ExportService, пресетов, mirror, undo/redo.
//
// Методы updateJoint, setJointPosition, toggleJointLink, setManipulationMode
// удалены — управление суставами теперь через контроллеры (Stage 1+).

import { Body25Index, PoseData } from '../lib/body25/body25-types';
import { RigService } from './RigService';

export class PoseService {
  private rigService: RigService;

  constructor(rigService: RigService) {
    this.rigService = rigService;
  }

  // ─── Undo / Redo ───────────────────────────────────────────────────────────

  undo(): void { this.rigService.undo(); }
  redo(): void { this.rigService.redo(); }

  get canUndo(): boolean { return this.rigService.canUndo; }
  get canRedo(): boolean { return this.rigService.canRedo; }

  // ─── Active pose access ────────────────────────────────────────────────────

  /** Текущие данные позы (производное от SkeletonRig). */
  getPoseData(): PoseData {
    return this.rigService.getPoseData();
  }

  /** Заменить позу (конвертируется в SkeletonRig через inverseFK). */
  setPoseData(data: PoseData): void {
    this.rigService.loadPose(data);
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: (data: PoseData) => void): () => void {
    return this.rigService.subscribe(listener);
  }

  // ─── Pose helpers ──────────────────────────────────────────────────────────

  mirrorPose(): void { this.rigService.mirrorPose(); }
  reset(): void { this.rigService.resetPose(); }
  scale(factor: number): void { this.rigService.scalePose(factor); }
  translate(x: number, y: number, z: number): void { this.rigService.translatePose(x, y, z); }

  // ─── Skeleton count (совместимость Step 9) ─────────────────────────────────
  // Multiple skeleton support будет добавлен позже через отдельный сервис.

  getSkeletonCount(): number { return 1; }
  getActiveSkeletonId(): number { return 0; }

  // ─── Pose presets / creation ───────────────────────────────────────────────

  createTPose(): PoseData {
    return {
      [Body25Index.NOSE]:            { x: 0,     y: 1.6,  z: 0 },
      [Body25Index.NECK]:            { x: 0,     y: 1.4,  z: 0 },
      [Body25Index.RIGHT_SHOULDER]:  { x: 0.183,  y: 1.35, z: 0 },
      [Body25Index.RIGHT_ELBOW]:     { x: 0.47,   y: 1.35, z: 0 },
      [Body25Index.RIGHT_WRIST]:     { x: 0.71,   y: 1.35, z: 0 },
      [Body25Index.LEFT_SHOULDER]:   { x: -0.183, y: 1.35, z: 0 },
      [Body25Index.LEFT_ELBOW]:      { x: -0.47,  y: 1.35, z: 0 },
      [Body25Index.LEFT_WRIST]:      { x: -0.71,  y: 1.35, z: 0 },
      [Body25Index.MID_HIP]:         { x: 0,      y: 0.9,  z: 0 },
      [Body25Index.RIGHT_HIP]:       { x: 0.15,   y: 0.85, z: 0 },
      [Body25Index.RIGHT_KNEE]:      { x: 0.15,   y: 0.42, z: 0 },
      [Body25Index.RIGHT_ANKLE]:     { x: 0.15,   y: 0.05, z: 0 },
      [Body25Index.LEFT_HIP]:        { x: -0.15,  y: 0.85, z: 0 },
      [Body25Index.LEFT_KNEE]:       { x: -0.15,  y: 0.42, z: 0 },
      [Body25Index.LEFT_ANKLE]:      { x: -0.15,  y: 0.05, z: 0 },
      [Body25Index.RIGHT_EYE]:       { x: 0.05,  y: 1.65, z: 0.1 },
      [Body25Index.LEFT_EYE]:        { x: -0.05, y: 1.65, z: 0.1 },
      [Body25Index.RIGHT_EAR]:       { x: 0.1,   y: 1.6,  z: 0 },
      [Body25Index.LEFT_EAR]:        { x: -0.1,  y: 1.6,  z: 0 },
      [Body25Index.LEFT_BIG_TOE]:    { x: -0.2,  y: 0.0,  z: 0.1 },
      [Body25Index.LEFT_SMALL_TOE]:  { x: -0.25, y: 0.0,  z: 0.05 },
      [Body25Index.LEFT_HEEL]:       { x: -0.15, y: 0.0,  z: -0.1 },
      [Body25Index.RIGHT_BIG_TOE]:   { x: 0.2,   y: 0.0,  z: 0.1 },
      [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25,  y: 0.0,  z: 0.05 },
      [Body25Index.RIGHT_HEEL]:      { x: 0.15,  y: 0.0,  z: -0.1 },
    };
  }
}

// Синглтон: создаётся в DI container (src/lib/di/setup.ts).
// Не экспортируем прямой синглтон — используется через ServiceContext.
