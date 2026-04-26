// src/services/RigService.ts
// Сервис управления SkeletonRig — первичным источником истины позы.
// PoseData (мировые позиции) — производное, вычисляемое через resolveSkeleton().
//
// RigService инкапсулирует:
//   - состояние SkeletonRig
//   - undo/redo стек (снимки SkeletonRig)
//   - кэш PoseData (инвалидируется при изменении rig)
//   - подписки на изменения

import { Vector3 } from 'three';
import { PoseData } from '../lib/body25/body25-types';
import { SkeletonRig, createDefaultRig, cloneRig } from '../lib/rig/SkeletonRig';
import { resolveSkeletonPose } from '../lib/rig/resolveSkeleton';
import { rigFromPose } from '../lib/rig/inverseFK';
import { UndoStack } from '../lib/UndoStack';
import { MIRROR_PAIRS } from '../lib/body25/body25-mirror';
import { Body25Index } from '../lib/body25/body25-types';

type RigListener = (pose: PoseData) => void;

export class RigService {
  private rig: SkeletonRig;
  private undoStack: UndoStack<SkeletonRig>;
  private poseCache: PoseData | null = null;
  private listeners: RigListener[] = [];

  constructor() {
    this.rig = createDefaultRig();
    this.undoStack = new UndoStack<SkeletonRig>(50);
  }

  // ─── Rig access ────────────────────────────────────────────────────────────

  /** Получить текущий SkeletonRig (только чтение). */
  getRig(): Readonly<SkeletonRig> {
    return this.rig;
  }

  /** Заменить rig (с undo-снимком). */
  setRig(newRig: SkeletonRig): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = newRig;
    this.poseCache = null;
    this.notifyListeners();
  }

  // ─── PoseData (производное) ────────────────────────────────────────────────

  /** Получить текущую позу (кэшируется до следующего изменения rig). */
  getPoseData(): PoseData {
    if (!this.poseCache) {
      this.poseCache = resolveSkeletonPose(this.rig);
    }
    return this.poseCache;
  }

  // ─── Load from PoseData (для пресетов, mirror, reset) ─────────────────────

  /**
   * Загрузить позу из PoseData.
   * Восстанавливает SkeletonRig через inverseFK.
   */
  loadPose(pose: PoseData): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = rigFromPose(pose);
    this.poseCache = null;
    this.notifyListeners();
  }

  // ─── Pose helpers ──────────────────────────────────────────────────────────

  /** Сбросить в T-позу (default rig). */
  resetPose(): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = createDefaultRig();
    this.poseCache = null;
    this.notifyListeners();
  }

  /** Отразить позу по оси X (mirror). */
  mirrorPose(): void {
    const currentPose = this.getPoseData();
    const mirrored = { ...currentPose };
    const center = currentPose[Body25Index.MID_HIP]?.x ?? 0;

    for (const [right, left] of MIRROR_PAIRS) {
      const rPos = currentPose[right];
      const lPos = currentPose[left];
      if (rPos && lPos) {
        mirrored[right] = { ...lPos, x: 2 * center - lPos.x };
        mirrored[left]  = { ...rPos, x: 2 * center - rPos.x };
      }
    }

    this.undoStack.push(cloneRig(this.rig));
    this.rig = rigFromPose(mirrored as PoseData);
    this.poseCache = null;
    this.notifyListeners();
  }

  /**
   * Масштабировать позу (масштабирует rest-позу + rootPosition).
   * Прямая операция — не требует inverseFK.
   */
  scalePose(factor: number): void {
    const newRig = cloneRig(this.rig);
    // Масштабируем rootPosition
    newRig.rootPosition.multiplyScalar(factor);
    // Масштабируем локальные смещения rest-позы (фиксированные длины костей пропорционально меняются)
    const scaledOffsets = new Map<Body25Index, Vector3>();
    for (const [k, v] of newRig.rest.localOffsets) {
      scaledOffsets.set(k, v.clone().multiplyScalar(factor));
    }
    const scaledBoneLengths = new Map<string, number>();
    for (const [k, v] of newRig.rest.boneLengths) {
      scaledBoneLengths.set(k, v * factor);
    }
    newRig.rest = { localOffsets: scaledOffsets, boneLengths: scaledBoneLengths };
    // Масштабируем длины сегментов виртуальных цепочек
    newRig.spine = { ...newRig.spine, segmentLength: newRig.spine.segmentLength * factor,
      rotations: newRig.spine.rotations };
    newRig.neck = { ...newRig.neck, segmentLength: newRig.neck.segmentLength * factor,
      rotations: newRig.neck.rotations };

    this.undoStack.push(cloneRig(this.rig));
    this.rig = newRig;
    this.poseCache = null;
    this.notifyListeners();
  }

  /**
   * Переместить всю позу.
   * Прямая операция — сдвигает только rootPosition, rotations не меняются.
   */
  translatePose(offsetX: number, offsetY: number, offsetZ: number): void {
    const newRig = cloneRig(this.rig);
    newRig.rootPosition.x += offsetX;
    newRig.rootPosition.y += offsetY;
    newRig.rootPosition.z += offsetZ;

    this.undoStack.push(cloneRig(this.rig));
    this.rig = newRig;
    this.poseCache = null;
    this.notifyListeners();
  }

  // ─── Undo / Redo ───────────────────────────────────────────────────────────

  undo(): void {
    const prev = this.undoStack.undo(cloneRig(this.rig));
    if (!prev) return;
    this.rig = prev;
    this.poseCache = null;
    this.notifyListeners();
  }

  redo(): void {
    const next = this.undoStack.redo(cloneRig(this.rig));
    if (!next) return;
    this.rig = next;
    this.poseCache = null;
    this.notifyListeners();
  }

  get canUndo(): boolean { return this.undoStack.canUndo; }
  get canRedo(): boolean { return this.undoStack.canRedo; }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: RigListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const data = this.getPoseData();
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  dispose(): void {
    this.listeners = [];
  }
}
