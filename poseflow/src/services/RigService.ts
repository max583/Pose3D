// src/services/RigService.ts
// Сервис управления SkeletonRig — первичным источником истины позы.
// PoseData (мировые позиции) — производное, вычисляемое через resolveSkeleton().
//
// RigService инкапсулирует:
//   - состояние SkeletonRig
//   - undo/redo стек (снимки SkeletonRig)
//   - кэш PoseData (инвалидируется при изменении rig)
//   - подписки на изменения

import { Euler, Quaternion, Vector3 } from 'three';
import { PoseData } from '../lib/body25/body25-types';
import { SkeletonRig, createDefaultRig, cloneRig } from '../lib/rig/SkeletonRig';
import { resolveSkeleton, VirtualChainPositions } from '../lib/rig/resolveSkeleton';
import { rigFromPose } from '../lib/rig/inverseFK';
import { setBend } from '../lib/rig/VirtualChain';
import { UndoStack } from '../lib/UndoStack';
import { MIRROR_PAIRS } from '../lib/body25/body25-mirror';
import { Body25Index } from '../lib/body25/body25-types';

type RigListener = (pose: PoseData) => void;

export class RigService {
  private rig: SkeletonRig;
  private undoStack: UndoStack<SkeletonRig>;
  private resolvedCache: { pose: PoseData; virtualPositions: VirtualChainPositions } | null = null;
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
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── PoseData (производное) ────────────────────────────────────────────────

  /** Получить текущую позу (кэшируется до следующего изменения rig). */
  getPoseData(): PoseData {
    return this.getResolved().pose;
  }

  /** Получить промежуточные позиции сегментов позвоночника и шеи. */
  getVirtualPositions(): VirtualChainPositions {
    return this.getResolved().virtualPositions;
  }

  private getResolved() {
    if (!this.resolvedCache) {
      this.resolvedCache = resolveSkeleton(this.rig);
    }
    return this.resolvedCache;
  }

  // ─── Load from PoseData (для пресетов, mirror, reset) ─────────────────────

  /**
   * Загрузить позу из PoseData.
   * Восстанавливает SkeletonRig через inverseFK.
   */
  loadPose(pose: PoseData): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = rigFromPose(pose);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Pose helpers ──────────────────────────────────────────────────────────

  /** Сбросить в T-позу (default rig). */
  resetPose(): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = createDefaultRig();
    this.resolvedCache = null;
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
    this.resolvedCache = null;
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
    this.resolvedCache = null;
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
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Gizmo drag operations (без undo-снимка — beginDrag() вызывается перед серией) ──

  /**
   * Начать drag-операцию: сохранить undo-снимок текущего rig.
   * Вызывать один раз в onPointerDown гизмо.
   */
  beginDrag(): void {
    this.undoStack.push(cloneRig(this.rig));
  }

