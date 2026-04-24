// src/lib/services/interfaces/ICameraService.ts
// Интерфейс сервиса управления камерой

import { Vector3, Camera } from 'three';
import { CameraState } from '../../types/common';

export type CameraView = 'front' | 'back' | 'side' | 'sideLeft' | 'threeQuarterFrontRight' | 'threeQuarterFrontLeft' | 'threeQuarterBackRight' | 'threeQuarterBackLeft' | 'top' | 'reset';

export interface ICameraService {
  // ─── Основные операции ─────────────────────────────────────────────────────
  
  /** Зарегистрировать камеру Three.js */
  registerCamera(camera: Camera): void;
  
  /** Получить текущую камеру */
  getCamera(): Camera | null;
  
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
  
  // ─── Предустановленные виды ───────────────────────────────────────────────
  
  /** Переключить на предустановленный вид камеры */
  switchTo(view: CameraView): void;
  
  /** Получить список доступных видов камеры */
  getAvailableViews(): CameraView[];
  
  /** Получить метку для вида камеры */
  getViewLabel(view: CameraView): string;
  
  // ─── Трансформации ────────────────────────────────────────────────────────
  
  /** Сдвинуть камеру */
  translate(dx: number, dy: number, dz: number): void;
  
  /** Повернуть камеру */
  rotate(dx: number, dy: number): void;
  
  /** Приблизить/отдалить */
  zoom(delta: number): void;
  
  // ─── Анимация ─────────────────────────────────────────────────────────────
  
  /** Установить длительность анимации в миллисекундах */
  setAnimationDurationMs(ms: number): void;
  
  /** Получить длительность анимации в миллисекундах */
  getAnimationDurationMs(): number;
  
  /** Проверить, выполняется ли анимация */
  isAnimating(): boolean;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения камеры */
  subscribe(listener: (view: CameraView) => void): () => void;
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  
  /** Очистить ресурсы (опционально) */
  dispose?(): void;
}