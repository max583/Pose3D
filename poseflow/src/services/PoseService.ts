// PoseService — управление позой BODY_25 с поддержкой undo/redo и FK/IK
import { Body25Index, JointPosition, ManipulationMode, PoseData } from '../lib/body25/body25-types';
import { SkeletonGraph } from '../lib/body25/SkeletonGraph';
import { UndoStack } from '../lib/UndoStack';
import { canvasLogger, errorLogger } from '../lib/logger';

// Снимок состояния всех скелетов (массив для будущего Step 9 — множественные фигуры)
type SkeletonsSnapshot = PoseData[];

export class PoseService {
  private skeletons: PoseData[];
  private activeSkeletonId: number;
  private undoStack: UndoStack<SkeletonsSnapshot>;
  private listeners: Array<(data: PoseData) => void> = [];
  private graph: SkeletonGraph;
  manipulationMode: ManipulationMode = 'fk';

  constructor() {
    this.skeletons = [this.createTPose()];
    this.activeSkeletonId = 0;
    this.undoStack = new UndoStack<SkeletonsSnapshot>(50);
    this.graph = new SkeletonGraph();
    this.graph.computeBoneLengths(this.skeletons[0]);
  }

  // ─── Snapshot helpers ─────────────────────────────────────────────────────

  private snapshot(): SkeletonsSnapshot {
    return this.skeletons.map(s => ({ ...s }));
  }

  private restoreSnapshot(snap: SkeletonsSnapshot): void {
    this.skeletons = snap.map(s => ({ ...s }));
    if (this.activeSkeletonId >= this.skeletons.length) {
      this.activeSkeletonId = 0;
    }
  }

  // ─── Undo / Redo ───────────────────────────────────────────────────────────

  undo(): void {
    const prev = this.undoStack.undo(this.snapshot());
    if (!prev) return;
    this.restoreSnapshot(prev);
    this.notifyListeners();
    canvasLogger.debug('Undo applied');
  }

  redo(): void {
    const next = this.undoStack.redo(this.snapshot());
    if (!next) return;
    this.restoreSnapshot(next);
    this.notifyListeners();
    canvasLogger.debug('Redo applied');
  }

  get canUndo(): boolean { return this.undoStack.canUndo; }
  get canRedo(): boolean { return this.undoStack.canRedo; }

  // ─── Active skeleton access ────────────────────────────────────────────────

  /** Текущие данные активного скелета */
  getPoseData(): PoseData {
    return { ...this.skeletons[this.activeSkeletonId] };
  }

  /** Заменить позу активного скелета (с сохранением в undo) */
  setPoseData(data: PoseData): void {
    this.undoStack.push(this.snapshot());
    this.skeletons[this.activeSkeletonId] = { ...data };
    this.graph.computeBoneLengths(data);
    this.notifyListeners();
  }

  /** Доступ к графу для FK/IK */
  getGraph(): SkeletonGraph { return this.graph; }

  /** Обновить позицию одной точки (с сохранением в undo, с FK/IK) */
  updateJoint(index: Body25Index, position: JointPosition): void {
    try {
      this.undoStack.push(this.snapshot());
      if (this.manipulationMode === 'fk') {
        const updated = this.graph.applyFK(this.skeletons[this.activeSkeletonId], index, position);
        this.skeletons[this.activeSkeletonId] = updated;
      } else {
        // IK реализуется в Step 4; пока fallback на прямое обновление
        this.skeletons[this.activeSkeletonId][index] = { ...position };
      }
      this.notifyListeners();
    } catch (error) {
      errorLogger.error('Failed to update joint position', {
        index,
        position,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** Получить позицию точки */
  getJointPosition(index: Body25Index): JointPosition {
    return { ...this.skeletons[this.activeSkeletonId][index] };
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: (data: PoseData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    try {
      const data = this.getPoseData();
      this.listeners.forEach(l => l(data));
    } catch (error) {
      errorLogger.error('Failed to notify listeners', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ─── Pose helpers ──────────────────────────────────────────────────────────

  reset(): void {
    this.undoStack.push(this.snapshot());
    this.skeletons[this.activeSkeletonId] = this.createTPose();
    this.notifyListeners();
  }

  scale(factor: number): void {
    this.undoStack.push(this.snapshot());
    const pose = this.skeletons[this.activeSkeletonId];
    Object.keys(pose).forEach(key => {
      const idx = parseInt(key) as Body25Index;
      const j = pose[idx];
      pose[idx] = { ...j, x: j.x * factor, y: j.y * factor, z: j.z * factor };
    });
    this.notifyListeners();
  }

  translate(offsetX: number, offsetY: number, offsetZ: number): void {
    this.undoStack.push(this.snapshot());
    const pose = this.skeletons[this.activeSkeletonId];
    Object.keys(pose).forEach(key => {
      const idx = parseInt(key) as Body25Index;
      const j = pose[idx];
      pose[idx] = { ...j, x: j.x + offsetX, y: j.y + offsetY, z: j.z + offsetZ };
    });
    this.notifyListeners();
  }

  // ─── T-Pose / A-Pose / Standing ───────────────────────────────────────────

  createTPose(): PoseData {
    return {
      [Body25Index.NOSE]:            { x: 0,     y: 1.6,  z: 0 },
      [Body25Index.NECK]:            { x: 0,     y: 1.4,  z: 0 },
      [Body25Index.RIGHT_SHOULDER]:  { x: 0.3,   y: 1.35, z: 0 },
      [Body25Index.RIGHT_ELBOW]:     { x: 0.6,   y: 1.2,  z: 0 },
      [Body25Index.RIGHT_WRIST]:     { x: 0.8,   y: 1.0,  z: 0 },
      [Body25Index.LEFT_SHOULDER]:   { x: -0.3,  y: 1.35, z: 0 },
      [Body25Index.LEFT_ELBOW]:      { x: -0.6,  y: 1.2,  z: 0 },
      [Body25Index.LEFT_WRIST]:      { x: -0.8,  y: 1.0,  z: 0 },
      [Body25Index.MID_HIP]:         { x: 0,     y: 0.9,  z: 0 },
      [Body25Index.RIGHT_HIP]:       { x: 0.15,  y: 0.85, z: 0 },
      [Body25Index.RIGHT_KNEE]:      { x: 0.15,  y: 0.45, z: 0 },
      [Body25Index.RIGHT_ANKLE]:     { x: 0.15,  y: 0.05, z: 0 },
      [Body25Index.LEFT_HIP]:        { x: -0.15, y: 0.85, z: 0 },
      [Body25Index.LEFT_KNEE]:       { x: -0.15, y: 0.45, z: 0 },
      [Body25Index.LEFT_ANKLE]:      { x: -0.15, y: 0.05, z: 0 },
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

  createAPose(): PoseData {
    const pose = this.createTPose();
    pose[Body25Index.RIGHT_ELBOW] = { x: 0.35, y: 0.9, z: 0 };
    pose[Body25Index.RIGHT_WRIST] = { x: 0.35, y: 0.6, z: 0 };
    pose[Body25Index.LEFT_ELBOW]  = { x: -0.35, y: 0.9, z: 0 };
    pose[Body25Index.LEFT_WRIST]  = { x: -0.35, y: 0.6, z: 0 };
    return pose;
  }

  createStandingPose(): PoseData {
    const pose = this.createAPose();
    pose[Body25Index.RIGHT_SHOULDER] = { x: 0.2,  y: 1.35, z: 0 };
    pose[Body25Index.LEFT_SHOULDER]  = { x: -0.2, y: 1.35, z: 0 };
    return pose;
  }
}

// Singleton
export const poseService = new PoseService();
