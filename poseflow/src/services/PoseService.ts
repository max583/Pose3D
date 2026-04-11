// PoseService - сервис для управления позой BODY_25
import { Body25Index, JointPosition, PoseData } from '../lib/body25/body25-types';
import { canvasLogger, errorLogger } from '../lib/logger';

export class PoseService {
  private poseData: PoseData;
  private listeners: Array<(data: PoseData) => void> = [];

  constructor() {
    this.poseData = this.createTPose();
  }

  /** Получить текущие данные позы */
  getPoseData(): PoseData {
    return { ...this.poseData };
  }

  /** Установить новые данные позы */
  setPoseData(data: PoseData): void {
    this.poseData = { ...data };
    this.notifyListeners();
  }

  /** Обновить позицию одной точки */
  updateJoint(index: Body25Index, position: JointPosition): void {
    try {
      this.poseData[index] = { ...position };
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
    return { ...this.poseData[index] };
  }

  /** Подписаться на изменения */
  subscribe(listener: (data: PoseData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** Уведомить подписчиков */
  private notifyListeners(): void {
    try {
      const data = this.getPoseData();
      this.listeners.forEach(listener => listener(data));
    } catch (error) {
      errorLogger.error('Failed to notify listeners', {
        error: error instanceof Error ? error.message : String(error),
        listenerCount: this.listeners.length,
      });
    }
  }

  /** Создать T-pose (поза по умолчанию) */
  createTPose(): PoseData {
    return {
      [Body25Index.NOSE]: { x: 0, y: 1.6, z: 0 },
      [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
      [Body25Index.RIGHT_SHOULDER]: { x: 0.3, y: 1.35, z: 0 },
      [Body25Index.RIGHT_ELBOW]: { x: 0.6, y: 1.2, z: 0 },
      [Body25Index.RIGHT_WRIST]: { x: 0.8, y: 1.0, z: 0 },
      [Body25Index.LEFT_SHOULDER]: { x: -0.3, y: 1.35, z: 0 },
      [Body25Index.LEFT_ELBOW]: { x: -0.6, y: 1.2, z: 0 },
      [Body25Index.LEFT_WRIST]: { x: -0.8, y: 1.0, z: 0 },
      [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
      [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.85, z: 0 },
      [Body25Index.RIGHT_KNEE]: { x: 0.15, y: 0.45, z: 0 },
      [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.05, z: 0 },
      [Body25Index.LEFT_HIP]: { x: -0.15, y: 0.85, z: 0 },
      [Body25Index.LEFT_KNEE]: { x: -0.15, y: 0.45, z: 0 },
      [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.05, z: 0 },
      [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.65, z: 0.1 },
      [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.65, z: 0.1 },
      [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.6, z: 0 },
      [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.6, z: 0 },
      [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.1 },
      [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.05 },
      [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: -0.1 },
      [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.0, z: 0.1 },
      [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.0, z: 0.05 },
      [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.0, z: -0.1 },
    };
  }

  /** Создать A-pose (руки вниз) */
  createAPose(): PoseData {
    const pose = this.createTPose();
    pose[Body25Index.RIGHT_ELBOW] = { x: 0.35, y: 0.9, z: 0 };
    pose[Body25Index.RIGHT_WRIST] = { x: 0.35, y: 0.6, z: 0 };
    pose[Body25Index.LEFT_ELBOW] = { x: -0.35, y: 0.9, z: 0 };
    pose[Body25Index.LEFT_WRIST] = { x: -0.35, y: 0.6, z: 0 };
    return pose;
  }

  /** Создать позу стоя (руки по швам) */
  createStandingPose(): PoseData {
    const pose = this.createAPose();
    pose[Body25Index.RIGHT_SHOULDER] = { x: 0.2, y: 1.35, z: 0 };
    pose[Body25Index.LEFT_SHOULDER] = { x: -0.2, y: 1.35, z: 0 };
    return pose;
  }

  /** Сбросить позу к T-pose */
  reset(): void {
    this.poseData = this.createTPose();
    this.notifyListeners();
  }

  /** Масштабировать позу */
  scale(factor: number): void {
    Object.keys(this.poseData).forEach(key => {
      const index = parseInt(key) as Body25Index;
      const joint = this.poseData[index];
      this.poseData[index] = {
        ...joint,
        x: joint.x * factor,
        y: joint.y * factor,
        z: joint.z * factor,
      };
    });
    this.notifyListeners();
  }

  /** Переместить позу */
  translate(offsetX: number, offsetY: number, offsetZ: number): void {
    Object.keys(this.poseData).forEach(key => {
      const index = parseInt(key) as Body25Index;
      const joint = this.poseData[index];
      this.poseData[index] = {
        ...joint,
        x: joint.x + offsetX,
        y: joint.y + offsetY,
        z: joint.z + offsetZ,
      };
    });
    this.notifyListeners();
  }
}

// Singleton
export const poseService = new PoseService();
