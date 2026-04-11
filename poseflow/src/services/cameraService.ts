// cameraService.ts - Сервис для управления камерой
import { Vector3, Camera } from 'three';
import { canvasLogger } from '../lib/logger';

export type CameraView = 'front' | 'back' | 'side' | 'sideLeft' | 'threeQuarterFrontRight' | 'threeQuarterFrontLeft' | 'threeQuarterBackRight' | 'threeQuarterBackLeft' | 'top' | 'reset';

interface CameraState {
  position: Vector3;
  target: Vector3;
  label: string;
}

const CAMERA_VIEWS: Record<CameraView, CameraState> = {
  front: {
    position: new Vector3(0, 1.5, 5),
    target: new Vector3(0, 1, 0),
    label: 'Front',
  },
  back: {
    position: new Vector3(0, 1.5, -5),
    target: new Vector3(0, 1, 0),
    label: 'Back',
  },
  side: {
    position: new Vector3(5, 1.5, 0),
    target: new Vector3(0, 1, 0),
    label: 'Right Side',
  },
  sideLeft: {
    position: new Vector3(-5, 1.5, 0),
    target: new Vector3(0, 1, 0),
    label: 'Left Side',
  },
  threeQuarterFrontRight: {
    position: new Vector3(3.5, 2.5, 3.5),
    target: new Vector3(0, 1, 0),
    label: '3/4 F-R',
  },
  threeQuarterFrontLeft: {
    position: new Vector3(-3.5, 2.5, 3.5),
    target: new Vector3(0, 1, 0),
    label: '3/4 F-L',
  },
  threeQuarterBackRight: {
    position: new Vector3(3.5, 2.5, -3.5),
    target: new Vector3(0, 1, 0),
    label: '3/4 B-R',
  },
  threeQuarterBackLeft: {
    position: new Vector3(-3.5, 2.5, -3.5),
    target: new Vector3(0, 1, 0),
    label: '3/4 B-L',
  },
  top: {
    position: new Vector3(0, 5, 0.01),
    target: new Vector3(0, 0, 0),
    label: 'Top',
  },
  reset: {
    position: new Vector3(0, 2, 5),
    target: new Vector3(0, 1, 0),
    label: 'Reset',
  },
};

type CameraChangeListener = (view: CameraView) => void;

class CameraService {
  private camera: Camera | null = null;
  private listeners: CameraChangeListener[] = [];
  private isAnimating = false;
  private animationDurationMs = 500;

  /** Зарегистрировать камеру */
  registerCamera(camera: Camera): void {
    this.camera = camera;
    canvasLogger.info('Camera registered');
  }

  setAnimationDurationMs(ms: number): void {
    this.animationDurationMs = Math.min(2000, Math.max(200, Math.round(ms)));
  }

  getAnimationDurationMs(): number {
    return this.animationDurationMs;
  }

  /** Переключить вид камеры */
  switchTo(view: CameraView): void {
    if (!this.camera) {
      canvasLogger.error('Camera not registered');
      return;
    }

    if (this.isAnimating) {
      canvasLogger.warn('Animation in progress, skipping');
      return;
    }

    const targetState = CAMERA_VIEWS[view];
    if (!targetState) {
      canvasLogger.error(`Unknown camera view: ${view}`);
      return;
    }

    this.animateCamera(targetState.position, targetState.target, this.animationDurationMs);
    this.notifyListeners(view);
  }

  /** Анимация перемещения камеры */
  private animateCamera(targetPosition: Vector3, targetLookAt: Vector3, duration: number): void {
    if (!this.camera) return;

    this.isAnimating = true;

    const startPosition = this.camera.position.clone();
    const direction = new Vector3();
    this.camera.getWorldDirection(direction);
    const startTarget = this.camera.position.clone().add(direction.multiplyScalar(5));

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.camera!.position.lerpVectors(startPosition, targetPosition, eased);

      const currentLookAt = new Vector3().lerpVectors(startTarget, targetLookAt, eased);
      this.camera!.lookAt(currentLookAt);
      this.camera!.updateProjectionMatrix();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        canvasLogger.debug('Camera animation completed');
      }
    };

    animate();
  }

  /** Подписаться на изменения камеры */
  subscribe(listener: CameraChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** Уведомить подписчиков */
  private notifyListeners(view: CameraView): void {
    this.listeners.forEach(listener => listener(view));
  }
}

export const cameraService = new CameraService();
