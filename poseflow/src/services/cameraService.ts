// cameraService.ts - Сервис для управления камерой
import { Vector3, Camera } from 'three';
import { canvasLogger } from '../lib/logger';
import { CameraState as CameraStateType } from '../lib/types/common';

export type CameraView = 'front' | 'back' | 'side' | 'sideLeft' | 'threeQuarterFrontRight' | 'threeQuarterFrontLeft' | 'threeQuarterBackRight' | 'threeQuarterBackLeft' | 'top' | 'reset';


const CAMERA_VIEWS: Record<CameraView, { position: Vector3; target: Vector3; label: string }> = {
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

export class CameraService {
  private camera: Camera | null = null;
  private listeners: CameraChangeListener[] = [];
  private _isAnimating = false;
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

    if (this._isAnimating) {
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

    this._isAnimating = true;

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
      // Type guard for PerspectiveCamera/OrthographicCamera
      if ('updateProjectionMatrix' in this.camera!) {
        (this.camera as any).updateProjectionMatrix();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this._isAnimating = false;
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

  // ─── ICameraService interface methods ─────────────────────────────────────

  getCamera(): Camera | null {
    return this.camera;
  }

  getState(): CameraStateType {
    if (!this.camera) {
      return {
        position: new Vector3(),
        target: new Vector3(),
        fov: 50,
      };
    }
    const direction = new Vector3();
    this.camera.getWorldDirection(direction);
    const target = this.camera.position.clone().add(direction.multiplyScalar(5));
    const fov = ('fov' in this.camera) ? (this.camera as any).fov : 50;
    return {
      position: this.camera.position.clone(),
      target,
      fov,
    };
  }

  setState(state: CameraStateType): void {
    if (!this.camera) return;
    this.camera.position.copy(state.position);
    this.camera.lookAt(state.target);
    if ('updateProjectionMatrix' in this.camera) {
      (this.camera as any).updateProjectionMatrix();
    }
  }

  getPosition(): Vector3 {
    if (!this.camera) return new Vector3();
    return this.camera.position.clone();
  }

  setPosition(x: number, y: number, z: number): void {
    if (!this.camera) return;
    this.camera.position.set(x, y, z);
    if ('updateProjectionMatrix' in this.camera) {
      (this.camera as any).updateProjectionMatrix();
    }
  }

  lookAt(target: Vector3): void {
    if (!this.camera) return;
    this.camera.lookAt(target);
    if ('updateProjectionMatrix' in this.camera) {
      (this.camera as any).updateProjectionMatrix();
    }
  }

  reset(): void {
    this.switchTo('reset');
  }

  getAvailableViews(): CameraView[] {
    return Object.keys(CAMERA_VIEWS) as CameraView[];
  }

  getViewLabel(view: CameraView): string {
    return CAMERA_VIEWS[view]?.label ?? view;
  }

  translate(dx: number, dy: number, dz: number): void {
    if (!this.camera) return;
    this.camera.position.x += dx;
    this.camera.position.y += dy;
    this.camera.position.z += dz;
    if ('updateProjectionMatrix' in this.camera) {
      (this.camera as any).updateProjectionMatrix();
    }
  }

  rotate(dx: number, dy: number): void {
    if (!this.camera) return;
    // Simple orbit rotation around target
    const direction = new Vector3();
    this.camera.getWorldDirection(direction);
    const dist = this.camera.position.distanceTo(new Vector3().copy(this.camera.position).add(direction));
    const spherical = {
      theta: Math.atan2(direction.x, direction.z),
      phi: Math.acos(direction.y / dist),
    };
    spherical.theta += dx;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy));
    const newDir = new Vector3(
      Math.sin(spherical.phi) * Math.sin(spherical.theta),
      Math.cos(spherical.phi),
      Math.sin(spherical.phi) * Math.cos(spherical.theta),
    ).normalize();
    const target = this.camera.position.clone().add(newDir.multiplyScalar(dist));
    this.camera.position.copy(target.sub(newDir.multiplyScalar(dist * 2)));
    this.lookAt(target);
  }

  zoom(delta: number): void {
    if (!this.camera) return;
    const direction = new Vector3();
    this.camera.getWorldDirection(direction);
    this.camera.position.add(direction.multiplyScalar(delta));
    if ('updateProjectionMatrix' in this.camera) {
      (this.camera as any).updateProjectionMatrix();
    }
  }

  isAnimating(): boolean {
    return this._isAnimating;
  }
}

// Синглтон экземпляр CameraService для обратной совместимости
export const cameraService = new CameraService();
