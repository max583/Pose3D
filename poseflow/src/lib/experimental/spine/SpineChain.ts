// src/lib/experimental/spine/SpineChain.ts
// Виртуальная цепь позвоночника и шеи с двунаправленным маппингом на BODY_25

import { Vector3, Quaternion } from 'three';
import { Body25Index, PoseData, JointPosition } from '../../body25/body25-types';

// Виртуальные сегменты позвоночника
export enum SpineSegment {
  PELVIS = 'pelvis',      // Таз
  SPINE_1 = 'spine_1',    // Поясница
  SPINE_2 = 'spine_2',    // Грудь
  NECK = 'neck',          // Шея
  HEAD = 'head',          // Голова
}

// Маппинг виртуальных сегментов на BODY_25 суставы
const SEGMENT_TO_JOINT: Record<SpineSegment, Body25Index[]> = {
  [SpineSegment.PELVIS]: [Body25Index.MID_HIP],
  [SpineSegment.SPINE_1]: [Body25Index.MID_HIP], // Используем MID_HIP для поясницы
  [SpineSegment.SPINE_2]: [Body25Index.NECK],    // Используем NECK для груди
  [SpineSegment.NECK]: [Body25Index.NECK],
  [SpineSegment.HEAD]: [Body25Index.NOSE, Body25Index.LEFT_EYE, Body25Index.RIGHT_EYE],
};

// Обратный маппинг: BODY_25 сустав → виртуальный сегмент
const JOINT_TO_SEGMENT: Map<Body25Index, SpineSegment> = (() => {
  const map = new Map<Body25Index, SpineSegment>();
  for (const [segment, joints] of Object.entries(SEGMENT_TO_JOINT)) {
    for (const joint of joints) {
      map.set(joint, segment as SpineSegment);
    }
  }
  return map;
})();

export interface SpineState {
  segments: Map<SpineSegment, Vector3>;
  rotations: Map<SpineSegment, Quaternion>;
  length: number;
  curvature: number; // 0 = прямой, 1 = максимальный изгиб
  twist: number;     // 0 = без скручивания, ±1 = максимальное скручивание
}

export class SpineChain {
  private state: SpineState;
  private isInitialized = false;

  constructor() {
    this.state = {
      segments: new Map(),
      rotations: new Map(),
      length: 0,
      curvature: 0,
      twist: 0,
    };
    
    // Инициализируем сегменты с позициями по умолчанию
    this.initializeDefaultPositions();
  }

  /**
   * Инициализировать цепь позвоночника из позы BODY_25
   */
  initializeFromPose(pose: PoseData): void {
    // Вычисляем позиции сегментов как среднее арифметическое соответствующих суставов
    for (const segment of Object.values(SpineSegment)) {
      const jointIndices = SEGMENT_TO_JOINT[segment];
      const validJoints: Vector3[] = [];
      
      for (const jointIndex of jointIndices) {
        const jointPos = pose[jointIndex];
        if (jointPos) {
          validJoints.push(new Vector3(jointPos.x, jointPos.y, jointPos.z));
        }
      }
      
      if (validJoints.length > 0) {
        // Вычисляем среднюю позицию
        const avgPosition = new Vector3();
        for (const pos of validJoints) {
          avgPosition.add(pos);
        }
        avgPosition.divideScalar(validJoints.length);
        
        this.state.segments.set(segment, avgPosition);
      }
    }
    
    // Вычисляем вращения сегментов
    this.computeSegmentRotations();
    
    // Вычисляем длину позвоночника
    this.computeLength();
    
    // Вычисляем кривизну и скручивание
    this.computeCurvatureAndTwist();
    
    this.isInitialized = true;
  }