  /** Переместить таз на дельту (мировые координаты). */
  applyPelvisTranslate(dx: number, dy: number, dz: number): void {
    this.rig.rootPosition.x += dx;
    this.rig.rootPosition.y += dy;
    this.rig.rootPosition.z += dz;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Повернуть таз вокруг мировой оси.
   * @param axis — 'x' | 'y' | 'z'
   * @param angle — угол в радианах (delta)
   */
  applyPelvisRotate(axis: 'x' | 'y' | 'z', angle: number): void {
    const axisVec =
      axis === 'x' ? new Vector3(1, 0, 0) :
      axis === 'y' ? new Vector3(0, 1, 0) :
                     new Vector3(0, 0, 1);
    const q = new Quaternion().setFromAxisAngle(axisVec, angle);
    // Premultiply: поворот в мировом пространстве
    this.rig.rootRotation.premultiply(q);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить изгиб позвоночника.
   * @param deltaX — дельта наклона вперёд/назад (рад)
   * @param deltaZ — дельта бокового наклона (рад)
   */
  applySpineBend(deltaX: number, deltaZ: number): void {
    const angles = this.rig.spineAngles;
    const maxBendX = Math.PI / 4;          // ±45° вперёд/назад
    const maxBendZ = 15 * Math.PI / 180;   // ±15° в стороны
    angles.bendX = clamp(angles.bendX + deltaX, -maxBendX, maxBendX);
    angles.bendZ = clamp(angles.bendZ + deltaZ, -maxBendZ, maxBendZ);
    this.rig.spine = setBend(this.rig.spine, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить скручивание позвоночника. Ограничение: ±45°.
   * @param delta — дельта угла скручивания (рад)
   */
  applySpineTwist(delta: number): void {
    const angles = this.rig.spineAngles;
    const maxTwist = Math.PI / 4; // ±45°
    angles.twistY = clamp(angles.twistY + delta, -maxTwist, maxTwist);
    this.rig.spine = setBend(this.rig.spine, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить изгиб шеи.
   * @param deltaX — дельта наклона вперёд/назад (рад), лимит ±45°
   * @param deltaZ — дельта бокового наклона (рад), лимит ±30°
   */
  applyNeckBend(deltaX: number, deltaZ: number): void {
    const angles = this.rig.neckAngles;
    const maxBendX = Math.PI / 4;          // ±45°
    const maxBendZ = 30 * Math.PI / 180;   // ±30°
    angles.bendX = clamp(angles.bendX + deltaX, -maxBendX, maxBendX);
    angles.bendZ = clamp(angles.bendZ + deltaZ, -maxBendZ, maxBendZ);
    this.rig.neck = setBend(this.rig.neck, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить скручивание шеи. Ограничение: ±45°.
   * @param delta — дельта угла скручивания (рад)
   */
  applyNeckTwist(delta: number): void {
    const angles = this.rig.neckAngles;
    const maxTwist = Math.PI / 4; // ±45°
    angles.twistY = clamp(angles.twistY + delta, -maxTwist, maxTwist);
    this.rig.neck = setBend(this.rig.neck, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Head rotation ────────────────────────────────────────────────────────

  /**
   * Обновить rig.headRotation из rig.headAngles.
   * Порядок Euler: YXZ (сначала yaw, потом pitch, потом roll).
   */
  private updateHeadRotation(): void {
    const { pitch, yaw, roll } = this.rig.headAngles;
    this.rig.headRotation = new Quaternion().setFromEuler(
      new Euler(pitch, yaw, roll, 'YXZ'),
    );
  }

  /**
   * Кивок вперёд/назад.
   * Вперёд (подбородок к груди) +45°, назад (голова запрокинута) −30°.
   * @param delta — дельта угла (рад)
   */
  applyHeadPitch(delta: number): void {
    const angles = this.rig.headAngles;
    const maxForward = 45 * Math.PI / 180;  // +45°
    const maxBack    = 30 * Math.PI / 180;  // −30°
    angles.pitch = clamp(angles.pitch + delta, -maxBack, maxForward);
    this.updateHeadRotation();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Поворот головы влево/вправо. Лимит ±80°.
   * @param delta — дельта угла (рад)
   */
  applyHeadYaw(delta: number): void {
    const angles = this.rig.headAngles;
    const maxYaw = 80 * Math.PI / 180;
    angles.yaw = clamp(angles.yaw + delta, -maxYaw, maxYaw);
    this.updateHeadRotation();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Боковой наклон головы. Лимит ±30°.
   * @param delta — дельта угла (рад)
   */
  applyHeadRoll(delta: number): void {
    const angles = this.rig.headAngles;
    const maxRoll = 30 * Math.PI / 180;
    angles.roll = clamp(angles.roll + delta, -maxRoll, maxRoll);
    this.updateHeadRotation();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Undo / Redo ───────────────────────────────────────────────────────────

  undo(): void {
    const prev = this.undoStack.undo(cloneRig(this.rig));
    if (!prev) return;
    this.rig = prev;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  redo(): void {
    const next = this.undoStack.redo(cloneRig(this.rig));
    if (!next) return;
    this.rig = next;
    this.resolvedCache = null;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
