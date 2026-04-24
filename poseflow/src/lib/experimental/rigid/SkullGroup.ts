// src/lib/experimental/rigid/SkullGroup.ts
// Модуль для жесткого черепа (недеформируемая группа суставов)

import { Vector3, Quaternion, Matrix4 } from 'three';
import { Body25Index, PoseData, JointPosition } from '../../body25/body25-types';

// Суставы, входящие в группу черепа (жесткая группа)
const SKULL_JOINTS: Body25Index[] = [
  Body25Index.NOSE,
  Body25Index.LEFT_EYE,
  Body25Index.RIGHT_EYE,
  Body25Index.LEFT_EAR,
  Body25Index.RIGHT_EAR,
];

// Опорный сустав (нос) - точка, относительно которой происходит трансформация
const PIVOT_JOINT = Body25Index.NOSE;

export interface SkullTransform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export class SkullGroup {
  private joints: Map<Body25Index, Vector3> = new Map();
  private pivotPosition: Vector3 = new Vector3();
  private pivotRotation: Quaternion = new Quaternion();
  private relativePositions: Map<Body25Index, Vector3> = new Map();
  private isInitialized = false;

  /**
   * Инициализировать группу черепа из позы
   */
  initializeFromPose(pose: PoseData): void {
    // Очищаем предыдущее состояние
    this.joints.clear();
    this.relativePositions.clear();
    
    // Сохраняем позиции суставов
    for (const jointIndex of SKULL_JOINTS) {
      const jointPos = pose[jointIndex];
      if (jointPos) {
        const position = new Vector3(jointPos.x, jointPos.y, jointPos.z);
        this.joints.set(jointIndex, position);
      }
    }
    
    // Устанавливаем позицию опорного сустава
    const pivotPos = pose[PIVOT_JOINT];
    if (pivotPos) {
      this.pivotPosition.set(pivotPos.x, pivotPos.y, pivotPos.z);
    }
    
    // Вычисляем относительные позиции суставов относительно опорного
    this.computeRelativePositions();
    
    this.isInitialized = true;
  }

  /**
   * Вычислить относительные позиции суставов относительно опорного
   */
  private computeRelativePositions(): void {
    this.relativePositions.clear();
    
    for (const [jointIndex, position] of this.joints) {
      const relativePos = position.clone().sub(this.pivotPosition);
      this.relativePositions.set(jointIndex, relativePos);
    }
  }

  /**
   * Применить трансформацию к группе черепа
   */
  applyTransform(transform: Partial<SkullTransform>): Map<Body25Index, Vector3> {
    if (!this.isInitialized) {
      throw new Error('SkullGroup not initialized. Call initializeFromPose first.');
    }
    
    // Обновляем позицию опорного сустава
    if (transform.position) {
      this.pivotPosition.copy(transform.position);
    }
    
    // Обновляем вращение
    if (transform.rotation) {
      this.pivotRotation.copy(transform.rotation);
    }
    
    // Применяем трансформацию ко всем суставам
    const transformedJoints = new Map<Body25Index, Vector3>();
    
    for (const [jointIndex, relativePos] of this.relativePositions) {
      // Копируем относительную позицию
      const transformedPos = relativePos.clone();
      
      // Применяем вращение
      if (!this.pivotRotation.equals(new Quaternion())) {
        transformedPos.applyQuaternion(this.pivotRotation);
      }
      
      // Применяем масштаб (если указан)
      if (transform.scale) {
        transformedPos.multiply(transform.scale);
      }
      
      // Добавляем позицию опорного сустава
      transformedPos.add(this.pivotPosition);
      
      transformedJoints.set(jointIndex, transformedPos);
    }
    
    // Обновляем позиции суставов
    this.joints = transformedJoints;
    
    return transformedJoints;
  }

  /**
   * Получить текущие позиции суставов черепа
   */
  getJointPositions(): Map<Body25Index, Vector3> {
    return new Map(this.joints);
  }

  /**
   * Получить позицию опорного сустава
   */
  getPivotPosition(): Vector3 {
    return this.pivotPosition.clone();
  }

  /**
   * Получить вращение черепа
   */
  getRotation(): Quaternion {
    return this.pivotRotation.clone();
  }

  /**
   * Обновить позу с учетом позиций суставов черепа
   */
  updatePose(pose: PoseData): PoseData {
    const updatedPose = { ...pose };
    
    for (const [jointIndex, position] of this.joints) {
      updatedPose[jointIndex] = {
        x: position.x,
        y: position.y,
        z: position.z,
      };
    }
    
    return updatedPose;
  }

  /**
   * Проверить, инициализирована ли группа
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Сбросить состояние группы
   */
  reset(): void {
    this.joints.clear();
    this.relativePositions.clear();
    this.pivotPosition.set(0, 0, 0);
    this.pivotRotation.set(0, 0, 0, 1);
    this.isInitialized = false;
  }

  /**
   * Вычислить центр масс группы черепа
   */
  computeCenterOfMass(): Vector3 {
    if (this.joints.size === 0) {
      return new Vector3();
    }
    
    const center = new Vector3();
    for (const position of this.joints.values()) {
      center.add(position);
    }
    center.divideScalar(this.joints.size);
    
    return center;
  }

  /**
   * Проверить, является ли сустав частью группы черепа
   */
  static isSkullJoint(jointIndex: Body25Index): boolean {
    return SKULL_JOINTS.includes(jointIndex);
  }

  /**
   * Получить список суставов черепа
   */
  static getSkullJoints(): Body25Index[] {
    return [...SKULL_JOINTS];
  }
}