  /**
   * Инициализировать позиции по умолчанию (T-поза)
   */
  private initializeDefaultPositions(): void {
    const defaultPositions: Record<SpineSegment, Vector3> = {
      [SpineSegment.PELVIS]: new Vector3(0, 1.0, 0),
      [SpineSegment.SPINE_1]: new Vector3(0, 1.2, 0),
      [SpineSegment.SPINE_2]: new Vector3(0, 1.4, 0),
      [SpineSegment.NECK]: new Vector3(0, 1.6, 0),
      [SpineSegment.HEAD]: new Vector3(0, 1.7, 0),
    };
    
    for (const [segment, position] of Object.entries(defaultPositions)) {
      this.state.segments.set(segment as SpineSegment, position.clone());
      this.state.rotations.set(segment as SpineSegment, new Quaternion());
    }
  }

  /**
   * Вычислить вращения сегментов на основе их позиций
   */
  private computeSegmentRotations(): void {
    const segments = Array.from(this.state.segments.entries())
      .sort(([a], [b]) => {
        // Сортируем сегменты снизу вверх
        const order = [SpineSegment.PELVIS, SpineSegment.SPINE_1, SpineSegment.SPINE_2, SpineSegment.NECK, SpineSegment.HEAD];
        return order.indexOf(a) - order.indexOf(b);
      });
    
    for (let i = 0; i < segments.length - 1; i++) {
      const [currentSegment, currentPos] = segments[i];
      const [nextSegment, nextPos] = segments[i + 1];
      
      // Направление от текущего сегмента к следующему
      const direction = nextPos.clone().sub(currentPos).normalize();
      
      // Создаем кватернион из направления
      const rotation = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0), // Направление по умолчанию (вверх)
        direction
      );
      
      this.state.rotations.set(currentSegment, rotation);
    }
    
    // Для последнего сегмента используем вращение предыдущего
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1][0];
      const prevSegment = segments[segments.length - 2]?.[0];
      if (prevSegment) {
        const prevRotation = this.state.rotations.get(prevSegment);
        if (prevRotation) {
          this.state.rotations.set(lastSegment, prevRotation.clone());
        }
      }
    }
  }

  /**
   * Вычислить длину позвоночника
   */
  private computeLength(): void {
    const segments = [
      SpineSegment.PELVIS,
      SpineSegment.SPINE_1,
      SpineSegment.SPINE_2,
      SpineSegment.NECK,
      SpineSegment.HEAD,
    ];
    
    let totalLength = 0;
    for (let i = 0; i < segments.length - 1; i++) {
      const currentPos = this.state.segments.get(segments[i]);
      const nextPos = this.state.segments.get(segments[i + 1]);
      
      if (currentPos && nextPos) {
        totalLength += currentPos.distanceTo(nextPos);
      }
    }
    
    this.state.length = totalLength;
  }

  /**
   * Вычислить кривизну и скручивание позвоночника
   */
  private computeCurvatureAndTwist(): void {
    // Упрощенный расчет кривизны: отклонение от прямой линии
    const startPos = this.state.segments.get(SpineSegment.PELVIS);
    const endPos = this.state.segments.get(SpineSegment.HEAD);
    
    if (!startPos || !endPos) {
      this.state.curvature = 0;
      this.state.twist = 0;
      return;
    }
    
    // Прямая линия от начала до конца
    const straightLine = endPos.clone().sub(startPos);
    const straightLength = straightLine.length();
    
    // Фактическая длина позвоночника
    const actualLength = this.state.length;
    
    // Кривизна: отношение фактической длины к длине прямой линии
    // 1.0 = прямая линия, >1.0 = изогнутая
    this.state.curvature = Math.max(0, (actualLength / straightLength) - 1);
    
    // Упрощенный расчет скручивания: разница в вращении между сегментами
    const pelvisRotation = this.state.rotations.get(SpineSegment.PELVIS);
    const headRotation = this.state.rotations.get(SpineSegment.HEAD);
    
    if (pelvisRotation && headRotation) {
      // Вычисляем угловую разницу
      const angle = 2 * Math.acos(Math.abs(pelvisRotation.dot(headRotation)));
      this.state.twist = angle / Math.PI; // Нормализуем к диапазону [0, 1]
    } else {
      this.state.twist = 0;
    }
  }

  /**
   * Получить текущее состояние позвоночника
   */
  getState(): SpineState {
    return {
      segments: new Map(this.state.segments),
      rotations: new Map(this.state.rotations),
      length: this.state.length,
      curvature: this.state.curvature,
      twist: this.state.twist,
    };
  }

  /**
   * Обновить позицию сегмента
   */
  updateSegmentPosition(segment: SpineSegment, position: Vector3): void {
    if (!this.isInitialized) {
      throw new Error('SpineChain not initialized. Call initializeFromPose first.');
    }
    
    this.state.segments.set(segment, position.clone());
    
    // Пересчитываем производные значения
    this.computeSegmentRotations();
    this.computeLength();
    this.computeCurvatureAndTwist();
  }

  /**
   * Обновить вращение сегмента
   */
  updateSegmentRotation(segment: SpineSegment, rotation: Quaternion): void {
    if (!this.isInitialized) {
      throw new Error('SpineChain not initialized. Call initializeFromPose first.');
    }
    
    this.state.rotations.set(segment, rotation.clone());
    
    // Обновляем позиции дочерних сегментов на основе вращения
    this.propagateRotationToChildren(segment);
    
    // Пересчитываем производные значения
    this.computeLength();
    this.computeCurvatureAndTwist();
  }

  /**
   * Распространить вращение на дочерние сегменты
   */
  private propagateRotationToChildren(parentSegment: SpineSegment): void {
    const segmentOrder = [
      SpineSegment.PELVIS,
      SpineSegment.SPINE_1,
      SpineSegment.SPINE_2,
      SpineSegment.NECK,
      SpineSegment.HEAD,
    ];
    
    const parentIndex = segmentOrder.indexOf(parentSegment);
    if (parentIndex === -1 || parentIndex >= segmentOrder.length - 1) {
      return;
    }
    
    const parentPos = this.state.segments.get(parentSegment);
    const parentRot = this.state.rotations.get(parentSegment);
    
    if (!parentPos || !parentRot) {
      return;
    }
    
    // Обновляем позиции дочерних сегментов
    for (let i = parentIndex + 1; i < segmentOrder.length; i++) {
      const childSegment = segmentOrder[i];
      const childPos = this.state.segments.get(childSegment);
      
      if (childPos) {
        // Вычисляем относительную позицию
        const relativePos = childPos.clone().sub(parentPos);
        
        // Применяем вращение родителя
        relativePos.applyQuaternion(parentRot);
        
        // Обновляем позицию дочернего сегмента
        const newPos = parentPos.clone().add(relativePos);
        this.state.segments.set(childSegment, newPos);
        
        // Обновляем вращение дочернего сегмента
        this.state.rotations.set(childSegment, parentRot.clone());
      }
    }
  }

  /**
   * Сгенерировать позу BODY_25 на основе состояния позвоночника
   */
  generatePose(): PoseData {
    // Создаем пустую позу со всеми индексами
    const pose: Partial<PoseData> = {};
    
    // Заполняем позу на основе позиций сегментов
    for (const [segment, position] of this.state.segments) {
      const jointIndices = SEGMENT_TO_JOINT[segment];
      
      for (const jointIndex of jointIndices) {
        pose[jointIndex] = {
          x: position.x,
          y: position.y,
          z: position.z,
        };
      }
    }
    
    // Возвращаем как PoseData (в реальном использовании нужно заполнить все индексы)
    return pose as PoseData;
  }

  /**
   * Получить виртуальный сегмент для BODY_25 сустава
   */
  static getSegmentForJoint(jointIndex: Body25Index): SpineSegment | null {
    return JOINT_TO_SEGMENT.get(jointIndex) || null;
  }

  /**
   * Получить BODY_25 суставы для виртуального сегмента
   */
  static getJointsForSegment(segment: SpineSegment): Body25Index[] {
    return SEGMENT_TO_JOINT[segment] || [];
  }

  /**
   * Проверить, инициализирована ли цепь
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Сбросить состояние цепи
   */
  reset(): void {
    this.state.segments.clear();
    this.state.rotations.clear();
    this.state.length = 0;
    this.state.curvature = 0;
    this.state.twist = 0;
    this.isInitialized = false;
    
    this.initializeDefaultPositions();
  }
}